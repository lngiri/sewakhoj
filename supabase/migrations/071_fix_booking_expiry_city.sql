-- Migration 071: Fix Booking Expiry City Column Error
-- Fixes the crashing background job where auto_reassign_expired_acceptances tries to query b.city from the bookings table.
-- It correctly joins the users table on customer_id to retrieve the customer's city (u.city) instead.

CREATE OR REPLACE FUNCTION public.auto_reassign_expired_acceptances()
RETURNS TABLE (
  booking_id UUID,
  old_tasker_id UUID,
  new_tasker_id UUID,
  outcome TEXT
) AS $$
DECLARE
  expired RECORD;
  v_new_tasker_id UUID;
  v_max_reassignments INTEGER := 3;
BEGIN
  FOR expired IN
    SELECT b.id, b.tasker_id, b.service, u.city, b.customer_id,
           b.reassignment_count, b.declined_by, b.original_tasker_id,
           b.booking_date, b.booking_time
    FROM public.bookings b
    LEFT JOIN public.users u ON b.customer_id = u.id
    WHERE b.status = 'pending_acceptance'
      AND b.acceptance_deadline IS NOT NULL
      AND b.acceptance_deadline < now()
      AND b.reassignment_count < v_max_reassignments
  LOOP
    -- Mark current tasker as timed out (declined)
    UPDATE public.bookings
    SET status = 'declined',
        declined_by = COALESCE(declined_by, ARRAY[]::UUID[]) || expired.tasker_id,
        reassignment_count = COALESCE(reassignment_count, 0) + 1,
        original_tasker_id = COALESCE(original_tasker_id, expired.tasker_id)
    WHERE id = expired.id;

    -- Update metrics: timeout for the tasker who didn't respond
    INSERT INTO public.tasker_acceptance_metrics (tasker_id, total_requests, timeout_count)
    VALUES (expired.tasker_id, 1, 1)
    ON CONFLICT (tasker_id)
    DO UPDATE SET
      total_requests = tasker_acceptance_metrics.total_requests + 1,
      timeout_count = tasker_acceptance_metrics.timeout_count + 1,
      last_updated = now();

    -- Find next available tasker (same service, same city, not declined, active)
    SELECT t.id INTO v_new_tasker_id
    FROM public.taskers t
    JOIN public.tasker_skills ts ON t.id = ts.tasker_id AND ts.service_id = expired.service
    WHERE t.status = 'active'
      AND t.id != expired.tasker_id
      AND t.id != ALL(COALESCE(expired.declined_by, ARRAY[]::UUID[]))
      AND (
        t.city ILIKE '%' || COALESCE(expired.city, '') || '%'
        OR t.service_areas ILIKE '%' || COALESCE(expired.city, '') || '%'
      )
    ORDER BY t.is_elite DESC, t.rating DESC, t.total_jobs DESC
    LIMIT 1;

    IF v_new_tasker_id IS NOT NULL THEN
      -- Reassign to new tasker with fresh 30-min deadline
      UPDATE public.bookings
      SET tasker_id = v_new_tasker_id,
          status = 'pending_acceptance',
          acceptance_deadline = now() + INTERVAL '30 minutes'
      WHERE id = expired.id;

      -- Notify customer about reassignment
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        expired.customer_id,
        'Finding You a Tasker 🔄',
        'Your previous tasker did not respond. We are assigning a new tasker for ' ||
        expired.service || ' on ' || expired.booking_date::TEXT || '.',
        'info',
        '/booking/' || expired.id || '/tracking'
      );

      -- Notify original tasker they missed it
      INSERT INTO public.notifications (user_id, title, message, type, link)
      SELECT t.user_id, 'Booking Reassigned ⏰',
             'You did not respond in time for a ' || expired.service || ' booking. It has been reassigned.',
             'alert', '/dashboard'
      FROM public.taskers t WHERE t.id = expired.tasker_id;

      booking_id := expired.id;
      old_tasker_id := expired.tasker_id;
      new_tasker_id := v_new_tasker_id;
      outcome := 'reassigned';
      RETURN NEXT;
    ELSE
      -- No alternative tasker found — cancel the booking
      UPDATE public.bookings
      SET status = 'cancelled'
      WHERE id = expired.id;

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        expired.customer_id,
        'No Taskers Available 😔',
        'Sorry, no taskers are currently available for ' || expired.service ||
        ' in your area. Please try again later or browse other services.',
        'alert',
        '/browse'
      );

      booking_id := expired.id;
      old_tasker_id := expired.tasker_id;
      new_tasker_id := NULL;
      outcome := 'cancelled_no_taskers';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

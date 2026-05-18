-- Migration 070: Auto Synchronization of KYC and User Details
-- Ensures that when KYC is updated, the Taskers and Users tables are perfectly kept in sync.
-- Also ensures that city/area details updated on either Users or Taskers are synchronized automatically.

-- 1. Create KYC and Profile Sync trigger
CREATE OR REPLACE FUNCTION public.sync_tasker_kyc_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update taskers table status and id_verified
  UPDATE public.taskers
  SET id_verified = (NEW.status = 'approved'),
      status = CASE 
        WHEN NEW.status = 'approved' THEN 'active'::text 
        WHEN NEW.status = 'rejected' THEN 'pending'::text
        ELSE status 
      END,
      documents = jsonb_build_object(
        'citizenship', NEW.document_front_url,
        'license', NEW.document_back_url
      ),
      updated_at = NOW()
  WHERE id = NEW.tasker_id;

  -- Update users table role and avatar
  UPDATE public.users
  SET avatar_url = COALESCE(NULLIF(NEW.selfie_url, ''), avatar_url),
      role = CASE WHEN NEW.status = 'approved' THEN 'tasker'::text ELSE role END,
      updated_at = NOW()
  WHERE id = (SELECT user_id FROM public.taskers WHERE id = NEW.tasker_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tasker_kyc_to_profile ON public.tasker_kyc;
CREATE TRIGGER trg_sync_tasker_kyc_to_profile
  AFTER INSERT OR UPDATE ON public.tasker_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tasker_kyc_to_profile();


-- 2. Create User to Tasker city/area details synchronization
CREATE OR REPLACE FUNCTION public.sync_user_to_tasker_details()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.city IS DISTINCT FROM OLD.city) OR (NEW.area IS DISTINCT FROM OLD.area) THEN
    UPDATE public.taskers
    SET city = NEW.city,
        area = NEW.area,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_to_tasker_details ON public.users;
CREATE TRIGGER trg_sync_user_to_tasker_details
  AFTER UPDATE OF city, area ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_tasker_details();


-- 3. Create Tasker to User city/area details synchronization
CREATE OR REPLACE FUNCTION public.sync_tasker_to_user_details()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.city IS DISTINCT FROM OLD.city) OR (NEW.area IS DISTINCT FROM OLD.area) THEN
    UPDATE public.users
    SET city = NEW.city,
        area = NEW.area,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_tasker_to_user_details ON public.taskers;
CREATE TRIGGER trg_sync_tasker_to_user_details
  AFTER INSERT OR UPDATE OF city, area ON public.taskers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tasker_to_user_details();

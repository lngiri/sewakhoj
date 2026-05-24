/**
 * Server-Side Booking Price Validation API
 *
 * Validates booking price before submission to prevent client-side price manipulation.
 * Computes the correct total from tasker pricing, addons, and promo codes.
 *
 * POST /api/bookings/validate
 * Body: { taskerId, skillId, hours, addonIds, promoCode }
 * Response: { valid: boolean, computedTotal: number, breakdown: {...} }
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskerId, skillId, hours = 2, addonIds = [], promoCode, paymentMethod, clientTotal } = body;

    if (!taskerId || !skillId) {
      return NextResponse.json(
        { valid: false, error: "Missing required fields: taskerId, skillId" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch tasker's hourly rate for this skill
    const { data: taskerSkill, error: skillError } = await supabase
      .from("tasker_skills")
      .select("hourly_rate, skill_level")
      .eq("tasker_id", taskerId)
      .eq("service_id", skillId)
      .single();

    // Fall back to tasker's default hourly rate if no per-service rate
    let hourlyRate: number;
    if (skillError || !taskerSkill?.hourly_rate) {
      const { data: tasker } = await supabase
        .from("taskers")
        .select("hourly_rate")
        .eq("id", taskerId)
        .single();

      if (!tasker?.hourly_rate) {
        return NextResponse.json(
          { valid: false, error: "Could not determine tasker hourly rate" },
          { status: 400 }
        );
      }
      hourlyRate = tasker.hourly_rate;
    } else {
      hourlyRate = taskerSkill.hourly_rate;
    }

    // 2. Calculate base total
    let computedTotal = hourlyRate * hours;

    // 3. Fetch addon prices from site_settings
    let addonTotal = 0;
    const addonBreakdown: { id: string; name: string; price: number }[] = [];

    if (addonIds.length > 0) {
      const { data: addonSettings } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", addonIds.map((id: string) => `addon_price_${id}`));

      if (addonSettings) {
        for (const setting of addonSettings) {
          const price = parseInt(setting.value, 10) || 0;
          addonTotal += price;
          addonBreakdown.push({
            id: setting.id.replace("addon_price_", ""),
            name: setting.id,
            price,
          });
        }
      }
    }

    computedTotal += addonTotal;

    if (paymentMethod !== 'cash') {
      computedTotal -= Math.floor(computedTotal * 0.05);
    }

    // 4. Apply promo code if provided
    let discountAmount = 0;
    let promoValid = true;
    let promoError: string | null = null;

    if (promoCode) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (!promo) {
        promoValid = false;
        promoError = "Invalid or expired promo code";
      } else if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        promoValid = false;
        promoError = "This promo code has expired";
      } else if (promo.current_uses >= promo.max_uses) {
        promoValid = false;
        promoError = "This promo code has reached its usage limit";
      } else {
        discountAmount = Math.round(computedTotal * (promo.discount_percent / 100));
        computedTotal -= discountAmount;
      }
    }

    // 5. Compare with client-submitted total (if provided)
    const tolerance = Math.max(1, Math.round(computedTotal * 0.01)); // 1% tolerance
    const priceMatches =
      clientTotal === undefined ||
      Math.abs(computedTotal - clientTotal) <= tolerance;

    return NextResponse.json({
      success: true,
      valid: priceMatches && promoValid,
      computedTotal,
      breakdown: {
        baseRate: hourlyRate,
        hours,
        baseTotal: hourlyRate * hours,
        addons: addonBreakdown,
        addonTotal,
        discountAmount,
        promoCode: promoCode || null,
        promoValid,
        promoError,
      },
      error: !priceMatches
        ? `Price mismatch. Expected: NPR ${computedTotal}, Received: NPR ${clientTotal}`
        : promoError || null,
    });
  } catch (error) {
    console.error("Booking validation error:", error);
    return NextResponse.json(
      { success: false, valid: false, error: "Internal validation error" },
      { status: 500 }
    );
  }
}

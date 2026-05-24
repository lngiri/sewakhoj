# Tasker UX Audit Remediation Plan

Based on the [Tasker Lifecycle Analysis](plans/tasker-lifecycle-analysis.md), this plan outlines the remediation steps for the identified UX/UI issues.

## P0 — Critical (Must Fix Before Production Launch)

1.  **Implement Tasker Payout/Disbursement:** Create payout collection UI (bank/eSewa) and admin payout batch processing.
2.  **Enable PostGIS Proximity Search:** Replace hardcoded city string filtering with PostGIS `search_taskers_nearby()` function in `src/app/browse/BrowseClient.tsx`.
3.  **Harden Booking Conflict Detection:** Implement database-level transaction locking for booking submission.
4.  **Enforce Phone Uniqueness:** Add `UNIQUE` constraint to `users.phone`.
5.  **Implement Server-Side Price Validation:** Recalculate price in API routes before booking insertion.

## P1 — High Priority (Significant Impact)

1.  **Fix Push Notifications:** Implement web-push library and wire up `send-push` edge function.
2.  **Ensure Ledger Immutability:** Implement trigger to prevent modification of commission ledger entries.
3.  **Implement Cash Commission Collection:** Create invoicing/collection workflow for cash payments.
4.  **Validate Booking Status Transitions:** Implement database-level state machine constraints for booking statuses.
5.  **Implement Re-engagement Automation:** Set up automated email/SMS flows for dormant users.
6.  **Compute and Display Trust Score:** Develop and implement algorithm to populate `trust_score`.
7.  **Standardize Admin Access Control:** Consolidate authorization checks to use `staff_roles` consistently.
8.  **Secure API Keys:** Migrate plain-text keys in `api_integrations` to Supabase Vault.
9.  **Make Chat Persistent:** Create a standalone chat history view accessible outside booking modal.
10. **Fix Referential Integrity for Skills:** Migrate `taskers.skills` array to a junction table.

## Implementation Strategy

- Create a new task/branch for each P0 issue.
- Group P1 issues by module (e.g., Payments, Communications, Admin).
- Update `site_settings` for any configurable thresholds.

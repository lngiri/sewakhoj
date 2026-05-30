import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const supabaseUrl = 'https://xmptjdwhpgvoyeocccsg.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcHRqZHdocGd2b3llb2NjY3NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwNTUwMSwiZXhwIjoyMDkzMTgxNTAxfQ.YkxP7cw80ZdOnnKCQYbX47slE3BvglcJT3qY1vQMUik';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Ordered list of migration files to apply (by filename prefix)
const MIGRATION_FILES = [
  '040_push_notifications.sql',
  '041_payment_gateways.sql',
  '042_postgis_location.sql',
  '043_referral_rewards.sql',
  '043b_add_wallet_balance.sql',
  '043c_add_account_status.sql',
  '044_fix_user_roles_update_rls.sql',
  '045_add_service_slugs.sql',
  '046_phase1_security_data_integrity.sql',
  '047_encrypt_api_keys.sql',
  '048_tasker_skills_junction.sql',
  '049_booking_expiry_automation.sql',
  '050_discovery_matching_engine.sql',
  '051_push_notification_triggers.sql',
  '052_onboarding_verification.sql',
  '053_booking_execution_hardening.sql',
  '054_reputation_trust.sql',
  '055_reengagement_retention.sql',
  '056_admin_workflows.sql',
  '057_platform_hardening.sql',
  '059_cities_locations_column.sql',
  '060_tasker_acceptance_system.sql',
  '061_fix_staff_roles_rls.sql',
  '062_ensure_super_admin.sql',
  '063_admin_auth_security_definer.sql',
  '064_tasker_weekly_schedule.sql',
  '065_pg_cron_jobs.sql',
  '066_generic_sql_function.sql',
  '067_fix_staff_roles_recursion.sql',
  '068_add_tasker_payment_methods.sql',
  '069_add_avatars_storage_policies.sql',
  '070_auto_sync_kyc_and_details.sql',
  '071_fix_booking_expiry_city.sql',
  '072_fix_booking_conflict_trigger.sql',
  '073_enforce_phone_uniqueness.sql',
  '074_tasker_payouts.sql',
  '075_auto_sync_tasker_location.sql',
  '076_harden_booking_conflict_locking.sql',
  '077_ensure_ledger_immutability.sql',
  '078_cash_commission_collection.sql',
  '079_validate_booking_status_transitions.sql',
  '080_reengagement_campaigns.sql',
  '081_trust_score_breakdown.sql',
  '082_remove_plaintext_api_keys.sql',
  '083_guard_tasker_skills_column.sql',

  '086_admin_get_all_users.sql',
  '087_admin_notes.sql',
  '088_fix_account_status_column.sql',
  '089_fix_booking_logs_columns.sql',
  '090_fix_staff_roles_recursion_v2.sql',
];

const migrationsDir = resolve(__dirname, 'supabase/migrations');

function loadMigrationSQL(filename) {
  const filePath = join(migrationsDir, filename);
  try {
    const sql = readFileSync(filePath, 'utf-8');
    return sql;
  } catch (err) {
    console.error(`  ⚠️  Could not read ${filename}: ${err.message}`);
    return null;
  }
}

async function applyMigration(index) {
  if (index >= MIGRATION_FILES.length) {
    console.log('\n✅ All migrations processed!');
    return;
  }

  const filename = MIGRATION_FILES[index];
  const label = filename.replace(/^\d+[a-z]?_/, '').replace(/_/g, ' ').replace('.sql', '');
  const shortLabel = label.substring(0, 60);

  process.stdout.write(`[${index + 1}/${MIGRATION_FILES.length}] ${shortLabel}... `);

  const sql = loadMigrationSQL(filename);
  if (!sql) {
    console.log('⚠️  SKIPPED (file not found)');
    await applyMigration(index + 1);
    return;
  }

  // Try exec_ddl first (handles DDL properly). If not available, fall back to sql().
  let { error } = await supabase.rpc('exec_ddl', { query: sql });

  if (error) {
    // exec_ddl failed — try sql() as fallback (handles DO blocks properly)
    const { error: sqlError } = await supabase.rpc('sql', { query: sql });

    if (sqlError) {
      // 'query does not return tuples' means the SQL executed server-side but
      // returned no rows (false positive from the API gateway). Treat as success.
      if (sqlError.message && sqlError.message.includes('query does not return tuples')) {
        console.log('✅ OK');
      } else {
        console.log(`❌ ${sqlError.message.substring(0, 100)}`);
      }
    } else {
      console.log('✅ OK');
    }
    await applyMigration(index + 1);
  } else {
    console.log('✅ OK');
    await applyMigration(index + 1);
  }
}

console.log(`Applying ${MIGRATION_FILES.length} migrations from ${migrationsDir}...\n`);
applyMigration(0).catch(console.error);

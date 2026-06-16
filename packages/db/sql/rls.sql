-- ══════════════════════════════════════════════════════════════════════════
-- Riaya — Row Level Security Policies
-- Applied after migrations via a post-migration hook (db:migrate).
-- All tables enforce RLS. Policies read app.current_user / app.current_role
-- set by withUserContext() in every server action.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Helpers ───────────────────────────────────────────────────────────────

-- Current app user UUID (set by withUserContext)
CREATE OR REPLACE FUNCTION app_user() RETURNS uuid AS $$
  SELECT nullif(current_setting('app.current_user', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Current app role (set by withUserContext)
CREATE OR REPLACE FUNCTION app_role() RETURNS text AS $$
  SELECT nullif(current_setting('app.current_role', true), '');
$$ LANGUAGE sql STABLE;

-- Is current user an admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT app_role() = 'admin';
$$ LANGUAGE sql STABLE;

-- ── users ─────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Users can read their own row; admins read all
CREATE POLICY users_select ON users FOR SELECT
  USING (id = app_user() OR is_admin());

-- Users can update their own row; admins update all
CREATE POLICY users_update ON users FOR UPDATE
  USING (id = app_user() OR is_admin());

-- Signup inserts a user before any user context exists. Permit family/caregiver/
-- employer self-signup; admin rows only via admin context (seed/DB). Auth runs on
-- the privileged connection, so this is defense-in-depth for the app role too.
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (role <> 'admin' OR is_admin());

-- ── caregiver_profiles ────────────────────────────────────────────────────
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles FORCE ROW LEVEL SECURITY;

-- Public read (caregiver discovery is publicly accessible — SEO)
CREATE POLICY caregiver_read ON caregiver_profiles FOR SELECT
  USING (true);

-- Write: owner or admin
CREATE POLICY caregiver_write ON caregiver_profiles FOR INSERT
  WITH CHECK (user_id = app_user() OR is_admin());

CREATE POLICY caregiver_update ON caregiver_profiles FOR UPDATE
  USING (user_id = app_user() OR is_admin());

CREATE POLICY caregiver_delete ON caregiver_profiles FOR DELETE
  USING (is_admin());

-- ── verification_documents ── STRICT (Category A PII — Law 09-08) ─────────
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents FORCE ROW LEVEL SECURITY;

-- ONLY caregiver owner + admin. No exceptions. No public access.
CREATE POLICY docs_select ON verification_documents FOR SELECT
  USING (
    caregiver_id IN (
      SELECT id FROM caregiver_profiles WHERE user_id = app_user()
    )
    OR is_admin()
  );

CREATE POLICY docs_insert ON verification_documents FOR INSERT
  WITH CHECK (
    caregiver_id IN (
      SELECT id FROM caregiver_profiles WHERE user_id = app_user()
    )
  );

CREATE POLICY docs_update ON verification_documents FOR UPDATE
  USING (is_admin());

CREATE POLICY docs_delete ON verification_documents FOR DELETE
  USING (is_admin());

-- ── family_profiles ── STRICT (children data is most sensitive) ───────────
ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY family_select ON family_profiles FOR SELECT
  USING (user_id = app_user() OR is_admin());

CREATE POLICY family_insert ON family_profiles FOR INSERT
  WITH CHECK (user_id = app_user());

CREATE POLICY family_update ON family_profiles FOR UPDATE
  USING (user_id = app_user() OR is_admin());

CREATE POLICY family_delete ON family_profiles FOR DELETE
  USING (is_admin());

-- ── employer_accounts ─────────────────────────────────────────────────────
ALTER TABLE employer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_accounts FORCE ROW LEVEL SECURITY;

CREATE POLICY employer_select ON employer_accounts FOR SELECT
  USING (user_id = app_user() OR is_admin());

CREATE POLICY employer_insert ON employer_accounts FOR INSERT
  WITH CHECK (user_id = app_user());

CREATE POLICY employer_update ON employer_accounts FOR UPDATE
  USING (user_id = app_user() OR is_admin());

-- ── enrolled_employees ────────────────────────────────────────────────────
ALTER TABLE enrolled_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrolled_employees FORCE ROW LEVEL SECURITY;

CREATE POLICY enrolled_select ON enrolled_employees FOR SELECT
  USING (
    employer_account_id IN (
      SELECT id FROM employer_accounts WHERE user_id = app_user()
    )
    OR user_id = app_user()
    OR is_admin()
  );

CREATE POLICY enrolled_write ON enrolled_employees FOR INSERT
  WITH CHECK (
    employer_account_id IN (
      SELECT id FROM employer_accounts WHERE user_id = app_user()
    )
    OR is_admin()
  );

-- ── bookings ──────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

-- Visible to booking parties (family + caregiver) and employer (for their employees) + admin
CREATE POLICY booking_select ON bookings FOR SELECT
  USING (
    family_id IN (SELECT id FROM family_profiles WHERE user_id = app_user())
    OR caregiver_id IN (SELECT id FROM caregiver_profiles WHERE user_id = app_user())
    OR employer_account_id IN (SELECT id FROM employer_accounts WHERE user_id = app_user())
    OR is_admin()
  );

CREATE POLICY booking_insert ON bookings FOR INSERT
  WITH CHECK (
    family_id IN (SELECT id FROM family_profiles WHERE user_id = app_user())
    OR is_admin()
  );

CREATE POLICY booking_update ON bookings FOR UPDATE
  USING (
    family_id IN (SELECT id FROM family_profiles WHERE user_id = app_user())
    OR caregiver_id IN (SELECT id FROM caregiver_profiles WHERE user_id = app_user())
    OR is_admin()
  );

-- ── escrows ── STRICT (financial data — audit-logged on every mutation) ───
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows FORCE ROW LEVEL SECURITY;

CREATE POLICY escrow_select ON escrows FOR SELECT
  USING (
    family_id IN (SELECT id FROM family_profiles WHERE user_id = app_user())
    OR caregiver_id IN (SELECT id FROM caregiver_profiles WHERE user_id = app_user())
    OR is_admin()
  );

-- Escrow rows only created by system (server action with admin context)
CREATE POLICY escrow_insert ON escrows FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY escrow_update ON escrows FOR UPDATE
  USING (is_admin());

-- ── employer_invoices ── owning employer reads; system writes ─────────────
ALTER TABLE employer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY employer_invoice_select ON employer_invoices FOR SELECT
  USING (
    employer_account_id IN (SELECT id FROM employer_accounts WHERE user_id = app_user())
    OR is_admin()
  );

-- Invoices are generated by the monthly sweep (system/admin context) only.
CREATE POLICY employer_invoice_insert ON employer_invoices FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY employer_invoice_update ON employer_invoices FOR UPDATE
  USING (is_admin());

-- ── reviews ───────────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;

-- Reviews are public (trust signal on caregiver profiles)
CREATE POLICY reviews_read ON reviews FOR SELECT
  USING (true);

CREATE POLICY reviews_write ON reviews FOR INSERT
  WITH CHECK (reviewer_id = app_user());

-- ── audit_logs ── append-only, admin read ────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ── access_audit_logs ── append-only, admin read ─────────────────────────
ALTER TABLE access_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY access_audit_read ON access_audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY access_audit_insert ON access_audit_logs FOR INSERT
  WITH CHECK (true);

-- ── notifications ── recipient + admin only ───────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Recipient reads their own inbox; admins read all
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = app_user() OR is_admin());

-- System creates notifications (server action under user/admin context);
-- a notification can only be addressed to its recipient unless admin.
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (user_id = app_user() OR is_admin());

-- Recipient marks own notifications read; admins may update any
CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (user_id = app_user() OR is_admin());

CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (user_id = app_user() OR is_admin());

-- ── availability_slots ────────────────────────────────────────────────────
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots FORCE ROW LEVEL SECURITY;

-- Slots are public (needed for booking search)
CREATE POLICY slots_read ON availability_slots FOR SELECT
  USING (true);

CREATE POLICY slots_write ON availability_slots FOR INSERT
  WITH CHECK (
    caregiver_id IN (
      SELECT id FROM caregiver_profiles WHERE user_id = app_user()
    )
    OR is_admin()
  );

CREATE POLICY slots_update ON availability_slots FOR UPDATE
  USING (
    caregiver_id IN (
      SELECT id FROM caregiver_profiles WHERE user_id = app_user()
    )
    OR is_admin()
  );

CREATE POLICY slots_delete ON availability_slots FOR DELETE
  USING (
    caregiver_id IN (
      SELECT id FROM caregiver_profiles WHERE user_id = app_user()
    )
    OR is_admin()
  );

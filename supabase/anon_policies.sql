-- ============================================================
-- FTTH Dashboard — Supabase Anon Access Policies
-- ວາງຂໍ້ມູນ SQL ນີ້ໃນ Supabase SQL Editor ແລ້ວກົດ Run
-- ============================================================
-- ໝາຍເຫດ: App ໃຊ້ anon key (ຝັ່ງ client-side) ໂດຍ Supabase Auth
-- ປ້ອງກັນດ້ວຍ RLS ຄຽງຄູ່ກັບ app-level login.
-- ============================================================

-- ── customers ────────────────────────────────────────────────
CREATE POLICY "Anon full access customers"
  ON customers FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── packages ─────────────────────────────────────────────────
CREATE POLICY "Anon full access packages"
  ON packages FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── tickets ──────────────────────────────────────────────────
CREATE POLICY "Anon full access tickets"
  ON tickets FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── staff ────────────────────────────────────────────────────
CREATE POLICY "Anon full access staff"
  ON staff FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── settings (enable RLS first, then allow anon) ─────────────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon full access settings"
  ON settings FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── Grant SELECT on views to anon role ───────────────────────
GRANT SELECT ON v_dashboard_summary    TO anon;
GRANT SELECT ON v_customers_by_package TO anon;
GRANT SELECT ON v_expiring_soon        TO anon;

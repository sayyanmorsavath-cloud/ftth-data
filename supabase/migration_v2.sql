-- ============================================================
-- FTTH Dashboard — Migration v2
-- ຕາຕະລາງໃໝ່: payments, audit_logs, technician_visits
-- ວາງ SQL ນີ້ໃນ Supabase SQL Editor ແລ້ວກົດ RUN
-- ============================================================

-- ── 1. PAYMENTS ────────────────────────────────────────────────
-- ບັນທຶກການຊຳລະເງິນທຸກຄັ້ງທີ່ຕໍ່ສັນຍາ
CREATE TABLE IF NOT EXISTS payments (
  id              BIGSERIAL     PRIMARY KEY,
  customer_id     BIGINT        REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   TEXT          NOT NULL DEFAULT '',
  customer_account_id TEXT,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_months     INTEGER       NOT NULL DEFAULT 1,
  bonus_months    INTEGER       NOT NULL DEFAULT 0,
  payment_method  TEXT          NOT NULL DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','transfer','other')),
  start_date      DATE,
  expiry_date     DATE,
  notes           TEXT,
  recorded_by     TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at  ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access payments" ON payments;
CREATE POLICY "Anon full access payments"
  ON payments FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 2. AUDIT_LOGS ──────────────────────────────────────────────
-- ບັນທຶກທຸກ action ສຳຄັນ: ສ້າງ, ແກ້ໄຂ, ລຶບ, ຕໍ່ສັນຍາ, login
CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGSERIAL   PRIMARY KEY,
  action        TEXT        NOT NULL,
  entity_type   TEXT        NOT NULL DEFAULT 'customer',
  entity_id     BIGINT,
  entity_name   TEXT,
  details       JSONB,
  performed_by  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by  ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type   ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access audit_logs" ON audit_logs;
CREATE POLICY "Anon full access audit_logs"
  ON audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 3. TECHNICIAN_VISITS ───────────────────────────────────────
-- ການນັດໝາຍ/ສ່ົງຊ່າງລົງພາກສະໜາມ
CREATE TABLE IF NOT EXISTS technician_visits (
  id               BIGSERIAL   PRIMARY KEY,
  ticket_id        BIGINT      REFERENCES tickets(id) ON DELETE SET NULL,
  customer_id      BIGINT      REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    TEXT        NOT NULL DEFAULT '',
  customer_address TEXT,
  customer_phone   TEXT,
  customer_account_id TEXT,
  technician       TEXT        NOT NULL,
  problem_type     TEXT        NOT NULL DEFAULT 'general',
  scheduled_date   DATE,
  scheduled_time   TEXT,
  completed_at     TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed','cancelled')),
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tech_visits_status      ON technician_visits(status);
CREATE INDEX IF NOT EXISTS idx_tech_visits_technician  ON technician_visits(technician);
CREATE INDEX IF NOT EXISTS idx_tech_visits_created_at  ON technician_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tech_visits_customer_id ON technician_visits(customer_id);

DROP TRIGGER IF EXISTS trg_tech_visits_updated_at ON technician_visits;
CREATE TRIGGER trg_tech_visits_updated_at
  BEFORE UPDATE ON technician_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE technician_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access technician_visits" ON technician_visits;
CREATE POLICY "Anon full access technician_visits"
  ON technician_visits FOR ALL TO anon USING (true) WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════
-- ✅ Migration v2 ສຳເລັດ
-- ══════════════════════════════════════════════════════════════

-- ============================================================
-- FTTH Dashboard — Complete Database Setup Script
-- ວາງ SQL ນີ້ທັງໝົດໃນ Supabase SQL Editor ແລ້ວກົດ RUN
-- ============================================================
-- ໝາຍເຫດ:
--   Admin login ໃຊ້ username "s14y2" + OTP ທາງ Telegram
--   (ບໍ່ຕ້ອງມີ row ໃນ staff table ສຳລັບ admin)
--   Staff ທົ່ວໄປ login ດ້ວຍ username + password ໃນ staff table
-- ============================================================

-- ── 1. EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. TABLES ─────────────────────────────────────────────────

-- ---- packages (ສ້າງກ່ອນ customers ເພາະ customers FK) ----------
CREATE TABLE IF NOT EXISTS packages (
  id          BIGSERIAL     PRIMARY KEY,
  name        TEXT          NOT NULL,
  speed       TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---- customers ------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                BIGSERIAL   PRIMARY KEY,
  account_id        TEXT        UNIQUE,
  name              TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  address           TEXT,
  city              TEXT,
  customer_type     TEXT        NOT NULL DEFAULT 'IN',
  vip               BOOLEAN     NOT NULL DEFAULT FALSE,
  package_id        BIGINT      REFERENCES packages(id) ON DELETE SET NULL,
  speed             TEXT,
  status            TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','suspended','expired')),
  installation_date DATE,
  start_date        DATE,
  expiry_date       DATE        NOT NULL,
  bonus_month_used  BOOLEAN     NOT NULL DEFAULT FALSE,
  follow_up_status  TEXT,
  follow_up_person  TEXT,
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- tickets --------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id                  BIGSERIAL   PRIMARY KEY,
  ticket_number       TEXT        UNIQUE NOT NULL,
  customer_id         BIGINT      REFERENCES customers(id) ON DELETE SET NULL,
  customer_name       TEXT        NOT NULL,
  customer_phone      TEXT,
  customer_account_id TEXT,
  customer_address    TEXT,
  customer_speed      TEXT,
  customer_status     TEXT,
  customer_expiry     DATE,
  category            TEXT        NOT NULL DEFAULT 'general',
  priority            TEXT        NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','high','urgent')),
  description         TEXT        NOT NULL,
  contact_method      TEXT,
  reported_at         TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  status              TEXT        NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','resolved','closed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- staff ----------------------------------------------------
-- (ໃຊ້ສຳລັບ Staff ທົ່ວໄປ — Admin "s14y2" ໃຊ້ OTP ບໍ່ຕ້ອງ insert ຢູ່ນີ້)
CREATE TABLE IF NOT EXISTS staff (
  id            BIGSERIAL   PRIMARY KEY,
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('admin','staff')),
  display_name  TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- import_batches -------------------------------------------
-- ໂຟລເດີ import ລູກຄ້າ ແລະ ticket (ຍ້າຍຈາກ localStorage ມາ Supabase)
CREATE TABLE IF NOT EXISTS import_batches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL DEFAULT 'customer',
  name        TEXT        NOT NULL,
  file_name   TEXT        NOT NULL DEFAULT '',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count       INTEGER     NOT NULL DEFAULT 0,
  item_ids    JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- settings -------------------------------------------------
-- ໃຊ້ເກັບ admin_password ແລະ announcements (JSON)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. DEFAULT SETTINGS (ບໍ່ມີ staff default — ໃຊ້ຂໍ້ມູນເກົ່າ) ──

-- admin_password ເຂົ້າສູ່ລະບົບໜ້າ admin settings
-- ປ່ຽນ 'admin1234' ເປັນລະຫັດທີ່ທ່ານໃຊ້ຢູ່ກ່ອນໄດ້ເລີຍ
INSERT INTO settings (key, value)
VALUES ('admin_password', 'admin1234')
ON CONFLICT (key) DO NOTHING;

-- announcements ເລີ່ມຕົ້ນຫວ່າງ (JSON array)
INSERT INTO settings (key, value)
VALUES ('announcements', '[]')
ON CONFLICT (key) DO NOTHING;

-- ── 4. TRIGGER: auto-update updated_at ────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_packages_updated_at ON packages;
CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. VIEWS ──────────────────────────────────────────────────

-- v_dashboard_summary (ໃຊ້ໃນໜ້າ Dashboard)
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  COUNT(*)                                                           AS total_customers,
  COUNT(*) FILTER (WHERE status = 'active')                         AS active_customers,
  COUNT(*) FILTER (WHERE status = 'inactive')                       AS inactive_customers,
  COUNT(*) FILTER (WHERE status = 'suspended')                      AS suspended_customers,
  COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE)                AS expired_customers,
  COUNT(*) FILTER (WHERE vip = TRUE)                                AS vip_customers,
  COUNT(*) FILTER (
    WHERE expiry_date >= CURRENT_DATE
      AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
  )                                                                 AS expiring_soon,
  COUNT(*) FILTER (WHERE follow_up_status = 'ຕ້ອງຕິດຕາມ')          AS follow_need_action,
  COUNT(*) FILTER (WHERE follow_up_status = 'ກຳລັງຕິດຕາມ')         AS follow_in_progress,
  COUNT(*) FILTER (WHERE follow_up_status = 'ຕິດຕາມແລ້ວ')          AS follow_done,
  COUNT(*) FILTER (WHERE follow_up_status = 'ສຳເລັດ')               AS follow_completed
FROM customers;

-- v_customers_by_package (ໃຊ້ໃນ Dashboard chart ແພັກເກດ)
CREATE OR REPLACE VIEW v_customers_by_package AS
SELECT
  p.id                               AS package_id,
  p.name                             AS package_name,
  p.speed,
  p.price,
  COUNT(c.id)                        AS customer_count,
  COALESCE(p.price * COUNT(c.id), 0) AS revenue
FROM packages p
LEFT JOIN customers c ON c.package_id = p.id
GROUP BY p.id, p.name, p.speed, p.price
ORDER BY customer_count DESC;

-- v_expiring_soon (ລູກຄ້າໃກ້ໝົດອາຍຸ 7 ວັນ)
CREATE OR REPLACE VIEW v_expiring_soon AS
SELECT *
FROM customers
WHERE expiry_date >= CURRENT_DATE
  AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY expiry_date ASC;

-- ── 6. ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon full access customers" ON customers;
DROP POLICY IF EXISTS "Anon full access packages"  ON packages;
DROP POLICY IF EXISTS "Anon full access tickets"   ON tickets;
DROP POLICY IF EXISTS "Anon full access staff"     ON staff;
DROP POLICY IF EXISTS "Anon full access settings"  ON settings;

CREATE POLICY "Anon full access customers"
  ON customers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access packages"
  ON packages  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access tickets"
  ON tickets   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access staff"
  ON staff     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access settings"
  ON settings  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 7. GRANT VIEW ACCESS TO ANON ──────────────────────────────

GRANT SELECT ON v_dashboard_summary    TO anon;
GRANT SELECT ON v_customers_by_package TO anon;
GRANT SELECT ON v_expiring_soon        TO anon;

-- ── 8. INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customers_status        ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_expiry_date   ON customers(expiry_date);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_vip           ON customers(vip);
CREATE INDEX IF NOT EXISTS idx_customers_package_id    ON customers(package_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at    ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status          ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id     ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at      ON tickets(created_at DESC);

-- ══════════════════════════════════════════════════════════════
-- ✅ ສຳເລັດ — ຫຼັງ Run ສຳເລັດ:
--    Admin login: ໃສ່ username "S14Y2" → ຂໍ OTP ທາງ Telegram
--    Staff login:  ເພີ່ມ staff ໃນໜ້າ Staff Management ຂອງ app
-- ══════════════════════════════════════════════════════════════

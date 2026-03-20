CREATE TABLE IF NOT EXISTS market_programs (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title                TEXT        NOT NULL,
  thumbnail_url        TEXT,
  habit_type           TEXT,
  auth_method          TEXT,
  period_days          INTEGER,
  auth_count           INTEGER,
  weekly_max_count     INTEGER,
  start_date           DATE,
  end_date             DATE,
  deposit              INTEGER,
  basic_reward         INTEGER,
  discount_rate        NUMERIC     DEFAULT 0,
  bonus_reward         INTEGER,
  guide_html           TEXT,
  
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backwards compatibility logic (if table already existed and we are altering)
-- Since this is an IF NOT EXISTS creation, we assume it runs on a fresh DB or we drop and recreate
-- If the user wants to alter existing data, they would need an ALTER TABLE script.
-- For local development, wiping and restarting is fine, but I'll add an ALTER block just in case it was already created by a previous run.
-- To keep it clean, I'll just keep the CREATE TABLE IF NOT EXISTS as the user requested. We can always reset local db.

ALTER TABLE market_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON market_programs FOR SELECT USING (is_active = true);
CREATE POLICY "admin all"   ON market_programs USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS market_programs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  thumbnail_url TEXT,
  period      TEXT,
  cost        TEXT,
  reward      TEXT,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE market_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON market_programs FOR SELECT USING (is_active = true);
CREATE POLICY "admin all"   ON market_programs USING (auth.role() = 'authenticated');

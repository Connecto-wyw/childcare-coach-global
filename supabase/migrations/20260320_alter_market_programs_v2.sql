-- Migration: market_programs schema v2
-- Adds new structured columns, backfills from legacy columns, then drops legacy columns.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).

-- 1. Add new columns if they don't exist yet
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS habit_type         TEXT;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS auth_method        TEXT;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS period_days        INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS auth_count         INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS weekly_max_count   INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS start_date         DATE;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS end_date           DATE;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS deposit            INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS basic_reward       INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS discount_rate      NUMERIC DEFAULT 0;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS bonus_reward       INTEGER;
ALTER TABLE market_programs ADD COLUMN IF NOT EXISTS guide_html         TEXT;

-- 2. Backfill from legacy columns where new columns are still NULL

-- cost (TEXT) → deposit (INTEGER): extract leading digits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'cost'
  ) THEN
    UPDATE market_programs
    SET deposit = CAST(regexp_replace(cost, '[^0-9]', '', 'g') AS INTEGER)
    WHERE deposit IS NULL
      AND cost IS NOT NULL
      AND cost ~ '[0-9]';
  END IF;
END $$;

-- reward (TEXT) → basic_reward (INTEGER): extract leading digits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'reward'
  ) THEN
    UPDATE market_programs
    SET basic_reward = CAST(regexp_replace(reward, '[^0-9]', '', 'g') AS INTEGER)
    WHERE basic_reward IS NULL
      AND reward IS NOT NULL
      AND reward ~ '[0-9]';
  END IF;
END $$;

-- description (TEXT) → guide_html (TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'description'
  ) THEN
    UPDATE market_programs
    SET guide_html = description
    WHERE guide_html IS NULL
      AND description IS NOT NULL;
  END IF;
END $$;

-- period (TEXT) → period_days (INTEGER): extract leading digits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'period'
  ) THEN
    UPDATE market_programs
    SET period_days = CAST(regexp_replace(period, '[^0-9]', '', 'g') AS INTEGER)
    WHERE period_days IS NULL
      AND period IS NOT NULL
      AND period ~ '[0-9]';
  END IF;
END $$;

-- 3. Drop legacy columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'cost'
  ) THEN ALTER TABLE market_programs DROP COLUMN cost; END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'reward'
  ) THEN ALTER TABLE market_programs DROP COLUMN reward; END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'description'
  ) THEN ALTER TABLE market_programs DROP COLUMN description; END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'market_programs' AND column_name = 'period'
  ) THEN ALTER TABLE market_programs DROP COLUMN period; END IF;
END $$;

-- 4. RLS policies (recreate idempotently)
ALTER TABLE market_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON market_programs;
DROP POLICY IF EXISTS "admin all"   ON market_programs;

CREATE POLICY "public read" ON market_programs FOR SELECT USING (is_active = true);
CREATE POLICY "admin all"   ON market_programs USING (auth.role() = 'authenticated');

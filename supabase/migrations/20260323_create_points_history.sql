-- points_history: 포인트 적립/사용 내역
CREATE TABLE IF NOT EXISTS points_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('earn', 'use')),
  amount      INTEGER     NOT NULL CHECK (amount > 0),
  reason      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_history_user_id_idx ON points_history (user_id, created_at DESC);

ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history"
  ON points_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert history"
  ON points_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

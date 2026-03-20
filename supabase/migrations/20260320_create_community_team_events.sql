-- ============================================================
-- community_team_events: 팀 이벤트 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS community_team_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES community_teams(id) ON DELETE CASCADE,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  purpose     TEXT,
  fee         TEXT,
  event_date  DATE        NOT NULL,
  event_time  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_team_events ENABLE ROW LEVEL SECURITY;

-- 공개 팀 이벤트는 누구나 조회, 비공개 팀은 오너/멤버만
CREATE POLICY "Team events readable by members"
  ON community_team_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_teams
      WHERE id = team_id AND visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM community_teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM community_team_members
      WHERE team_id = community_team_events.team_id AND user_id = auth.uid()
    )
  );

-- 팀 오너 또는 멤버만 이벤트 생성 가능
CREATE POLICY "Team members can create events"
  ON community_team_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM community_teams WHERE id = team_id AND owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM community_team_members
        WHERE team_id = community_team_events.team_id AND user_id = auth.uid()
      )
    )
  );

-- 이벤트 생성자만 삭제 가능
CREATE POLICY "Creator can delete events"
  ON community_team_events FOR DELETE
  USING (auth.uid() = created_by);

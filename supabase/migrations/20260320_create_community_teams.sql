-- ============================================================
-- community_teams: 새 TEAM 기능 (MARKET의 teams 테이블과 별개)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_teams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  visibility     TEXT        NOT NULL DEFAULT 'public'
                               CHECK (visibility IN ('public', 'private')),
  team_size      TEXT        NOT NULL DEFAULT 'small'
                               CHECK (team_size IN ('small', 'medium', 'large')),
  join_approval  TEXT        NOT NULL DEFAULT 'auto'
                               CHECK (join_approval IN ('approval', 'auto')),
  purposes       TEXT[]      NOT NULL DEFAULT '{}',
  child_gender   TEXT,
  child_age      TEXT,
  parent_age     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE community_teams ENABLE ROW LEVEL SECURITY;

-- 공개 팀은 누구나 조회, 비공개 팀은 멤버만 조회
CREATE POLICY "Public teams are readable by anyone"
  ON community_teams FOR SELECT
  USING (
    visibility = 'public'
    OR owner_id = auth.uid()
  );

-- 로그인 유저만 팀 생성 가능 (owner_id = 본인)
CREATE POLICY "Authenticated users can create teams"
  ON community_teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 팀장(owner)만 수정 가능
CREATE POLICY "Owner can update their team"
  ON community_teams FOR UPDATE
  USING (auth.uid() = owner_id);

-- 팀장(owner)만 삭제 가능
CREATE POLICY "Owner can delete their team"
  ON community_teams FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- community_team_members: 팀 멤버 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS community_team_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES community_teams(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE community_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their memberships"
  ON community_team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can join teams"
  ON community_team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams"
  ON community_team_members FOR DELETE
  USING (auth.uid() = user_id);

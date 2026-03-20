-- ============================================================
-- community_team_posts: 게시판
-- ============================================================
CREATE TABLE IF NOT EXISTS community_team_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID        NOT NULL REFERENCES community_teams(id) ON DELETE CASCADE,
  author_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name   TEXT        NOT NULL DEFAULT '',
  author_avatar TEXT,
  title         TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  is_notice     BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_team_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team posts readable by anyone for public teams"
  ON community_team_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND visibility = 'public')
    OR EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM community_team_members WHERE team_id = community_team_posts.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Team members can create posts"
  ON community_team_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM community_team_members WHERE team_id = community_team_posts.team_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Authors can delete their posts"
  ON community_team_posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- community_team_post_likes: 좋아요
-- ============================================================
CREATE TABLE IF NOT EXISTS community_team_post_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES community_team_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE community_team_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes readable by anyone"
  ON community_team_post_likes FOR SELECT USING (true);

CREATE POLICY "Users can like posts"
  ON community_team_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON community_team_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- community_team_post_comments: 댓글
-- ============================================================
CREATE TABLE IF NOT EXISTS community_team_post_comments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID        NOT NULL REFERENCES community_team_posts(id) ON DELETE CASCADE,
  author_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name   TEXT        NOT NULL DEFAULT '',
  author_avatar TEXT,
  content       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_team_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments readable by anyone"
  ON community_team_post_comments FOR SELECT USING (true);

CREATE POLICY "Team members can comment"
  ON community_team_post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND (
      EXISTS (SELECT 1 FROM community_team_posts p
              JOIN community_teams t ON t.id = p.team_id
              WHERE p.id = post_id AND t.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM community_team_posts p
                 JOIN community_team_members m ON m.team_id = p.team_id
                 WHERE p.id = post_id AND m.user_id = auth.uid())
    )
  );

CREATE POLICY "Authors can delete their comments"
  ON community_team_post_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- community_team_messages: 채팅
-- ============================================================
CREATE TABLE IF NOT EXISTS community_team_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID        NOT NULL REFERENCES community_teams(id) ON DELETE CASCADE,
  sender_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name   TEXT        NOT NULL DEFAULT '',
  sender_avatar TEXT,
  content       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team messages readable by members"
  ON community_team_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND visibility = 'public')
    OR EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM community_team_members WHERE team_id = community_team_messages.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Team members can send messages"
  ON community_team_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM community_teams WHERE id = team_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM community_team_members WHERE team_id = community_team_messages.team_id AND user_id = auth.uid())
    )
  );

-- 실시간 구독을 위해 publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE community_team_messages;

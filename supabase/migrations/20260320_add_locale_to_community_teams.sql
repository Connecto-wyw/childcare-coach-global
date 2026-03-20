-- community_teams 테이블에 locale 컬럼 추가
ALTER TABLE community_teams
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

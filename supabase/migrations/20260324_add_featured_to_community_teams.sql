-- Add is_featured column to community_teams (new TEAM table)
ALTER TABLE community_teams ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

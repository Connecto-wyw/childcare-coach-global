-- Add is_featured column to teams table for "This Week's Featured Teams"
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

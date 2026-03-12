-- supabase_auto_translate_migration.sql
-- Run this in your Supabase SQL Editor

-- 1. news_posts
ALTER TABLE "public"."news_posts"
  ADD COLUMN "title_i18n" JSONB,
  ADD COLUMN "content_i18n" JSONB;

-- 2. teams
ALTER TABLE "public"."teams"
  ADD COLUMN "name_i18n" JSONB,
  ADD COLUMN "purpose_i18n" JSONB,
  ADD COLUMN "description_i18n" JSONB,
  ADD COLUMN "detail_markdown_i18n" JSONB;

-- 3. team_items
ALTER TABLE "public"."team_items"
  ADD COLUMN "title_i18n" JSONB,
  ADD COLUMN "description_i18n" JSONB,
  ADD COLUMN "detail_markdown_i18n" JSONB;

-- 4. popular_keywords
ALTER TABLE "public"."popular_keywords"
  ADD COLUMN "keyword_i18n" JSONB;

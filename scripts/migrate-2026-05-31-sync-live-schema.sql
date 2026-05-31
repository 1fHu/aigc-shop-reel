-- Migration: 同步线上库到最新实体 / init-db.sql（2026-05-31）
--
-- 背景：线上库由旧版 init-db.sql 建表，后续提交给实体 + init-db.sql 补了若干列，
--       但已存在的表未同步，导致 schema 漂移（如创建项目报
--       `column "cover_url" of relation "projects" does not exist`）。
--
-- 本脚本幂等（ADD COLUMN IF NOT EXISTS），可重复执行；列定义与 init-db.sql 对齐。
-- 执行：psql "$DATABASE_URL" -f scripts/migrate-2026-05-31-sync-live-schema.sql

BEGIN;

-- projects：补齐统计 / 展示 / 状态列
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_url       VARCHAR(500);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS material_count  INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS script_count    INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_count     INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS views           INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS render_progress INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tiktok_ready    BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_guest        BOOLEAN DEFAULT false;

-- materials：补齐缩略图 / 状态 / 时长 / 切片列
ALTER TABLE materials ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'parsing';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS duration      FLOAT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS slices        JSONB DEFAULT '[]';

-- video_tasks：补齐分镜预览 URL 列
ALTER TABLE video_tasks ADD COLUMN IF NOT EXISTS preview_url VARCHAR(500);

COMMIT;

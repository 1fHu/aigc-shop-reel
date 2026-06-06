-- VidCraft Database Initialization Script
-- Supports: PostgreSQL 16 + pgvector

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    avatar_url VARCHAR(500),
    plan_type VARCHAR(20) DEFAULT 'free',
    video_quota INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    product_url VARCHAR(500),
    product_info JSONB,
    cover_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    material_count INTEGER DEFAULT 0,
    script_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    render_progress INTEGER DEFAULT 0,
    tiktok_ready BOOLEAN DEFAULT false,
    is_guest BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    analysis JSONB,
    embedding vector(1024),
    tags TEXT[],
    thumbnail_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'parsing',
    duration FLOAT,
    slices JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. material_slices
CREATE TABLE material_slices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    start_sec FLOAT NOT NULL,
    end_sec FLOAT NOT NULL,
    thumbnail_url VARCHAR(500),
    tags JSONB,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. scripts
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    strategy_type VARCHAR(50) NOT NULL,
    content TEXT,
    storyboard JSONB,
    factor_history JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    video_url VARCHAR(500),
    duration FLOAT,
    resolution VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    trace_id VARCHAR(36),
    generation_cost FLOAT,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. video_tasks
CREATE TABLE video_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    shot_index INTEGER NOT NULL,
    seedance_task_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'queued',
    retry_count INTEGER DEFAULT 0,
    error_msg TEXT,
    preview_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    tts_audio_url VARCHAR(500),
    tts_duration NUMERIC(5,2),
    tts_subtitle_url VARCHAR(500),
    trace_id VARCHAR(36),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. video_metrics
CREATE TABLE video_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    completion_rate FLOAT,
    click_rate FLOAT,
    conversion_rate FLOAT,
    gmv FLOAT,
    watch_time_distribution JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. viral_genes
CREATE TABLE viral_genes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    storyboard_structure JSONB,
    performance_score FLOAT,
    embedding vector(1024),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. viral_library
CREATE TABLE viral_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_url VARCHAR(500),
    platform VARCHAR(50),
    declared_at TIMESTAMPTZ DEFAULT NOW(),
    title VARCHAR(255),
    thumbnail_url VARCHAR(500),
    analysis_report JSONB,
    embedding vector(1024),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. factor_definitions
CREATE TABLE factor_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dimension VARCHAR(100) NOT NULL,
    values JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. diagnosis_reports
CREATE TABLE diagnosis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    issues JSONB,
    suggestions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. analyzed_videos（爆款视频拆解：用户上传视频 → AI 拆解创作手法）
CREATE TABLE analyzed_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    video_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    duration INT,
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
    error_message TEXT,
    analysis JSONB,
    creative_factors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HNSW INDEXES on vector columns
-- ============================================================

CREATE INDEX idx_materials_embedding ON materials USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_material_slices_embedding ON material_slices USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_viral_genes_embedding ON viral_genes USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_viral_library_embedding ON viral_library USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);

-- ============================================================
-- B-tree indexes for common queries
-- ============================================================

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_materials_project_id ON materials(project_id);
CREATE INDEX idx_material_slices_material_id ON material_slices(material_id);
CREATE INDEX idx_scripts_project_id ON scripts(project_id);
CREATE INDEX idx_videos_project_id ON videos(project_id);
CREATE INDEX idx_videos_script_id ON videos(script_id);
CREATE INDEX idx_video_tasks_video_id ON video_tasks(video_id);
CREATE INDEX idx_diagnosis_reports_video_id ON diagnosis_reports(video_id);
CREATE INDEX idx_viral_genes_category ON viral_genes(category);
CREATE INDEX idx_viral_library_platform ON viral_library(platform);
CREATE INDEX idx_viral_library_status ON viral_library(status);
CREATE INDEX idx_analyzed_videos_user_id ON analyzed_videos(user_id);
CREATE INDEX idx_analyzed_videos_status ON analyzed_videos(status);
CREATE INDEX idx_analyzed_videos_created_at ON analyzed_videos(created_at DESC);

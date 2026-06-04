-- 创建 analyzed_videos 表
CREATE TABLE IF NOT EXISTS analyzed_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analyzed_videos_user_id ON analyzed_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_videos_status ON analyzed_videos(status);
CREATE INDEX IF NOT EXISTS idx_analyzed_videos_created_at ON analyzed_videos(created_at DESC);

-- 添加注释
COMMENT ON TABLE analyzed_videos IS '用户上传的视频拆解分析记录';
COMMENT ON COLUMN analyzed_videos.status IS '拆解状态: pending-等待, analyzing-分析中, completed-完成, failed-失败';
COMMENT ON COLUMN analyzed_videos.analysis IS 'AI 拆解结果: hook, selling_points, pacing, style';
COMMENT ON COLUMN analyzed_videos.creative_factors IS '创作因子: visual_style, opener, narration, pacing, cta';

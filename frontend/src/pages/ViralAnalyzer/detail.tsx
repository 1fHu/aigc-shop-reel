import { t as translate, useLanguage } from '@/i18n';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spin, Tag, message, Typography, Divider, Space } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { viralAnalyzerService, type AnalyzedVideo } from '@/services/viralAnalyzerService';
import './detail.css';

const { Title, Paragraph, Text } = Typography;

const ViralAnalyzerDetail: React.FC = () => {
  useLanguage();


  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<AnalyzedVideo | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await viralAnalyzerService.getDetail(id!);
      setVideo(data);
    } catch {
      message.error(translate("加载失败"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetail();
    }
  }, [id, loadDetail]);

  // 同步到基因库
  const handleSyncToGenebank = async () => {
    if (!video) return;

    setSyncing(true);
    try {
      await viralAnalyzerService.syncToGenebank(video.id);
      message.success(translate("已同步到基因库，可在参考视频库中查看"));
    } catch (error) {
      const msg = (error as { response?: { data?: { msg?: string } } }).response?.data?.msg;
      message.error(msg || translate("同步失败"));
    } finally {
      setSyncing(false);
    }
  };

  // 状态标签
  const renderStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'default', text: translate("等待分析") },
      analyzing: { color: 'processing', text: translate("分析中") },
      completed: { color: 'success', text: translate("已完成") },
      failed: { color: 'error', text: translate("分析失败") },
    };
    const config = statusMap[status as keyof typeof statusMap];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="error-container">
        <Text type="secondary">{translate("视频不存在")}</Text>
      </div>
    );
  }

  return (
    <div className="viral-analyzer-detail-page">
      {/* 头部导航 */}
      <div className="detail-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/viral-analyzer')}
        >
          {translate("返回列表")}
        </Button>
        <div className="header-info">
          <Title level={3} className="video-title">
            {video.title}
          </Title>
          {renderStatusTag(video.status)}
        </div>
      </div>

      {/* 主内容 */}
      <div className="detail-content">
        {/* 左侧：视频播放器 */}
        <div className="video-section">
          <Card className="video-card">
            <div className="video-player">
              {video.video_url ? (
                <video
                  controls
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  className="video-element"
                  preload="metadata"
                  crossOrigin="anonymous"
                >
                  {translate("您的浏览器不支持视频播放")}
                </video>
              ) : (
                <div className="video-placeholder">
                  <PlayCircleOutlined className="placeholder-icon" />
                  <Text type="secondary">{translate("视频加载中...")}</Text>
                </div>
              )}
            </div>
            {video.duration && (
              <div className="video-info">
                <Text type="secondary">{translate("时长：")}{video.duration} {translate("秒")}</Text>
              </div>
            )}
          </Card>
        </div>

        {/* 右侧：拆解报告 */}
        <div className="analysis-section">
          {video.status === 'analyzing' && (
            <Card className="analyzing-card">
              <Spin />
              <Text style={{ marginLeft: 12 }}>{translate("AI 正在分析中，请稍候...")}</Text>
            </Card>
          )}

          {video.status === 'failed' && (
            <Card className="error-card">
              <Text type="danger">{translate("分析失败：")}{video.error_message}</Text>
            </Card>
          )}

          {video.status === 'completed' && video.analysis && (
            <>
              {/* Hook */}
              <Card className="analysis-card hook-card" title={translate("HOOK（前 3 秒）")}>
                <div className="time-range">{video.analysis.hook.time_range}</div>
                <Paragraph className="content">{video.analysis.hook.content}</Paragraph>
              </Card>

              {/* Selling Points */}
              <Card className="analysis-card selling-points-card" title={translate("SELLING POINTS")}>
                <ul className="selling-points-list">
                  {video.analysis.selling_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </Card>

              {/* Pacing */}
              <Card className="analysis-card pacing-card" title={translate("PACING")}>
                <Paragraph className="content">{video.analysis.pacing}</Paragraph>
              </Card>

              {/* Style */}
              <Card className="analysis-card style-card" title={translate("STYLE")}>
                <Paragraph className="content">{video.analysis.style}</Paragraph>
              </Card>

              <Divider />

              {/* 创作因子 */}
              {video.creative_factors && (
                <Card className="factors-card" title={translate("提取的创作因子")}>
                  <div className="factors-grid">
                    <div className="factor-item">
                      <Text type="secondary">{translate("视觉风格")}</Text>
                      <Text strong>{translate(video.creative_factors.visual_style)}</Text>
                    </div>
                    <div className="factor-item">
                      <Text type="secondary">{translate("开场手法")}</Text>
                      <Text strong>{translate(video.creative_factors.opener)}</Text>
                    </div>
                    <div className="factor-item">
                      <Text type="secondary">{translate("旁白风格")}</Text>
                      <Text strong>{translate(video.creative_factors.narration)}</Text>
                    </div>
                    <div className="factor-item">
                      <Text type="secondary">{translate("节奏")}</Text>
                      <Text strong>{translate(video.creative_factors.pacing)}</Text>
                    </div>
                    <div className="factor-item">
                      <Text type="secondary">{translate("行动号召")}</Text>
                      <Text strong>{translate(video.creative_factors.cta)}</Text>
                    </div>
                  </div>
                </Card>
              )}

              {/* 生成剧本按钮 */}
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button
                  type="default"
                  size="large"
                  block
                  icon={<DatabaseOutlined />}
                  className="sync-genebank-btn"
                  onClick={handleSyncToGenebank}
                  loading={syncing}
                >
                  {translate("同步到基因库")}
                </Button>
              </Space>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViralAnalyzerDetail;

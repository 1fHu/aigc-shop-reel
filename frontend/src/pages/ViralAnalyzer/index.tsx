import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, message, Card, List, Tag, Button, Empty, Spin } from 'antd';
import { InboxOutlined, PlayCircleOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { viralAnalyzerService, type AnalyzedVideoListItem } from '@/services/viralAnalyzerService';
import './index.css';

const { Dragger } = Upload;

const ViralAnalyzer: React.FC = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<AnalyzedVideoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;

  // 加载视频列表
  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await viralAnalyzerService.getList({ page, limit });
      setVideos(data.items);
      setTotal(data.total);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [page]);

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'video',
    multiple: false,
    accept: 'video/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const isVideo = file.type.startsWith('video/');
      if (!isVideo) {
        message.error('只能上传视频文件！');
        return false;
      }
      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('视频大小不能超过 500MB！');
        return false;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try {
        const result = await viralAnalyzerService.upload(file as File);
        message.success('上传成功，AI 正在分析中...');
        onSuccess?.(result);
        // 刷新列表
        loadVideos();
      } catch (error: any) {
        message.error(error.response?.data?.msg || '上传失败');
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  };

  // 删除视频
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await viralAnalyzerService.delete(id);
      message.success('删除成功');
      loadVideos();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 查看详情
  const handleViewDetail = (id: string) => {
    navigate(`/viral-analyzer/${id}`);
  };

  // 状态标签
  const renderStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'default', text: '等待分析' },
      analyzing: { color: 'processing', text: '分析中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '分析失败' },
    };
    const config = statusMap[status as keyof typeof statusMap];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  return (
    <div className="viral-analyzer-page">
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <ThunderboltOutlined className="title-icon" />
            <h1 className="page-title">优质视频分析器</h1>
          </div>
          <p className="page-description">
            上传视频文件，AI 自动拆解创作手法，提取 Hook、卖点、节奏、风格等创作因子
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* 上传区域 */}
        <Card className="upload-card">
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              {uploading ? '上传中...' : '点击或拖拽视频文件到此区域上传'}
            </p>
            <p className="ant-upload-hint">
              支持 MP4、MOV、AVI 等格式，单个文件不超过 500MB
            </p>
          </Dragger>
        </Card>

        {/* 拆解历史列表 */}
        <div className="videos-section">
          <div className="section-header">
            <h2 className="section-title">最近拆解项目</h2>
            <span className="section-count">共 {total} 个项目已拆解完成</span>
          </div>

          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : videos.length === 0 ? (
            <Empty
              description="还没有拆解记录，上传你的第一个视频吧"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
              dataSource={videos}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                onChange: (p) => setPage(p),
                showSizeChanger: false,
              }}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    hoverable
                    className="video-card"
                    onClick={() => handleViewDetail(item.id)}
                    cover={
                      <div className="video-cover">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.title} />
                        ) : (
                          <div className="video-cover-placeholder">
                            <PlayCircleOutlined className="play-icon" />
                          </div>
                        )}
                        <div className="status-overlay">
                          {renderStatusTag(item.status)}
                        </div>
                      </div>
                    }
                    actions={[
                      <Button
                        type="text"
                        icon={<PlayCircleOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(item.id);
                        }}
                      >
                        查看
                      </Button>,
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => handleDelete(item.id, e)}
                      >
                        删除
                      </Button>,
                    ]}
                  >
                    <Card.Meta
                      title={<div className="card-title">{item.title}</div>}
                      description={
                        <div className="card-description">
                          {item.duration && <span>{item.duration}秒</span>}
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ViralAnalyzer;

import { Card, Row, Col, Statistic, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ProjectOutlined,
  VideoCameraOutlined,
  PlaySquareOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="项目数量" value={2} prefix={<ProjectOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="已生成视频" value={1} prefix={<VideoCameraOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="优质视频库" value={5} prefix={<PlaySquareOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="爆款基因" value={30} prefix={<ExperimentOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title="快速开始"
        style={{ marginTop: 24 }}
        extra={
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => navigate('/projects')}>
            创建第一个项目
          </Button>
        }
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" hoverable onClick={() => navigate('/projects')}>
              <ProjectOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <h4>项目与商品解析</h4>
              <p style={{ color: '#666', fontSize: 13 }}>创建项目，粘贴商品链接，AI 自动提取卖点</p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable onClick={() => navigate('/viral-library')}>
              <PlaySquareOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <h4>优质视频库</h4>
              <p style={{ color: '#666', fontSize: 13 }}>检索爆款视频，查看 AI 拆解报告，一键借鉴</p>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" hoverable onClick={() => navigate('/analytics')}>
              <BarChartOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <h4>数据看板</h4>
              <p style={{ color: '#666', fontSize: 13 }}>查看视频转化数据，AI 诊断定位优化方向</p>
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="演示项目" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" hoverable>
              <h4>美白精华液推广</h4>
              <p style={{ color: '#666', fontSize: 13 }}>
                美妆护肤 · 3个剧本 · 1个视频 · 完播率 35%
              </p>
              <Button size="small" type="link" icon={<VideoCameraOutlined />}>
                查看
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" hoverable>
              <h4>无线降噪耳机</h4>
              <p style={{ color: '#666', fontSize: 13 }}>
                3C数码 · 1个剧本 · 待生成视频
              </p>
              <Button size="small" type="link" icon={<VideoCameraOutlined />}>
                查看
              </Button>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

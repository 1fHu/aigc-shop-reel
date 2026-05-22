import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  VideoCameraOutlined,
  FundOutlined,
  PlaySquareOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
  { key: '/viral-library', icon: <PlaySquareOutlined />, label: '优质视频库' },
  { key: '/gene-bank', icon: <ExperimentOutlined />, label: '爆款基因库' },
  { key: '/analytics', icon: <FundOutlined />, label: '数据看板' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: token.colorWhite, fontSize: collapsed ? 16 : 20, fontWeight: 'bold' }}>
            {collapsed ? 'VC' : 'VidCraft'}
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            {menuItems.find((m) => m.key === location.pathname)?.label || 'VidCraft'}
          </span>
          <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => navigate('/projects')}>
            新建项目
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

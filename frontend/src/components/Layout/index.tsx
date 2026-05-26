import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme, Space, Tag, App } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  VideoCameraOutlined,
  FundOutlined,
  PlaySquareOutlined,
  ExperimentOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

import { useAuthStore, selectUser, selectIsGuest } from '@/stores/authStore';

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
  const { message } = App.useApp();

  // ⚠️ 临时 Layout — Dashboard 实现时会替换为 prototype.html 中的白色侧栏样式 + 用户菜单
  // 这里的登出按钮也是临时的，正式版会放进右上角用户头像下拉菜单
  const user = useAuthStore(selectUser);
  const isGuest = useAuthStore(selectIsGuest);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: token.colorWhite, fontSize: collapsed ? 16 : 20, fontWeight: 'bold' }}>
            {collapsed ? 'VC' : 'VidCraft v0.1'}
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

          <Space size={12}>
            {/* 当前用户信息（临时） */}
            {user && (
              <Space size={6}>
                <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>{user.nickname}</span>
                {isGuest && <Tag color="orange" style={{ margin: 0 }}>游客</Tag>}
              </Space>
            )}

            <Button type="primary" icon={<VideoCameraOutlined />} onClick={() => navigate('/projects')}>
              新建项目
            </Button>

            {/* 临时登出按钮 — 正式版会放进用户头像下拉菜单 */}
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

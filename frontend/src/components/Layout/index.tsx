import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, App, type MenuProps } from 'antd';
import {
  AppstoreOutlined,
  FolderOpenOutlined,
  FireOutlined,
  BarChartOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  ThunderboltFilled,
  BellOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  SettingOutlined,
  LogoutOutlined,
  VideoCameraOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

import { useAuthStore, selectUser, selectIsGuest } from '@/stores/authStore';
import NewProjectModal from '@/components/NewProjectModal';
import GlobalSearch from '@/components/GlobalSearch';
import styles from './Layout.module.css';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * AppLayout
 *
 * 主体框架，所有需要登录的页面都通过 <Outlet /> 渲染在主内容区。
 *
 * 布局：
 *   ┌──────────────┬────────────────────────────────┐
 *   │              │  Guest Banner（可选）           │
 *   │              ├────────────────────────────────┤
 *   │   Sidebar    │  Topbar (search/tabs/avatar)    │
 *   │   (white)    ├────────────────────────────────┤
 *   │              │                                │
 *   │              │  Page Content (Outlet)          │
 *   │              │                                │
 *   └──────────────┴────────────────────────────────┘
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const user = useAuthStore(selectUser);
  const isGuest = useAuthStore(selectIsGuest);
  const logout = useAuthStore((s) => s.logout);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const showGuestBanner = isGuest && !bannerDismissed;

  const navItems: NavItem[] = [
    { key: '/',              label: 'Dashboard',        icon: <AppstoreOutlined /> },
    { key: '/projects',      label: 'Projects',         icon: <FolderOpenOutlined /> },
    { key: '/gene-bank',     label: 'Gene Bank',        icon: <FireOutlined /> },
    { key: '/viral-analyzer', label: 'Video Analyzer',   icon: <VideoCameraOutlined /> },
    { key: '/analytics',     label: 'Analytics',        icon: <BarChartOutlined /> },
  ];

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/login', { replace: true });
  };

  const avatarLetter = (user?.nickname || 'V').slice(0, 1).toUpperCase();

  const avatarMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 500, color: '#111827' }}>{user?.nickname ?? '游客'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {isGuest ? '游客模式 · 配额 ' + (user?.video_quota ?? 0) : user?.email}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'account',  icon: <UserOutlined />,     label: '个人资料', onClick: () => navigate('/account') },
    { key: 'settings', icon: <SettingOutlined />,  label: '账户设置', onClick: () => navigate('/account') },
    { key: 'help',     icon: <QuestionCircleOutlined />, label: '帮助中心', onClick: () => navigate('/help') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout },
  ];

  return (
    <div className={styles.shell}>
      {/* =========== Sidebar =========== */}
      <aside className={`${styles.sider} ${collapsed ? styles.siderCollapsed : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandLeft}>
            <div className={styles.brandLogo}><ThunderboltFilled /></div>
            {!collapsed && (
              <div>
                <div className={styles.brandText}>VidCraft</div>
                <div className={styles.brandTagline}>PRO WORKSTATION</div>
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? '展开侧栏' : '收起侧栏'}
          >
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.key)}
              className={`${styles.navItem} ${location.pathname === item.key ? styles.navItemActive : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && item.label}
            </button>
          ))}

          <div className={styles.navDivider} />

          <button
            type="button"
            className={`${styles.navItem} ${location.pathname === '/help' ? styles.navItemActive : ''}`}
            onClick={() => navigate('/help')}
            title={collapsed ? '帮助中心' : undefined}
          >
            <span className={styles.navIcon}><QuestionCircleOutlined /></span>
            {!collapsed && '帮助中心'}
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${location.pathname === '/account' ? styles.navItemActive : ''}`}
            onClick={() => navigate('/account')}
            title={collapsed ? '账户' : undefined}
          >
            <span className={styles.navIcon}><UserOutlined /></span>
            {!collapsed && '账户'}
          </button>
        </nav>

        <button type="button" className={styles.createBtn} onClick={() => setCreateOpen(true)}>
          <PlusOutlined /> {!collapsed && 'Create New Video'}
        </button>

      </aside>

      {/* =========== Main column =========== */}
      <div className={styles.main}>
        {/* Guest banner */}
        {showGuestBanner && (
          <div className={styles.guestBanner}>
            <span className={styles.guestBannerLeft}>
              <InfoCircleOutlined />
              您正处于游客模式。登录后可解锁更多高级 AI 功能并保存您的创作进度。
            </span>
            <span className={styles.guestBannerRight}>
              <span className={styles.guestBannerLink} onClick={handleLogout}>立即登录</span>
              <button type="button" className={styles.guestBannerClose} onClick={() => setBannerDismissed(true)} aria-label="关闭">
                <CloseOutlined />
              </button>
            </span>
          </div>
        )}

        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.search}>
            <GlobalSearch />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className={styles.upgrade} onClick={() => navigate('/subscription')}>Upgrade Pro</button>
            <button className={styles.iconBtn} aria-label="通知">
              <BellOutlined />
              <span className={styles.iconBtnDot} />
            </button>
            <Dropdown menu={{ items: avatarMenu }} placement="bottomRight" trigger={['click']}>
              <div className={styles.avatar}>{avatarLetter}</div>
            </Dropdown>
          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* 全局：新建项目 Modal（被侧栏 "Create New Video" 触发） */}
      <NewProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

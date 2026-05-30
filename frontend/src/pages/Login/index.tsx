import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, Checkbox, App } from 'antd';
import {
  ThunderboltFilled,
  UserOutlined,
  LockOutlined,
  ControlOutlined,
  LineChartOutlined,
  RocketOutlined,
} from '@ant-design/icons';

import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import styles from './Login.module.css';

/**
 * Login Page
 *
 * 两种登录方式：
 *   1) 游客一键体验 → POST /api/auth/guest-login
 *   2) 邮箱 + 密码  → POST /api/auth/login
 *
 * 登录成功后跳到登录前页面，没有 from 则跳 Dashboard。
 * 已登录用户访问 /login 自动重定向到目标页。
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const guestLogin = useAuthStore((s) => s.guestLogin);
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ username: '', password: '', remember: false });

  // 登录前的目的地（被 RequireAuth 守卫跳转过来时携带）
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  // 已登录则直接跳走
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleGuestLogin = async () => {
    try {
      await guestLogin();
      message.success('已进入游客模式');
    } catch {
      // 拦截器已统一 toast，这里仅兜底
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      message.warning('请填写用户名和密码');
      return;
    }
    try {
      await login({ username: form.username, password: form.password });
      message.success('登录成功');
    } catch {
      // 拦截器已统一 toast
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      {/* ============ 左：品牌秀 ============ */}
      <div className={styles.brandPanel}>
        <div className={styles.aurora} />
        <div className={styles.grid} />

        <div style={{ position: 'relative', zIndex: 1, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className={styles.brandGradient}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(70,72,212,0.5)',
              }}
            >
              <ThunderboltFilled style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
                VidCraft
              </div>
              <div className={styles.monoTagline} style={{ marginTop: 4 }}>
                AIGC × TIKTOK COMMERCE
              </div>
            </div>
          </div>

          {/* Floating product stack */}
          <div style={{ position: 'relative', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Back card: sneakers */}
            <div
              className={`${styles.floatCard} ${styles.floatAnim3}`}
              style={
                {
                  position: 'absolute',
                  width: 176, height: 288,
                  transform: 'rotate(-8deg) translate(-100px, 40px)',
                  '--rotate': 'rotate(-8deg) translate(-100px, 40px)',
                } as React.CSSProperties
              }
            >
              <img
                src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=600&fit=crop"
                alt="Sneakers"
              />
              <div className={`${styles.statOverlay} ${styles.glass}`}>
                <div className={styles.label}>CTR</div>
                <div className={styles.value}>+12.4%</div>
              </div>
            </div>

            {/* Front card: perfume */}
            <div
              className={`${styles.floatCard} ${styles.floatAnim1}`}
              style={
                {
                  position: 'absolute',
                  width: 192, height: 320,
                  transform: 'rotate(-4deg) translate(-30px, -10px)',
                  zIndex: 20,
                  '--rotate': 'rotate(-4deg) translate(-30px, -10px)',
                } as React.CSSProperties
              }
            >
              <img
                src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=600&fit=crop"
                alt="Perfume"
              />
              <span
                className={styles.glassPill}
                style={{
                  position: 'absolute', top: 8, left: 8,
                  padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                }}
              >
                完播率 68.4%
              </span>
            </div>

            {/* Right card: watch */}
            <div
              className={`${styles.floatCard} ${styles.floatAnim2}`}
              style={
                {
                  position: 'absolute',
                  width: 176, height: 288,
                  transform: 'rotate(6deg) translate(110px, 20px)',
                  zIndex: 10,
                  '--rotate': 'rotate(6deg) translate(110px, 20px)',
                } as React.CSSProperties
              }
            >
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=600&fit=crop"
                alt="Watch"
              />
              <span className={styles.hotPill} style={{ position: 'absolute', top: 8, right: 8 }}>
                HOT CONTENT
              </span>
              <div className={`${styles.statOverlay} ${styles.glass}`}>
                <div className={styles.label}>本月生成数</div>
                <div className={styles.value} style={{ fontSize: 18 }}>1,284</div>
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { icon: <ThunderboltFilled />, text: '30 分钟出片' },
              { icon: <ControlOutlined />, text: '因子级干预' },
              { icon: <LineChartOutlined />, text: '数据反哺创作' },
            ].map((p) => (
              <div
                key={p.text}
                className={styles.glassPill}
                style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {p.icon} {p.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 右：登录表单 ============ */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          {/* Mini logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div
              className={styles.brandGradient}
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ThunderboltFilled style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 20 }}>
              VidCraft
            </span>
          </div>

          <h1 className={styles.heading}>欢迎回来</h1>
          <p className={styles.subheading}>登录开始你的 AI 视频创作之旅</p>

          {/* Guest CTA */}
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleGuestLogin}
            icon={<RocketOutlined />}
            className={`${styles.brandGradient} ${styles.glowButton}`}
            style={{
              height: 56,
              marginTop: 32,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
            }}
          >
            {loading ? '正在准备体验环境...' : '游客一键体验'}
          </Button>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
            无需注册 · 预置示例项目 · 即刻体验完整流程
          </p>

          <div className={styles.dividerWithText}><span>或使用账号登录</span></div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                用户名或邮箱
              </label>
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="你的用户名"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                密码
              </label>
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="至少 8 位"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 18 }}>
              <Checkbox
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              >
                <span style={{ color: '#6B7280' }}>记住我</span>
              </Checkbox>
              <Link to="/forgot-password" style={{ color: '#4648D4' }}>忘记密码？</Link>
            </div>

            <Button htmlType="submit" block size="large" loading={loading} style={{ height: 44, fontWeight: 600 }}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 24 }}>
            还没有账号？<Link to="/register" style={{ color: '#4648D4', fontWeight: 500, marginLeft: 4 }}>立即注册</Link>
          </p>

          <p className={styles.footer}>© 2026 VidCraft · 服务条款 · 隐私政策</p>
        </div>
      </div>
    </div>
  );
}

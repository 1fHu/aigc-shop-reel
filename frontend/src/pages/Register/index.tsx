import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, App } from 'antd';
import {
  ThunderboltFilled,
  MailOutlined,
  LockOutlined,
  ControlOutlined,
  LineChartOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import api from '@/services/api';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import styles from './Register.module.css';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [form, setForm] = useState({ nickname: '', email: '', password: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [retrySec, setRetrySec] = useState(0);

  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email || !form.password || !form.confirmPassword) {
      message.warning('请填写所有必填字段');
      return;
    }
    if (form.password !== form.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      message.warning('密码至少 8 位，须包含字母与数字');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      message.warning('请输入有效的邮箱地址');
      return;
    }

    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        nickname: form.nickname || undefined,
      });
      setStep('verify');
      message.success('验证码已发送至你的邮箱');
      // 60s 倒计时
      setRetrySec(60);
      const timer = setInterval(() => { setRetrySec((s) => { if (s <= 1) { clearInterval(timer); return 0; } return s - 1; }); }, 1000);
    } catch {
      // interceptor already shows error toast
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      message.warning('请输入 6 位验证码');
      return;
    }

    try {
      // Step 2: verify code and login
      const res = await api.post('/auth/verify-email', {
        email: form.email,
        code,
      });
      // Use the returned tokens to login
      const { accessToken, refreshToken } = res as any as { accessToken: string; refreshToken: string };
      localStorage.setItem('vidcraft_access_token', accessToken);
      localStorage.setItem('vidcraft_refresh_token', refreshToken);
      await login({ username: form.nickname || form.email.split('@')[0], password: form.password });
      message.success('注册成功，欢迎加入 VidCraft');
    } catch {
      message.error('验证码错误或已过期');
    }
  };

  const leftPanel = (
    <div className={styles.brandPanel}>
      <div className={styles.aurora} />
      <div className={styles.grid} />
      <div style={{ position: 'relative', zIndex: 1, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={styles.brandGradient} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(70,72,212,0.5)' }}>
            <ThunderboltFilled style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>VidCraft</div>
            <div className={styles.monoTagline} style={{ marginTop: 4 }}>AIGC × TIKTOK COMMERCE</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[{ icon: <ThunderboltFilled />, text: '30 分钟出片' }, { icon: <ControlOutlined />, text: '因子级干预' }, { icon: <LineChartOutlined />, text: '数据反哺创作' }].map((p) => (
            <div key={p.text} className={styles.glassPill} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>{p.icon} {p.text}</div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      {leftPanel}

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div className={styles.brandGradient} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThunderboltFilled style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 20 }}>VidCraft</span>
          </div>

          {step === 'form' ? (
            <>
              <h1 className={styles.heading}>创建账号</h1>
              <p className={styles.subheading}>注册后即可开始 AI 视频创作</p>

              <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>昵称</label>
                  <Input size="large" prefix={<UserOutlined style={{ color: '#9CA3AF' }} />} placeholder="你的昵称" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>邮箱地址</label>
                  <Input size="large" prefix={<MailOutlined style={{ color: '#9CA3AF' }} />} placeholder="name@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>密码</label>
                  <Input.Password size="large" prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} placeholder="至少 8 位，包含字母和数字" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>确认密码</label>
                  <Input.Password size="large" prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} placeholder="再次输入密码" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" />
                </div>
                <Button htmlType="submit" type="primary" block size="large" loading={loading} className={`${styles.brandGradient} ${styles.glowButton}`} style={{ height: 48, borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none' }}>
                  {loading ? '发送验证码...' : '注册'}
                </Button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 24 }}>
                已有账号？
                <Link to="/login" style={{ color: '#4648D4', fontWeight: 500, marginLeft: 4 }}>
                  <ArrowLeftOutlined style={{ marginRight: 4 }} />返回登录
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.heading}>验证邮箱</h1>
              <p className={styles.subheading}>验证码已发送至 <strong>{form.email}</strong>，10 分钟内有效</p>

              <form
                onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
                style={{ marginTop: 32 }}
              >
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>验证码</label>
                  <Input size="large" prefix={<SafetyCertificateOutlined style={{ color: '#9CA3AF' }} />} placeholder="6 位数字" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} autoFocus />
                </div>
                <Button htmlType="submit" type="primary" block size="large" loading={loading} className={`${styles.brandGradient} ${styles.glowButton}`} style={{ height: 48, borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none' }}>
                  {loading ? '验证中...' : '验证并完成注册'}
                </Button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginTop: 16 }}>
                没有收到验证码？
                {retrySec > 0 ? (
                  <span style={{ color: '#9CA3AF' }}> {retrySec}s 后可重新发送</span>
                ) : (
                  <a onClick={() => { setStep('form'); }} style={{ color: '#4648D4', fontWeight: 500, cursor: 'pointer', marginLeft: 4 }}>点击重新发送</a>
                )}
              </p>
            </>
          )}

          <p className={styles.footer}>© 2026 VidCraft · 服务条款 · 隐私政策</p>
        </div>
      </div>
    </div>
  );
}

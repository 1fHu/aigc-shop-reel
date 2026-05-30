import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Input, App } from 'antd';
import {
  ThunderboltFilled,
  LockOutlined,
  ControlOutlined,
  LineChartOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import api from '@/services/api';

import styles from './ResetPassword.module.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();

  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      message.warning('请填写新密码');
      return;
    }
    if (password !== confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      message.warning('密码至少 8 位，须包含字母与数字');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch {
      message.error('重置链接已失效，请重新申请');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Geist', fontSize: 24, color: '#111827' }}>无效的重置链接</h1>
          <p style={{ color: '#6B7280', marginTop: 8 }}>缺少 token 参数，请检查邮件中的链接是否完整。</p>
          <Link to="/forgot-password" style={{ color: '#4648D4', fontWeight: 500, marginTop: 16, display: 'inline-block' }}>
            重新申请
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      {/* ============ 左：品牌秀 ============ */}
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

          <div style={{ position: 'relative', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className={`${styles.floatCard} ${styles.floatAnim3}`} style={{ position: 'absolute', width: 176, height: 288, transform: 'rotate(-8deg) translate(-100px, 40px)', '--rotate': 'rotate(-8deg) translate(-100px, 40px)' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=600&fit=crop" alt="Sneakers" />
              <div className={`${styles.statOverlay} ${styles.glass}`}><div className={styles.label}>CTR</div><div className={styles.value}>+12.4%</div></div>
            </div>
            <div className={`${styles.floatCard} ${styles.floatAnim1}`} style={{ position: 'absolute', width: 192, height: 320, transform: 'rotate(-4deg) translate(-30px, -10px)', zIndex: 20, '--rotate': 'rotate(-4deg) translate(-30px, -10px)' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=600&fit=crop" alt="Perfume" />
              <span className={styles.glassPill} style={{ position: 'absolute', top: 8, left: 8, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>完播率 68.4%</span>
            </div>
            <div className={`${styles.floatCard} ${styles.floatAnim2}`} style={{ position: 'absolute', width: 176, height: 288, transform: 'rotate(6deg) translate(110px, 20px)', zIndex: 10, '--rotate': 'rotate(6deg) translate(110px, 20px)' } as React.CSSProperties}>
              <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=600&fit=crop" alt="Watch" />
              <span className={styles.hotPill} style={{ position: 'absolute', top: 8, right: 8 }}>HOT CONTENT</span>
              <div className={`${styles.statOverlay} ${styles.glass}`}><div className={styles.label}>本月生成数</div><div className={styles.value} style={{ fontSize: 18 }}>1,284</div></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[{ icon: <ThunderboltFilled />, text: '30 分钟出片' }, { icon: <ControlOutlined />, text: '因子级干预' }, { icon: <LineChartOutlined />, text: '数据反哺创作' }].map((p) => (
              <div key={p.text} className={styles.glassPill} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>{p.icon} {p.text}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 右：重置密码表单 ============ */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div className={styles.brandGradient} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThunderboltFilled style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 20 }}>VidCraft</span>
          </div>

          {done ? (
            <>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <CheckCircleFilled style={{ fontSize: 56, color: '#10B981' }} />
              </div>
              <h1 className={styles.heading} style={{ textAlign: 'center', marginTop: 20 }}>密码已重置</h1>
              <p className={styles.subheading} style={{ textAlign: 'center' }}>你的新密码已生效。</p>
              <Link to="/login">
                <Button type="primary" block size="large" className={`${styles.brandGradient} ${styles.glowButton}`} style={{ height: 48, borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none', marginTop: 24 }}>
                  返回登录
                </Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className={styles.heading}>重置密码</h1>
              <p className={styles.subheading}>为你的账号设置一个新密码</p>

              <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>新密码</label>
                  <Input.Password size="large" prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} placeholder="至少 8 位，包含字母和数字" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>确认新密码</label>
                  <Input.Password size="large" prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} placeholder="再次输入新密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <Button htmlType="submit" type="primary" block size="large" loading={loading} className={`${styles.brandGradient} ${styles.glowButton}`} style={{ height: 48, borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none' }}>
                  {loading ? '重置中...' : '重置密码'}
                </Button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 28 }}>
            <Link to="/login" style={{ color: '#4648D4', fontWeight: 500 }}>
              <ArrowLeftOutlined style={{ marginRight: 4 }} />返回登录
            </Link>
          </p>
          <p className={styles.footer}>© 2026 VidCraft · 服务条款 · 隐私政策</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, App } from 'antd';
import {
  ThunderboltFilled,
  MailOutlined,
  ControlOutlined,
  LineChartOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

import styles from './ForgotPassword.module.css';

type Step = 'input' | 'sent';

export default function ForgotPassword() {
  const { message } = App.useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('input');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      message.warning('请输入邮箱地址');
      return;
    }

    // 简单邮箱格式校验
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      message.warning('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);

    // TODO: 接入后端 POST /api/auth/forgot-password
    // 目前前端模拟发送成功
    await new Promise((r) => setTimeout(r, 1500));

    setLoading(false);
    setStep('sent');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      {/* ============ 左：品牌秀（与登录/注册页完全一致）============ */}
      <div className={styles.brandPanel}>
        <div className={styles.aurora} />
        <div className={styles.grid} />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: 48,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className={styles.brandGradient}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(70,72,212,0.5)',
              }}
            >
              <ThunderboltFilled style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div>
              <div
                style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 22, lineHeight: 1 }}
              >
                VidCraft
              </div>
              <div className={styles.monoTagline} style={{ marginTop: 4 }}>
                AIGC × TIKTOK COMMERCE
              </div>
            </div>
          </div>

          {/* Floating product stack */}
          <div
            style={{
              position: 'relative',
              height: 420,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className={`${styles.floatCard} ${styles.floatAnim3}`}
              style={
                {
                  position: 'absolute',
                  width: 176,
                  height: 288,
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

            <div
              className={`${styles.floatCard} ${styles.floatAnim1}`}
              style={
                {
                  position: 'absolute',
                  width: 192,
                  height: 320,
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
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  padding: '2px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                完播率 68.4%
              </span>
            </div>

            <div
              className={`${styles.floatCard} ${styles.floatAnim2}`}
              style={
                {
                  position: 'absolute',
                  width: 176,
                  height: 288,
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
                <div className={styles.value} style={{ fontSize: 18 }}>
                  1,284
                </div>
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
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {p.icon} {p.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 右：忘记密码表单 ============ */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          {/* Mini logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div
              className={styles.brandGradient}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThunderboltFilled style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontFamily: 'Geist, system-ui, sans-serif', fontWeight: 700, fontSize: 20 }}>
              VidCraft
            </span>
          </div>

          {step === 'input' ? (
            <>
              <h1 className={styles.heading}>忘记密码</h1>
              <p className={styles.subheading}>输入注册邮箱，我们将发送重置链接</p>

              <form onSubmit={handleSubmit} style={{ marginTop: 32 }}>
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: 6,
                    }}
                  >
                    邮箱地址
                  </label>
                  <Input
                    size="large"
                    prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <Button
                  htmlType="submit"
                  type="primary"
                  block
                  size="large"
                  loading={loading}
                  className={`${styles.brandGradient} ${styles.glowButton}`}
                  style={{
                    height: 48,
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    border: 'none',
                  }}
                >
                  {loading ? '发送中...' : '发送重置链接'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <CheckCircleFilled style={{ fontSize: 56, color: '#10B981' }} />
              </div>
              <h1 className={styles.heading} style={{ textAlign: 'center', marginTop: 20 }}>
                邮件已发送
              </h1>
              <p className={styles.subheading} style={{ textAlign: 'center' }}>
                如果 <strong>{email}</strong> 已注册，你将很快收到一封密码重置邮件。
              </p>

              <div
                style={{
                  marginTop: 32,
                  padding: 16,
                  borderRadius: 8,
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  fontSize: 13,
                  color: '#166534',
                  lineHeight: 1.6,
                }}
              >
                没有收到邮件？检查垃圾邮件箱，或{' '}
                <a
                  onClick={() => setStep('input')}
                  style={{ color: '#4648D4', fontWeight: 500, cursor: 'pointer' }}
                >
                  重新发送
                </a>
                。
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 28 }}>
            <Link to="/login" style={{ color: '#4648D4', fontWeight: 500 }}>
              <ArrowLeftOutlined style={{ marginRight: 4 }} />
              返回登录
            </Link>
          </p>

          <p className={styles.footer}>© 2026 VidCraft · 服务条款 · 隐私政策</p>
        </div>
      </div>
    </div>
  );
}

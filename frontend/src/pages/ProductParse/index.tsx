import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Upload, Tag, Skeleton, App } from 'antd';
import {
  LinkOutlined,
  CloudUploadOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';

import { productService } from '@/services/productService';
import type { ParsedProduct } from '@/types';
import styles from './ProductParse.module.css';

type Step = 1 | 2 | 3;

const STEP_LABELS: { idx: Step; label: string }[] = [
  { idx: 1, label: '输入商品' },
  { idx: 2, label: 'AI 解析' },
  { idx: 3, label: '生成剧本' },
];

export default function ProductParse() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  // 顶层 /product-parse（无项目上下文）时用占位 id，方便 demo 演示
  const effectiveProjectId = projectId || 'demo-project';

  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<ParsedProduct | null>(null);

  const handleParseUrl = async () => {
    if (!url.trim()) {
      message.warning('请先输入商品链接');
      return;
    }
    setStep(2);
    try {
      const result = await productService.parseUrl({
        project_id: effectiveProjectId,
        url: url.trim(),
      });
      setProduct(result);
      setStep(3);
    } catch {
      setStep(1); // 回退到输入态，让用户重试
    }
  };

  const handleParseImage = async (file: RcFile) => {
    setStep(2);
    try {
      const result = await productService.parseImage(effectiveProjectId, file);
      setProduct(result);
      setStep(3);
    } catch {
      setStep(1);
    }
    return false; // 阻止 Antd 自动上传
  };

  const handleNext = async () => {
    try {
      await productService.confirm(effectiveProjectId);
      message.success('商品信息已确认，进入剧本阶段');
      const target = projectId ? `/projects/${projectId}/script` : '/script-studio';
      navigate(target);
    } catch {
      // 拦截器已 toast
    }
  };

  return (
    <div className={styles.page}>
      {/* Step indicator */}
      <div className={styles.steps}>
        {STEP_LABELS.map((s, idx) => {
          const isActive = step === s.idx;
          const isDone = step > s.idx;
          return (
            <div key={s.idx} className={styles.stepItem}>
              <div className={styles.stepCircleWrap}>
                <div
                  className={`${styles.stepCircle} ${
                    isDone ? styles.stepCircleDone : isActive ? styles.stepCircleActive : ''
                  }`}
                >
                  {isDone ? <CheckOutlined /> : s.idx}
                </div>
                <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`${styles.stepLine} ${step > s.idx ? styles.stepLineDone : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ============ Step 1：输入 ============ */}
      {step === 1 && (
        <>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>开始创作你的爆款视频</h2>

            <div className={styles.urlRow}>
              <Input
                size="large"
                prefix={<LinkOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="粘贴 TikTok / 淘宝 / Amazon 商品链接"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPressEnter={handleParseUrl}
              />
              <button
                type="button"
                className={styles.parseBtn}
                onClick={handleParseUrl}
                disabled={!url.trim()}
              >
                开始解析
              </button>
            </div>

            <div className={styles.orDivider}><span>或</span></div>

            <Upload.Dragger
              name="image"
              multiple={false}
              accept="image/png,image/jpeg,image/webp"
              showUploadList={false}
              beforeUpload={handleParseImage}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
                <CloudUploadOutlined style={{ fontSize: 32, color: '#4648D4' }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 500 }}>
                拖拽商品主图或点击上传
              </p>
              <p
                className="ant-upload-hint"
                style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#9CA3AF',
                  marginTop: 4,
                }}
              >
                支持 JPG, PNG, WEBP · 最大 10MB
              </p>
            </Upload.Dragger>
          </div>

          <p className={styles.emptyHint}>
            暂无商品解析信息，请在上方输入链接或上传图片
          </p>
        </>
      )}

      {/* ============ Step 2：解析中 ============ */}
      {step === 2 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>AI 正在解析中...</h2>
          <p className={styles.cardSubtitle}>通常需要 5-10 秒，请稍候</p>

          <div className={styles.skelHeader}>
            <Skeleton.Node active style={{ width: 128, height: 128, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <Skeleton
                paragraph={{ rows: 3, width: ['60%', '85%', '70%'] }}
                active
                title={{ width: 200 }}
              />
            </div>
          </div>

          <div className={styles.skelBoxes}>
            <Skeleton.Node active style={{ width: '100%', height: 80, borderRadius: 12 }} />
            <Skeleton.Node active style={{ width: '100%', height: 80, borderRadius: 12 }} />
            <Skeleton.Node active style={{ width: '100%', height: 80, borderRadius: 12 }} />
          </div>
        </div>
      )}

      {/* ============ Step 3：结果 ============ */}
      {step === 3 && product && (
        <div className={styles.card}>
          <div className={styles.resultHead}>
            <div className={styles.resultCover}>
              <img src={product.cover_url} alt={product.name} />
            </div>
            <div className={styles.resultInfo}>
              <div className={styles.resultInfoHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 className={styles.resultTitle}>{product.name}</h3>
                  <div className={styles.resultTags}>
                    <Tag color="processing" style={{ margin: 0, borderRadius: 999 }}>
                      {product.category}
                    </Tag>
                    <Tag color="cyan" style={{ margin: 0, borderRadius: 999 }}>2024 新品</Tag>
                  </div>
                  <p className={styles.resultDesc}>
                    经过 AI 视觉 + LLM 综合解析得出的产品定位与卖点摘要。
                  </p>
                </div>
                <div className={styles.resultPrice}>{product.price_anchor}</div>
              </div>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>
                <ThunderboltOutlined /> 核心卖点
              </div>
              <ul className={styles.infoBoxList}>
                {product.selling_points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>
                <TeamOutlined /> 目标人群
              </div>
              <p className={styles.infoBoxText}>{product.target_audience}</p>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoBoxTitle}>
                <EnvironmentOutlined /> 使用场景
              </div>
              <p className={styles.infoBoxText}>{product.usage_scene}</p>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => { setStep(1); setProduct(null); setUrl(''); }}
            >
              ← 重新解析
            </button>
            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              下一步：生成剧本 <ArrowRightOutlined />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

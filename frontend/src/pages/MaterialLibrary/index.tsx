import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Tag, Button, App } from 'antd';
import { UploadOutlined, ThunderboltOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { productService } from '@/services/productService';
import styles from './MaterialLibrary.module.css';

type Step = 'upload' | 'parsing' | 'done';

export default function MaterialLibrary() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [step, setStep] = useState<Step>('upload');
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (file: RcFile) => {
    if (!projectId) { message.warning('请先创建项目'); return false; }
    setPreviewUrl(URL.createObjectURL(file));
    setStep('parsing');
    try {
      const result = await productService.parseImage(projectId, file);
      setProduct(result as unknown as Record<string, unknown>);
      setStep('done');
    } catch {
      message.error('AI 解析失败，请重试');
      setStep('upload');
    }
    return false;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>素材库</h1>
          <p className={styles.subtitle}>上传商品图片或视频，AI 自动解析商品信息</p>
        </div>
      </div>

      {step === 'upload' && (
        <div className={styles.uploadArea}>
          <Upload.Dragger
            name="image"
            multiple={false}
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={handleUpload}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 12 }}>
              <UploadOutlined style={{ fontSize: 40, color: '#4648D4' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600 }}>
              拖拽商品图片到此处或点击上传
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 12, color: '#9CA3AF' }}>
              支持 JPG / PNG / WEBP · 最大 10MB · AI 自动识别商品信息
            </p>
          </Upload.Dragger>
        </div>
      )}

      {step === 'parsing' && (
        <div className={styles.parsingArea}>
          {previewUrl && <img src={previewUrl} alt="" className={styles.preview} />}
          <h3>AI 正在解析商品信息...</h3>
          <p>通过豆包视觉模型识别商品品类、卖点、目标人群</p>
          <div className={styles.spinner} />
        </div>
      )}

      {step === 'done' && product && (
        <div className={styles.resultArea}>
          <div className={styles.resultCard}>
            <div className={styles.resultHead}>
              {previewUrl && <img src={previewUrl} alt="" className={styles.resultCover} />}
              <div>
                <h2 className={styles.resultName}>{product.name as string}</h2>
                <Tag color="processing" style={{ borderRadius: 999 }}>
                  {product.category as string}
                </Tag>
                <p className={styles.resultPrice}>{product.price_anchor as string}</p>
              </div>
            </div>
            <div className={styles.resultGrid}>
              <div className={styles.resultBox}>
                <h4><ThunderboltOutlined /> 核心卖点</h4>
                <ul>
                  {(product.selling_points as string[])?.map((p: string) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div className={styles.resultBox}>
                <h4>目标人群</h4>
                <p>{product.target_audience as string}</p>
              </div>
              <div className={styles.resultBox}>
                <h4>使用场景</h4>
                <p>{product.usage_scene as string}</p>
              </div>
            </div>
            <div className={styles.resultActions}>
              <Button onClick={() => { setStep('upload'); setProduct(null); setPreviewUrl(null); }}>
                重新上传
              </Button>
              <Button type="primary" icon={<ArrowRightOutlined />}
                onClick={() => navigate(projectId ? `/projects/${projectId}/script` : '/script-studio')}
                style={{ borderRadius: 10 }}>
                下一步：生成剧本
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

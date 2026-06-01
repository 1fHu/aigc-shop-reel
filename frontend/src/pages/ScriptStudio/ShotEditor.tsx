import { Input, Select, Tag, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { Scene } from '@/types';
import styles from './ScriptStudio.module.css';

const CAMERA_OPTIONS = [
  { value: 'push-in', label: '缓推镜（Slow Zoom-in）' },
  { value: 'static', label: '固定镜（Static）' },
  { value: 'tracking', label: '跟拍（Tracking）' },
  { value: 'pan', label: '摇镜（Pan）' },
  { value: 'zoom-out', label: '拉远（Zoom-out）' },
  { value: 'handheld', label: '手持（Handheld）' },
];

const BGM_OPTIONS = [
  { value: 'Modern Beat', label: 'Modern Beat' },
  { value: 'Cinematic', label: 'Cinematic' },
  { value: 'Energy Pop', label: 'Energy Pop' },
  { value: 'Lo-Fi Chill', label: 'Lo-Fi Chill' },
  { value: 'Acoustic', label: 'Acoustic' },
];

interface ShotEditorProps {
  scene: Scene | undefined;
  regenerating: boolean;
  onChange: (index: number, field: string, value: string | number) => void;
  onRegenerate: (index: number) => void;
}

export default function ShotEditor({
  scene,
  regenerating,
  onChange,
  onRegenerate,
}: ShotEditorProps) {
  if (!scene) {
    return (
      <div className={styles.editor}>
        <div className={styles.editorInner} style={{ textAlign: 'center', paddingTop: 120, color: '#9CA3AF' }}>
          选择一个分镜开始编辑
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorInner}>
        {/* Header */}
        <div className={styles.editorHead}>
          <div className={styles.editorHeadLeft}>
            <Tag color="blue" style={{ borderRadius: 999 }}>#{String(scene.index + 1).padStart(2, '0')}</Tag>
          </div>
          <button className={styles.regenBtn} onClick={() => onRegenerate(scene.index)} disabled={regenerating}>
            {regenerating ? <Spin size="small" /> : <ReloadOutlined />}
            {' '}重生分镜
          </button>
        </div>

        {/* Preview */}
        <div className={`${styles.previewWrap} ${regenerating ? styles.regenerating : ''}`}>
          <img src={scene.thumb_url} alt={`Scene ${scene.index + 1}`} />
          {regenerating && (
            <div className={styles.regenOverlay}>
              <div className={styles.regenPill}>
                <span className={styles.regenDot} />
                正在按新因子重新生成画面...
              </div>
            </div>
          )}
        </div>

        {/* Prompt / 画面描述 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Prompt · 画面描述</label>
          <Input.TextArea
            rows={3}
            value={scene.description}
            onChange={(e) => onChange(scene.index, 'description', e.target.value)}
          />
        </div>

        {/* Camera + BGM row */}
        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>镜头运动</label>
            <Select
              style={{ width: '100%' }}
              value={scene.camera_motion || 'static'}
              onChange={(v) => onChange(scene.index, 'camera_motion', v)}
              options={CAMERA_OPTIONS}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>BGM</label>
            <Select
              style={{ width: '100%' }}
              value={scene.bgm || 'Modern Beat'}
              onChange={(v) => onChange(scene.index, 'bgm', v)}
              options={BGM_OPTIONS}
            />
          </div>
        </div>

        {/* Voiceover */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>配音文案</label>
          <Input.TextArea
            rows={2}
            value={scene.voiceover}
            onChange={(e) => onChange(scene.index, 'voiceover', e.target.value)}
          />
        </div>

        {/* Subtitle */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>字幕</label>
          <Input
            value={scene.subtitle}
            onChange={(e) => onChange(scene.index, 'subtitle', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

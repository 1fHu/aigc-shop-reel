import { Input, Select, Tag, Spin, Popconfirm } from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
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
  /** 该分镜已生成的视频片段地址；有值时在中央预览位渲染播放器（替代占位图） */
  clipUrl?: string;
  regenerating: boolean;
  /** 重生进行中遮罩文案（区分「按因子重生剧本」与「重新生成分镜视频」） */
  regenLabel?: string;
  onChange: (index: number, field: string, value: string | number) => void;
  onRegenerate: (index: number) => void;
  /** 删除该幕召回到的图片素材（删后回退默认占位图） */
  onDeleteMaterial?: (index: number) => void;
}

export default function ShotEditor({
  scene,
  clipUrl,
  regenerating,
  regenLabel,
  onChange,
  onRegenerate,
  onDeleteMaterial,
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
            {' '}重生剧本
          </button>
        </div>

        {/* Preview：已生成视频则回显该分镜片段播放器，否则用占位图 */}
        <div className={`${styles.previewWrap} ${regenerating ? styles.regenerating : ''}`}>
          {clipUrl ? (
            <video
              key={clipUrl}
              className={styles.previewVideo}
              src={clipUrl}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={scene.thumb_url} alt={`Scene ${scene.index + 1}`} />
          )}
          {/* 召回到素材图（direct/adapted）时，允许删除 → 回退默认占位图 */}
          {!clipUrl && onDeleteMaterial && scene.material_use_mode && scene.material_use_mode !== 'none' && (
            <Popconfirm
              title="删除该幕图片素材？"
              description="删除后将用默认占位图代替"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDeleteMaterial(scene.index)}
            >
              <button type="button" className={styles.materialDeleteBtn} title="删除图片素材">
                <DeleteOutlined />
              </button>
            </Popconfirm>
          )}
          {regenerating && (
            <div className={styles.regenOverlay}>
              <div className={styles.regenPill}>
                <span className={styles.regenDot} />
                {regenLabel || '正在按新因子重新生成画面...'}
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

      </div>
    </div>
  );
}

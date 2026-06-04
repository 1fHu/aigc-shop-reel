import { CheckCircleFilled } from '@ant-design/icons';
import { Select, Switch, Slider, Input } from 'antd';
import type { FactorGroup, FactorState, FactorKey, ScriptHistoryEntry } from '@/types';
import styles from './ScriptStudio.module.css';

const FONT_FAMILIES = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimHei', label: '黑体' },
  { value: 'PingFang SC', label: '苹方' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
];

const PRESET_COLORS = ['#FFFFFF', '#FFD700', '#00FF88', '#FF6B6B', '#64B5F6', '#FF9800'];

interface FactorPanelProps {
  factors: FactorGroup[];
  factorState: FactorState;
  history: ScriptHistoryEntry[];
  applying: boolean;
  onFactorChange: (key: FactorKey, value: string) => void;
  voiceId: string;
  subtitleEnabled: boolean;
  subtitleFontSize: number;
  subtitleOutline: number;
  subtitleColor: string;
  subtitleFontFamily: string;
  customRequirement: string;
  onVoiceChange: (v: string) => void;
  onSubtitleChange: (v: boolean) => void;
  onSubtitleFontSizeChange: (v: number) => void;
  onSubtitleOutlineChange: (v: number) => void;
  onSubtitleColorChange: (v: string) => void;
  onSubtitleFontFamilyChange: (v: string) => void;
  onCustomRequirementChange: (v: string) => void;
}

export default function FactorPanel({
  factors,
  factorState,
  history,
  applying,
  onFactorChange,
  voiceId,
  subtitleEnabled,
  subtitleFontSize,
  subtitleOutline,
  subtitleColor,
  subtitleFontFamily,
  onVoiceChange,
  onSubtitleChange,
  onSubtitleFontSizeChange,
  onSubtitleOutlineChange,
  onSubtitleColorChange,
  onSubtitleFontFamilyChange,
  customRequirement,
  onCustomRequirementChange,
}: FactorPanelProps) {
  return (
    <div className={styles.factors}>
      <div className={styles.colHead}>
        <span className={styles.colTitle}>创作因子</span>
        <span style={{
          fontSize: 11,
          color: applying ? '#F59E0B' : '#10B981',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <CheckCircleFilled style={{ fontSize: 12 }} />
          {applying ? '应用中' : '已应用'}
        </span>
      </div>
      <div className={styles.factorsBody}>
        {factors.map((group) => (
          <div key={group.key} className={styles.factorGroupBlock}>
            <div className={styles.factorGroupLabel}>{group.label}</div>
            <div className={styles.factorChips}>
              {group.options.map((opt) => (
                <button
                  key={opt}
                  className={`${styles.chip} ${factorState[group.key] === opt ? styles.chipActive : ''}`}
                  onClick={() => onFactorChange(group.key, opt)}
                  disabled={applying}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <>
            <div className={styles.factorDivider} />
            <div className={styles.factorGroupLabel}>操作历史</div>
            {history.map((entry) => (
              <div key={entry.id} className={styles.historyEntry}>
                <span className={styles.historyTime}>
                  {new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  <div className={styles.historyMsg}>{entry.message}</div>
                  {entry.affected_scene_ids.length > 0 && (
                    <div className={styles.historyAffected}>
                      affected: {entry.affected_scene_ids.join(' / ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        <div className={styles.factorDivider} />
        <div className={styles.factorGroupLabel}>视频配音</div>
        <div style={{ marginBottom: 12 }}>
          <Select
            value={voiceId}
            onChange={onVoiceChange}
            style={{ width: '100%', marginBottom: 8 }}
            options={[
              { value: 'zh_female_vv_uranus_bigtts', label: 'vivi 2.0' },
              { value: 'zh_female_xiaohe_uranus_bigtts', label: '小何' },
              { value: 'zh_male_taocheng_uranus_bigtts', label: '小天' },
              { value: 'zh_male_m191_uranus_bigtts', label: '云舟' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: '#6B7280', fontSize: 13 }}>字幕</span>
            <Switch size="small" checked={subtitleEnabled} onChange={onSubtitleChange} />
          </div>
          {subtitleEnabled && (
            <>
              <div className={styles.factorGroupLabel} style={{ marginTop: 0 }}>字幕样式</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF' }}>
                  <span>字体大小</span>
                  <span>{subtitleFontSize}px</span>
                </div>
                <Slider
                  min={5} max={60} step={1}
                  value={subtitleFontSize}
                  onChange={onSubtitleFontSizeChange}
                  styles={{ track: { background: '#6366F1' }, handle: { borderColor: '#6366F1' } }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF' }}>
                  <span>描边粗细</span>
                  <span>{subtitleOutline.toFixed(1)}</span>
                </div>
                <Slider
                  min={0} max={5} step={0.5}
                  value={subtitleOutline}
                  onChange={onSubtitleOutlineChange}
                  styles={{ track: { background: '#6366F1' }, handle: { borderColor: '#6366F1' } }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>字体颜色</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onSubtitleColorChange(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: subtitleColor === c ? '3px solid #6366F1' : '2px solid #E5E7EB',
                        background: c, cursor: 'pointer', outline: 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>字体样式</span>
                <Select
                  value={subtitleFontFamily}
                  onChange={onSubtitleFontFamilyChange}
                  style={{ width: '100%', marginTop: 4 }}
                  size="small"
                  options={FONT_FAMILIES}
                />
              </div>
              {/* 参考字幕预览 */}
              <div style={{
                marginBottom: 12, padding: 10, borderRadius: 8,
                background: 'rgba(0,0,0,0.75)',
                textAlign: 'center',
              }}>
                <span style={{
                  fontFamily: subtitleFontFamily,
                  fontSize: subtitleFontSize,
                  color: subtitleColor,
                  textShadow: `0 0 ${subtitleOutline}px rgba(0,0,0,0.8), 0 0 ${subtitleOutline * 1.5}px rgba(0,0,0,0.6)`,
                  fontWeight: 600,
                }}>
                  参考字幕
                </span>
              </div>
            </>
          )}
          <div className={styles.factorDivider} style={{ marginTop: 8 }} />
          <div className={styles.factorGroupLabel}>自定义需求</div>
          <div style={{ marginBottom: 12 }}>
            <Input.TextArea
              value={customRequirement}
              onChange={(e) => onCustomRequirementChange(e.target.value)}
              placeholder="描述你对视频整体的额外要求，如风格、色调、节奏、特效等…"
              rows={3}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { CheckCircleFilled } from '@ant-design/icons';
import { Select, Switch, Slider, Input } from 'antd';
import type { FactorGroup, FactorState, FactorKey, ScriptHistoryEntry } from '@/types';
import styles from './ScriptStudio.module.css';

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
  customRequirement: string;
  onVoiceChange: (v: string) => void;
  onSubtitleChange: (v: boolean) => void;
  onSubtitleFontSizeChange: (v: number) => void;
  onSubtitleOutlineChange: (v: number) => void;
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
  onVoiceChange,
  onSubtitleChange,
  onSubtitleFontSizeChange,
  onSubtitleOutlineChange,
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
                  min={20} max={72} step={2}
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
            </>
          )}
          <div className={styles.factorDivider} />
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

import { CheckCircleFilled } from '@ant-design/icons';
import type { FactorGroup, FactorState, FactorKey, ScriptHistoryEntry } from '@/types';
import styles from './ScriptStudio.module.css';

interface FactorPanelProps {
  factors: FactorGroup[];
  factorState: FactorState;
  history: ScriptHistoryEntry[];
  applying: boolean;
  onFactorChange: (key: FactorKey, value: string) => void;
}

export default function FactorPanel({
  factors,
  factorState,
  history,
  applying,
  onFactorChange,
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
      </div>
    </div>
  );
}

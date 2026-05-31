import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Scene } from '@/types';
import styles from './ScriptStudio.module.css';

interface ShotTimelineProps {
  scenes: Scene[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
}

export default function ShotTimeline({
  scenes,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
}: ShotTimelineProps) {
  return (
    <div className={styles.timeline}>
      <div className={styles.colHead}>
        <span className={styles.colTitle}>分镜时间轴</span>
        <PlusOutlined style={{ cursor: 'pointer', color: '#4648D4' }} onClick={onAdd} />
      </div>
      <div className={styles.timelineList}>
        {scenes.map((scene) => (
          <div
            key={scene.index}
            className={`${styles.sceneCard} ${selectedIndex === scene.index ? styles.sceneCardActive : ''}`}
            onClick={() => onSelect(scene.index)}
          >
            <div className={styles.sceneCardHead}>
              <span className={styles.sceneCardLabel}>#{String(scene.index + 1).padStart(2, '0')} SCENE</span>
              <div className={styles.sceneCardActions}>
                <span className={styles.sceneCardDuration}>{scene.duration || 3}s</span>
                <button
                  className={`${styles.sceneCardIcon} ${styles.sceneCardIconDanger}`}
                  onClick={(e) => { e.stopPropagation(); onDelete(scene.index); }}
                  aria-label="删除分镜"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </div>
            <img className={styles.sceneCardThumb} src={scene.thumb_url} alt={`Scene ${scene.index + 1}`} />
            <p className={styles.sceneCardDesc}>{scene.description}</p>
          </div>
        ))}
        <button className={styles.addSceneBtn} onClick={onAdd}>
          <PlusOutlined /> 添加分镜
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { UploadOutlined, DownOutlined, CloseOutlined } from '@ant-design/icons';

import styles from './MaterialLibrary.module.css';

type MaterialType = 'image' | 'video';
type MaterialTagVariant = 'ready' | 'product' | 'default';

type MaterialItem = {
  id: string;
  type: MaterialType;
  name: string;
  cover: string;
  tag?: { text: string; variant: MaterialTagVariant };
  duration?: string;
  time: string;
  meta: string;
  resolution: string;
  size: string;
  aiTags: string[];
};

const MATERIALS: MaterialItem[] = [
  {
    id: 'm1',
    type: 'video',
    name: 'Futuristic Watch Cinematic',
    cover: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop',
    tag: { text: 'TIKTOK READY', variant: 'ready' },
    duration: '0:15',
    time: '3 hours ago',
    meta: 'MP4 · 32 MB',
    resolution: '3840 × 2160 (4K)',
    size: '42.8 MB',
    aiTags: ['#luxury_tech', '#automatic', '#4k_lens'],
  },
  {
    id: 'm2',
    type: 'image',
    name: 'Minimalist Sneaker Base',
    cover: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',
    tag: { text: 'PRODUCT', variant: 'product' },
    time: '1 day ago',
    meta: 'PNG · 3.4 MB',
    resolution: '3200 × 4000',
    size: '3.4 MB',
    aiTags: ['#product_shot', '#minimal', '#studio_light'],
  },
  {
    id: 'm3',
    type: 'image',
    name: 'Skincare Set Textures',
    cover: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=500&fit=crop',
    time: '5 days ago',
    meta: 'JPG · 1.1 MB',
    resolution: '2800 × 3600',
    size: '1.1 MB',
    aiTags: ['#skincare', '#soft_light', '#clean_aesthetic'],
  },
  {
    id: 'm4',
    type: 'image',
    name: 'Athletic Performance Shoe',
    cover: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',
    time: '1 week ago',
    meta: 'PNG · 2.7 MB',
    resolution: '3000 × 3800',
    size: '2.7 MB',
    aiTags: ['#sport', '#high_contrast', '#action_pose'],
  },
  {
    id: 'm5',
    type: 'video',
    name: 'Kitchen Cooking Scene',
    cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=500&fit=crop',
    duration: '0:22',
    time: '1 week ago',
    meta: 'MP4 · 18 MB',
    resolution: '1920 × 1080',
    size: '18 MB',
    aiTags: ['#food', '#warm_tone', '#slow_motion'],
  },
  {
    id: 'm6',
    type: 'image',
    name: 'Urban Outfit Pose',
    cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop',
    time: '2 weeks ago',
    meta: 'JPG · 2.3 MB',
    resolution: '2800 × 4200',
    size: '2.3 MB',
    aiTags: ['#street_style', '#editorial', '#city_light'],
  },
];

const FILTER_TAGS = [
  { text: '#TikTok_Ready', variant: 'info' },
  { text: '#iPad_Cute', variant: 'draft' },
  { text: '#Manual', variant: 'draft' },
];

export default function MaterialLibrary() {
  const [materialType, setMaterialType] = useState<'all' | MaterialType>('all');
  const [activeMaterial, setActiveMaterial] = useState<MaterialItem | null>(null);

  const filteredMaterials = useMemo(() => {
    if (materialType === 'all') return MATERIALS;
    return MATERIALS.filter((m) => m.type === materialType);
  }, [materialType]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>素材库</h1>
          <p className={styles.subtitle}>管理你的所有商品图、视频和参考素材</p>
        </div>
        <button type="button" className={styles.uploadBtn}>
          <UploadOutlined /> 上传素材
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.typeTabs}>
          {[
            { key: 'all', label: '全部' },
            { key: 'image', label: '图片' },
            { key: 'video', label: '视频' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`${styles.typeTab} ${materialType === tab.key ? styles.typeTabActive : ''}`}
              onClick={() => setMaterialType(tab.key as 'all' | MaterialType)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.sortBtn}>
          排序：最近添加 <DownOutlined style={{ fontSize: 10 }} />
        </button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <div className={styles.sectionLabel}>上传时间</div>
            <label className={styles.filterOption}>
              <input type="radio" name="time" defaultChecked /> 最近 7 天
            </label>
            <label className={styles.filterOption}>
              <input type="radio" name="time" /> 本月
            </label>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.sectionLabel}>标签</div>
            <div className={styles.tagList}>
              {FILTER_TAGS.map((tag) => (
                <span
                  key={tag.text}
                  className={`${styles.tagPill} ${tag.variant === 'info' ? styles.tagInfo : styles.tagDraft}`}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.grid}>
          {filteredMaterials.map((m) => (
            <div key={m.id} className={styles.card} onClick={() => setActiveMaterial(m)}>
              <div className={styles.cover}>
                <img src={m.cover} alt={m.name} />
                {m.tag && (
                  <span
                    className={`${styles.cardTag} ${
                      m.tag.variant === 'ready'
                        ? styles.cardTagReady
                        : m.tag.variant === 'product'
                        ? styles.cardTagProduct
                        : ''
                    }`}
                  >
                    {m.tag.text}
                  </span>
                )}
                {m.type === 'video' && m.duration && (
                  <span className={styles.duration}>{m.duration}</span>
                )}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{m.name}</div>
                <div className={styles.cardMeta}>
                  <span>{m.time}</span>
                  <span className={styles.mono}>{m.meta}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>

      {activeMaterial && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setActiveMaterial(null)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true">
            <div className={styles.drawerHeader}>
              <h2 className={styles.drawerTitle}>Asset Details</h2>
              <button type="button" className={styles.drawerClose} onClick={() => setActiveMaterial(null)}>
                <CloseOutlined />
              </button>
            </div>

            <div className={styles.drawerImage}>
              <img src={activeMaterial.cover} alt={activeMaterial.name} />
            </div>

            <div className={styles.sectionLabel}>ASSET NAME</div>
            <div className={styles.cardTitle} style={{ fontSize: 16, marginBottom: 12 }}>
              {activeMaterial.name}
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <div className={styles.detailLabel}>RESOLUTION</div>
                <div className={styles.detailValue}>{activeMaterial.resolution}</div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailLabel}>SIZE</div>
                <div className={styles.detailValue}>{activeMaterial.size}</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>AI-GENERATED TAGS</div>
            <div className={styles.tagList} style={{ marginBottom: 20 }}>
              {activeMaterial.aiTags.map((tag) => (
                <span key={tag} className={`${styles.tagPill} ${styles.tagDraft}`}>
                  {tag}
                </span>
              ))}
            </div>

            <button type="button" className={styles.primaryBtn}>Use in Project</button>
          </aside>
        </>
      )}
    </div>
  );
}

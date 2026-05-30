import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, App, Modal } from 'antd';
import { UploadOutlined, DownOutlined, CloseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { productService } from '@/services/productService';
import styles from './MaterialLibrary.module.css';

type MaterialType = 'all' | 'image' | 'video';

type MaterialItem = {
  id: string;
  type: 'image' | 'video';
  name: string;
  cover: string;
  tag?: string;
  duration?: string;
  time: string;
  fileSize: string;
  fileType: string;
  category?: string;
  sellingPoints?: string[];
  targetAudience?: string;
  usageScene?: string;
  priceAnchor?: string;
  status: 'parsing' | 'ready' | 'failed';
};

export default function MaterialLibrary() {
  const { id: pid } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [mtype, setMtype] = useState<MaterialType>('all');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [active, setActive] = useState<MaterialItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => mtype === 'all' ? materials : materials.filter((m) => m.type === mtype), [materials, mtype]);

  const handleUpload = async (file: RcFile) => {
    if (!pid) { message.warning('请先创建项目'); return false; }
    const objectUrl = URL.createObjectURL(file);
    const newId = `up-${Date.now()}`;
    const newItem: MaterialItem = {
      id: newId, type: 'image', name: file.name, cover: objectUrl,
      time: '刚刚', fileSize: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '未知',
      fileType: file.type || 'image/jpeg', status: 'parsing',
    };
    setMaterials((prev) => [newItem, ...prev]);
    setUploadOpen(false);
    message.success('素材上传成功，AI 正在后台解析...');
    try {
      const r = await productService.parseImage(pid, file);
      const p = r as any;
      setMaterials((prev) => prev.map((m) => m.id === newId ? {
        ...m, status: 'ready' as const, name: p.name || m.name,
        category: p.category, sellingPoints: p.selling_points,
        targetAudience: p.target_audience, usageScene: p.usage_scene,
        priceAnchor: p.price_anchor, tag: 'PRODUCT',
      } : m));
    } catch {
      setMaterials((prev) => prev.map((m) => m.id === newId ? { ...m, status: 'failed' as const } : m));
    }
    return false;
  };

  const handleGenerateVideo = () => {
    if (!pid) { message.warning('请先创建项目'); return; }
    const ready = materials.filter((m) => m.status === 'ready');
    if (ready.length === 0) { message.warning('请先上传并完成商品解析'); return; }
    navigate(`/projects/${pid}/script`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>素材库</h1><p className={styles.subtitle}>上传商品图片，AI 自动解析并生成视频素材</p></div>
        <button className={styles.uploadBtn} onClick={() => setUploadOpen(true)}><UploadOutlined /> 上传素材</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.typeTabs}>
          {(['all','image','video'] as const).map((t)=>(<button key={t} className={`${styles.typeTab} ${mtype===t?styles.typeTabActive:''}`} onClick={()=>setMtype(t)}>{t==='all'?'全部':t==='image'?'图片':'视频'}</button>))}
        </div>
        <button className={styles.sortBtn}>排序：最近添加 <DownOutlined style={{fontSize:10}}/></button>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.filterBox}><div className={styles.sectionLabel}>上传时间</div>
            <label className={styles.filterOption}><input type="radio" name="time" defaultChecked/> 最近 7 天</label>
            <label className={styles.filterOption}><input type="radio" name="time"/> 本月</label>
          </div>
        </aside>

        <section className={styles.grid}>
          {filtered.length === 0 && (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:60,color:'#9CA3AF'}}>
              <UploadOutlined style={{fontSize:40,marginBottom:12,display:'block'}}/>
              <p>暂无素材，点击右上角"上传素材"开始</p>
            </div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className={styles.card} onClick={() => setActive(m)}>
              <div className={styles.cover}>
                <img src={m.cover} alt={m.name}/>
                {m.tag && <span className={`${styles.cardTag} ${m.tag==='TIKTOK READY'?styles.cardTagReady:styles.cardTagProduct}`}>{m.tag}</span>}
                {m.status==='parsing' && <span className={styles.parsingBadge}>解析中</span>}
                {m.status==='failed' && <span className={styles.failedBadge}>失败</span>}
                {m.duration && <span className={styles.duration}>{m.duration}</span>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{m.name}</div>
                {m.category && <div style={{fontSize:11,color:'#4648D4',marginTop:2}}>{m.category}</div>}
                <div className={styles.cardMeta}><span>{m.time}</span><span className={styles.mono}>{m.fileSize}</span></div>
              </div>
            </div>
          ))}
        </section>
      </div>

      {active && (<>
        <div className={styles.drawerBackdrop} onClick={()=>setActive(null)}/>
        <aside className={styles.drawer}>
          <div className={styles.drawerHeader}><h2 className={styles.drawerTitle}>素材详情</h2><button className={styles.drawerClose} onClick={()=>setActive(null)}><CloseOutlined/></button></div>
          <div className={styles.drawerImage}><img src={active.cover} alt={active.name}/></div>
          <div className={styles.sectionLabel}>素材名称</div><div style={{fontSize:16,fontWeight:500,marginBottom:12}}>{active.name}</div>
          <div className={styles.detailGrid}>
            <div className={styles.detailCard}><div className={styles.detailLabel}>品类</div><div className={styles.detailValue}>{active.category||'--'}</div></div>
            <div className={styles.detailCard}><div className={styles.detailLabel}>状态</div><div className={styles.detailValue}>{active.status}</div></div>
            <div className={styles.detailCard}><div className={styles.detailLabel}>文件大小</div><div className={styles.detailValue}>{active.fileSize}</div></div>
            <div className={styles.detailCard}><div className={styles.detailLabel}>文件类型</div><div className={styles.detailValue}>{active.fileType}</div></div>
          </div>
          {active.sellingPoints && active.sellingPoints.length > 0 && (
            <div style={{marginTop:16}}><div className={styles.sectionLabel}>核心卖点</div><ul style={{margin:'8px 0 0',paddingLeft:16,fontSize:13,color:'#6B7280',lineHeight:1.8}}>{active.sellingPoints.map((p:string)=><li key={p}>{p}</li>)}</ul></div>
          )}
          {active.targetAudience && <div style={{marginTop:16}}><div className={styles.sectionLabel}>目标人群</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.targetAudience}</div></div>}
          {active.usageScene && <div style={{marginTop:16}}><div className={styles.sectionLabel}>使用场景</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.usageScene}</div></div>}
          {active.priceAnchor && <div style={{marginTop:16}}><div className={styles.sectionLabel}>价格锚点</div><div style={{fontSize:13,color:'#4648D4',fontWeight:600,marginTop:4}}>{active.priceAnchor}</div></div>}
        </aside>
      </>)}

      <Modal open={uploadOpen} onCancel={() => setUploadOpen(false)} footer={null} width={480} destroyOnClose title="上传素材">
        <div style={{textAlign:'center',padding:'16px 0'}}>
          <Upload.Dragger name="image" multiple={false} accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
            <p className="ant-upload-drag-icon"><UploadOutlined style={{fontSize:36,color:'#4648D4'}}/></p>
            <p style={{fontSize:15,fontWeight:600}}>拖拽商品图片或点击上传</p>
            <p style={{fontSize:12,color:'#9CA3AF'}}>支持 JPG/PNG/WEBP · 最大 10MB</p>
          </Upload.Dragger>
        </div>
      </Modal>

      <button type="button" className={styles.fab} onClick={handleGenerateVideo} title="生成视频">
        <ThunderboltOutlined style={{fontSize:22}}/>
        <span>生成视频</span>
      </button>
    </div>
  );
}

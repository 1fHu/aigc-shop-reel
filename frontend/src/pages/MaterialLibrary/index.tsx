import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Button, App, Tag, Modal } from 'antd';
import { UploadOutlined, DownOutlined, CloseOutlined, ThunderboltOutlined, TeamOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { productService } from '@/services/productService';
import styles from './MaterialLibrary.module.css';

type MaterialType = 'all' | 'image' | 'video';
type Step = 'idle' | 'parsing' | 'done';

type MaterialItem = {
  id: string; type: 'image' | 'video'; name: string; cover: string;
  tag?: string; duration?: string; time: string; meta: string;
};

const MOCK: MaterialItem[] = [
  { id:'m1',type:'video',name:'Futuristic Watch Cinematic',cover:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop',tag:'TIKTOK READY',duration:'0:15',time:'3 hours ago',meta:'MP4 · 32 MB' },
  { id:'m2',type:'image',name:'Minimalist Sneaker Base',cover:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',tag:'PRODUCT',time:'1 day ago',meta:'PNG · 3.4 MB' },
  { id:'m3',type:'image',name:'Skincare Set Textures',cover:'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=500&fit=crop',time:'5 days ago',meta:'JPG · 1.1 MB' },
  { id:'m4',type:'image',name:'Athletic Performance Shoe',cover:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',time:'1 week ago',meta:'PNG · 2.7 MB' },
  { id:'m5',type:'video',name:'Kitchen Cooking Scene',cover:'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=500&fit=crop',duration:'0:22',time:'1 week ago',meta:'MP4 · 18 MB' },
  { id:'m6',type:'image',name:'Urban Outfit Pose',cover:'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop',time:'2 weeks ago',meta:'JPG · 2.3 MB' },
];

export default function MaterialLibrary() {
  const { id: pid } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [mtype, setMtype] = useState<MaterialType>('all');
  const [active, setActive] = useState<MaterialItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);

  const filtered = useMemo(() => mtype === 'all' ? MOCK : MOCK.filter((m) => m.type === mtype), [mtype]);

  const handleUpload = async (file: RcFile) => {
    if (!pid) { message.warning('请先创建项目'); return false; }
    setPreview(URL.createObjectURL(file)); setStep('parsing');
    try { const r = await productService.parseImage(pid, file); setProduct(r as any); setStep('done'); }
    catch { message.error('AI 解析失败'); setStep('idle'); }
    return false;
  };

  const closeUpload = () => { setUploadOpen(false); setStep('idle'); setProduct(null); setPreview(null); };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>素材库</h1><p className={styles.subtitle}>管理你的所有商品图、视频和参考素材</p></div>
        <button className={styles.uploadBtn} onClick={() => {setStep('idle');setProduct(null);setPreview(null);setUploadOpen(true)}}><UploadOutlined /> 上传素材</button>
      </div>
      <div className={styles.filters}>
        <div className={styles.typeTabs}>
          {(['all','image','video'] as const).map((t)=>(<button key={t} className={`${styles.typeTab} ${mtype===t?styles.typeTabActive:''}`} onClick={()=>setMtype(t)}>{t==='all'?'全部':t==='image'?'图片':'视频'}</button>))}
        </div>
        <button className={styles.sortBtn}>排序：最近添加 <DownOutlined style={{fontSize:10}}/></button>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.filterBox}><div className={styles.sectionLabel}>资源类型</div>
            <label className={styles.filterOption}><input type="checkbox" defaultChecked/> 实拍视频 <span>14</span></label>
            <label className={styles.filterOption}><input type="checkbox"/> AI 生成 <span>28</span></label>
            <label className={styles.filterOption}><input type="checkbox"/> 产品图像 <span>12</span></label>
          </div>
          <div className={styles.filterBox}><div className={styles.sectionLabel}>上传时间</div>
            <label className={styles.filterOption}><input type="radio" name="time" defaultChecked/> 最近 7 天</label>
            <label className={styles.filterOption}><input type="radio" name="time"/> 本月</label>
          </div>
          <div className={styles.filterBox}><div className={styles.sectionLabel}>标签</div>
            <div className={styles.tagList}>{['#TikTok_Ready','#iPad_Cute','#Manual'].map(t=><span key={t} className={`${styles.tagPill} ${t==='#TikTok_Ready'?styles.tagInfo:styles.tagDraft}`}>{t}</span>)}</div>
          </div>
        </aside>
        <section className={styles.grid}>
          {filtered.map((m) => (
            <div key={m.id} className={styles.card} onClick={() => setActive(m)}>
              <div className={styles.cover}>
                <img src={m.cover} alt={m.name}/>
                {m.tag && <span className={`${styles.cardTag} ${m.tag==='TIKTOK READY'?styles.cardTagReady:styles.cardTagProduct}`}>{m.tag}</span>}
                {m.duration && <span className={styles.duration}>{m.duration}</span>}
              </div>
              <div className={styles.cardBody}><div className={styles.cardTitle}>{m.name}</div><div className={styles.cardMeta}><span>{m.time}</span><span className={styles.mono}>{m.meta}</span></div></div>
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
          <div className={styles.detailGrid}><div className={styles.detailCard}><div className={styles.detailLabel}>格式</div><div className={styles.detailValue}>{active.meta}</div></div><div className={styles.detailCard}><div className={styles.detailLabel}>时长</div><div className={styles.detailValue}>{active.duration||'--'}</div></div></div>
        </aside>
      </>)}

      <Modal open={uploadOpen} onCancel={closeUpload} footer={null} width={560} destroyOnClose>
        {step==='idle' && (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <Upload.Dragger name="image" multiple={false} accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
              <p className="ant-upload-drag-icon"><UploadOutlined style={{fontSize:36,color:'#4648D4'}}/></p>
              <p style={{fontSize:15,fontWeight:600}}>拖拽商品图片或点击上传</p>
              <p style={{fontSize:12,color:'#9CA3AF'}}>支持 JPG/PNG/WEBP · 最大 10MB</p>
            </Upload.Dragger>
          </div>
        )}
        {step==='parsing' && (
  <div style={{textAlign:'center',padding:32}}>
    {preview ? <img src={preview} alt="" style={{width:140,height:140,objectFit:'cover',borderRadius:12}}/> : null}
    <h3 style={{marginTop:16}}>AI 正在解析...</h3>
    <p style={{color:'#6B7280'}}>通过豆包视觉模型识别商品信息</p>
  </div>
)}
        {step==='done' && product && (
          <div>
            <div style={{display:'flex',gap:16,marginBottom:20}}>{preview ? <img src={preview} alt="" style={{width:120,height:120,borderRadius:12,objectFit:'cover',flexShrink:0}}/> : null}<div><h3 style={{margin:0,fontFamily:'Geist',fontSize:18}}>{product.name as string}</h3><Tag color="processing" style={{borderRadius:999,marginTop:8}}>{product.category as string}</Tag><p style={{fontWeight:600,color:'#4648D4',margin:'8px 0 0'}}>{product.price_anchor as string}</p></div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              <div style={{background:'#F8FAFC',borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600}}><ThunderboltOutlined/> 核心卖点</div><ul style={{margin:'8px 0 0',paddingLeft:16,fontSize:12,color:'#6B7280'}}>{(product.selling_points as string[])?.map((p:string)=><li key={p}>{p}</li>)}</ul></div>
              <div style={{background:'#F8FAFC',borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600}}><TeamOutlined/> 目标人群</div><p style={{fontSize:12,color:'#6B7280',margin:'8px 0 0'}}>{product.target_audience as string}</p></div>
              <div style={{background:'#F8FAFC',borderRadius:10,padding:12}}><div style={{fontSize:12,fontWeight:600}}><EnvironmentOutlined/> 使用场景</div><p style={{fontSize:12,color:'#6B7280',margin:'8px 0 0'}}>{product.usage_scene as string}</p></div>
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}><Button onClick={closeUpload}>关闭</Button><Button type="primary" icon={<ArrowRightOutlined/>} onClick={()=>{closeUpload();navigate(pid?`/projects/${pid}/script`:'/script-studio');}} style={{borderRadius:10}}>下一步：生成剧本</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

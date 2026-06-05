import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, App, Modal } from 'antd';
import { UploadOutlined, DownOutlined, CloseOutlined, ThunderboltOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { productService } from '@/services/productService';
import { materialService } from '@/services/materialService';
import type { MaterialListItem, ParsedProduct } from '@/types';
import ManualProductFormModal from '@/components/ManualProductFormModal';
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
  // 普通素材字段（来自素材 AI 分析）
  description?: string;
  quality?: string;
  suitableFor?: string;
  tags?: string[];
  // 商品主图字段（来自 product.parseImage 顺带建的那条素材）
  category?: string;
  sellingPoints?: string[];
  targetAudience?: string;
  usageScene?: string;
  priceAnchor?: string;
  status: 'parsing' | 'ready' | 'failed';
};

function toMaterialItem(m: MaterialListItem): MaterialItem {
  const a = m.analysis || {};
  // 商品主图素材带 selling_points，普通素材没有——据此区分两类卡片展示
  const isProduct = Array.isArray(a.selling_points);
  return {
    id: m.id,
    type: m.file_type,
    // 标题：普通素材用 AI 概括的「主要内容」(summary)；商品主图用商品名(name)；都没有回退文件名
    name: (a.summary as string) || (a.name as string) || m.file_name || '未命名',
    cover: (a.cover_url as string) || m.thumbnail_url || '',
    tag: isProduct ? 'PRODUCT' : undefined,
    duration: m.duration ? `${Math.round(m.duration)}s` : undefined,
    time: m.created_at ? new Date(m.created_at).toLocaleDateString('zh-CN') : '',
    fileSize: m.file_size ? `${(m.file_size / 1024 / 1024).toFixed(1)} MB` : '未知',
    fileType: m.file_type === 'video' ? 'video/mp4' : 'image/jpeg',
    description: a.description as string,
    quality: a.quality as string,
    suitableFor: a.suitable_for as string,
    tags: m.tags,
    category: a.category as string,
    sellingPoints: a.selling_points as string[],
    targetAudience: a.target_audience as string,
    usageScene: a.usage_scene as string,
    priceAnchor: a.price_anchor as string,
    status: m.status as 'parsing' | 'ready' | 'failed',
  };
}

export default function MaterialLibrary() {
  const { id: pid } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [mtype, setMtype] = useState<MaterialType>('all');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [active, setActive] = useState<MaterialItem | null>(null);
  // 上传弹窗模式：'cover' = 商品主图（parseImage），'material' = 普通素材（materialService.upload），null = 关闭
  const [uploadMode, setUploadMode] = useState<'cover' | 'material' | null>(null);
  // 是否已有商品主图：决定头部按钮显示「上传商品主图」还是「上传素材」
  const [hasCover, setHasCover] = useState(false);
  // 当前商品信息（用于「编辑商品信息」Modal 的初值）；无主图时为 null
  const [product, setProduct] = useState<ParsedProduct | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const loadMaterials = async () => {
    if (!pid) return;
    try {
      const items = await materialService.list(pid);
      setMaterials(items.map(toMaterialItem));
    } catch {
      // 拦截器已统一 toast
    }
  };

  const loadProduct = async () => {
    if (!pid) return;
    try {
      const p = await productService.get(pid);
      setHasCover(!!p.cover_url);
      setProduct(p.name ? p : null);
    } catch {
      // 项目必然存在（已在素材页），失败仅当作"暂无主图"，不额外提示
    }
  };

  // 上传素材后异步解析，轮询列表直到没有 parsing（最多 ~60s）
  const pollUntilReady = async () => {
    if (!pid || pollingRef.current) return;
    pollingRef.current = true;
    try {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const items = await materialService.list(pid);
        setMaterials(items.map(toMaterialItem));
        if (!items.some((m) => m.status === 'parsing')) break;
      }
    } catch {
      // 拦截器已统一 toast
    } finally {
      pollingRef.current = false;
    }
  };

  useEffect(() => { loadMaterials(); loadProduct(); }, [pid]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const filtered = useMemo(() => mtype === 'all' ? materials : materials.filter((m) => m.type === mtype), [materials, mtype]);

  // 上传商品主图：走同步的 parseImage，解析完刷新主图状态 + 素材列表
  const handleCoverUpload = async (file: RcFile) => {
    if (!pid) { message.warning('请先创建项目'); return false; }
    setUploadMode(null);
    message.loading({ content: 'AI 正在解析商品主图...', key: 'upload', duration: 0 });
    try {
      await productService.parseImage(pid, file);
      message.success({ content: '商品主图解析完成', key: 'upload' });
      await loadProduct();
      await loadMaterials();
    } catch {
      message.error({ content: 'AI 解析失败，请重试', key: 'upload' });
    }
    return false;
  };

  // 上传普通素材（图片 + 视频，多文件）：走异步的 materials/upload，上传后轮询解析状态。
  // multiple 模式下 beforeUpload 每个文件触发一次，只在最后一个文件时整批上传
  const handleMaterialUpload = async (file: RcFile, fileList: RcFile[]) => {
    if (file !== fileList[fileList.length - 1]) return false;
    if (!pid) { message.warning('请先创建项目'); return false; }
    setUploadMode(null);
    message.loading({ content: `正在上传 ${fileList.length} 个素材...`, key: 'upload', duration: 0 });
    try {
      await materialService.upload(pid, fileList);
      message.success({ content: '上传成功，AI 正在后台解析', key: 'upload' });
      await loadMaterials();
      pollUntilReady();
    } catch {
      message.error({ content: '上传失败，请重试', key: 'upload' });
    }
    return false;
  };

  const handleGenerateVideo = () => {
    if (!pid) { message.warning('请先创建项目'); return; }
    const ready = materials.filter((m) => m.status === 'ready');
    if (ready.length === 0) { message.warning('请先上传并完成商品解析'); return; }
    navigate(`/projects/${pid}/script`);
  };

  const handleDelete = (item: MaterialItem) => {
    modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除素材「${item.name}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeletingId(item.id);
        try {
          await materialService.delete(item.id);
          setMaterials((prev) => prev.filter((m) => m.id !== item.id));
          if (active?.id === item.id) setActive(null);
          message.success('素材已删除');
        } catch {
          // 拦截器已统一 toast
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.title}>素材库</h1><p className={styles.subtitle}>上传商品图片，AI 自动解析并生成视频素材</p></div>
        <div className={styles.headerActions}>
          {hasCover && (
            <button className={styles.editBtn} onClick={() => setEditOpen(true)}>
              <EditOutlined /> 编辑商品信息
            </button>
          )}
          <button className={styles.uploadBtn} onClick={() => setUploadMode(hasCover ? 'material' : 'cover')}>
            <UploadOutlined /> {hasCover ? '上传素材' : '上传商品主图'}
          </button>
        </div>
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
              <p>{hasCover ? '暂无素材，点击右上角"上传素材"开始' : '请先点击右上角"上传商品主图"'}</p>
            </div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className={styles.card} onClick={() => setActive(m)}>
              <div className={styles.cover}>
                <img src={m.cover} alt={m.name}/>
                <button
                  className={styles.deleteBtn}
                  disabled={deletingId === m.id}
                  onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                  title="删除素材"
                >
                  <DeleteOutlined />
                </button>
                {m.tag && <span className={`${styles.cardTag} ${m.tag==='TIKTOK READY'?styles.cardTagReady:styles.cardTagProduct}`}>{m.tag}</span>}
                {m.status==='parsing' && <span className={styles.parsingBadge}>解析中</span>}
                {m.status==='failed' && <span className={styles.failedBadge}>失败</span>}
                {m.duration && <span className={styles.duration}>{m.duration}</span>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{m.name}</div>
                {m.category
                  ? <div style={{fontSize:11,color:'#4648D4',marginTop:2}}>{m.category}</div>
                  : m.description && <div style={{fontSize:11,color:'#9CA3AF',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.description}</div>}
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
            {active.category && <div className={styles.detailCard}><div className={styles.detailLabel}>品类</div><div className={styles.detailValue}>{active.category}</div></div>}
            {active.quality && <div className={styles.detailCard}><div className={styles.detailLabel}>画质</div><div className={styles.detailValue}>{active.quality}</div></div>}
            <div className={styles.detailCard}><div className={styles.detailLabel}>状态</div><div className={styles.detailValue}>{active.status}</div></div>
            <div className={styles.detailCard}><div className={styles.detailLabel}>文件大小</div><div className={styles.detailValue}>{active.fileSize}</div></div>
            <div className={styles.detailCard}><div className={styles.detailLabel}>文件类型</div><div className={styles.detailValue}>{active.fileType}</div></div>
          </div>
          {active.description && <div style={{marginTop:16}}><div className={styles.sectionLabel}>内容描述</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.description}</div></div>}
          {active.tags && active.tags.length > 0 && (
            <div style={{marginTop:16}}><div className={styles.sectionLabel}>标签</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                {active.tags.map((t)=><span key={t} style={{fontSize:12,color:'#4648D4',background:'#F5F5FF',border:'1px solid #E0E0FF',borderRadius:999,padding:'2px 10px'}}>{t}</span>)}
              </div>
            </div>
          )}
          {active.suitableFor && <div style={{marginTop:16}}><div className={styles.sectionLabel}>适用场景</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.suitableFor}</div></div>}
          {active.sellingPoints && active.sellingPoints.length > 0 && (
            <div style={{marginTop:16}}><div className={styles.sectionLabel}>核心卖点</div><ul style={{margin:'8px 0 0',paddingLeft:16,fontSize:13,color:'#6B7280',lineHeight:1.8}}>{active.sellingPoints.map((p:string)=><li key={p}>{p}</li>)}</ul></div>
          )}
          {active.targetAudience && <div style={{marginTop:16}}><div className={styles.sectionLabel}>目标人群</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.targetAudience}</div></div>}
          {active.usageScene && <div style={{marginTop:16}}><div className={styles.sectionLabel}>使用场景</div><div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{active.usageScene}</div></div>}
          {active.priceAnchor && <div style={{marginTop:16}}><div className={styles.sectionLabel}>价格锚点</div><div style={{fontSize:13,color:'#4648D4',fontWeight:600,marginTop:4}}>{active.priceAnchor}</div></div>}

          <button
            className={styles.drawerDeleteBtn}
            disabled={deletingId === active.id}
            onClick={() => handleDelete(active)}
          >
            <DeleteOutlined /> 删除素材
          </button>
        </aside>
      </>)}

      <Modal open={uploadMode !== null} onCancel={() => setUploadMode(null)} footer={null} width={480} destroyOnClose title={uploadMode === 'cover' ? '上传商品主图' : '上传素材'}>
        <div style={{textAlign:'center',padding:'16px 0'}}>
          {uploadMode === 'cover' ? (
            <Upload.Dragger name="image" multiple={false} accept="image/*" showUploadList={false} beforeUpload={handleCoverUpload}>
              <p className="ant-upload-drag-icon"><UploadOutlined style={{fontSize:36,color:'#4648D4'}}/></p>
              <p style={{fontSize:15,fontWeight:600}}>拖拽商品主图或点击上传</p>
              <p style={{fontSize:12,color:'#9CA3AF'}}>支持 JPG/PNG/WEBP · AI 自动解析商品信息</p>
            </Upload.Dragger>
          ) : (
            <Upload.Dragger name="files" multiple accept="image/*,video/*" showUploadList={false} beforeUpload={handleMaterialUpload}>
              <p className="ant-upload-drag-icon"><UploadOutlined style={{fontSize:36,color:'#4648D4'}}/></p>
              <p style={{fontSize:15,fontWeight:600}}>拖拽图片 / 视频或点击上传（可多选）</p>
              <p style={{fontSize:12,color:'#9CA3AF'}}>图片 JPG/PNG/WEBP ≤20MB · 视频 MP4/MOV/AVI ≤30s ≤200MB</p>
            </Upload.Dragger>
          )}
        </div>
      </Modal>

      {pid && (
        <ManualProductFormModal
          open={editOpen}
          projectId={pid}
          initialValue={product}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            setProduct(saved);
            setHasCover(!!saved.cover_url);
            loadMaterials();   // 后端已同步主图素材 analysis，刷新 grid 反映新值
          }}
        />
      )}

      <button type="button" className={styles.fab} onClick={handleGenerateVideo} title="生成视频">
        <ThunderboltOutlined style={{fontSize:22}}/>
        <span>生成视频</span>
      </button>
    </div>
  );
}

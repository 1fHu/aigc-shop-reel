# 分镜编辑器（ScriptStudio 改造）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ScriptStudio 页面从简单列表改造为完整的三栏分镜编辑器，UI 对齐原型 `docs/prototype_1.html`，前后端数据契约对齐。

**Architecture:** 页面保持路由 `/projects/:id/script` 不变。CSS 文件 `ScriptStudio.module.css` 已有全部三栏样式（575 行），不修改。新增 3 个页面级子组件（ShotTimeline / ShotEditor / FactorPanel），页面壳持有全部状态并协调数据流。

**Tech Stack:** React 18 + TypeScript + Ant Design 5 + Zustand（scriptStore 为空，本次仍用本地 useState）+ 现有 scriptService

**前后端契约对齐要点:**
- `ScriptShot` 类型缺少 `bgm` 字段 — 后端 4 处硬编码 `'Modern Beat'`，需改为从数据读取
- `Scene` 类型（前端）已有 `bgm` 字段，后端需补齐
- `PUT /scripts/:id/storyboard` body 类型未声明 `bgm`，需补

---

### Task 1: 后端 — ScriptShot 类型补 `bgm` 字段

**Files:**
- Modify: `E:\vidcraft\backend\src\modules\script\script.service.ts:8-16`
- Modify: `E:\vidcraft\backend\src\modules\script\script.service.ts:80-91`
- Modify: `E:\vidcraft\backend\src\modules\script\script.controller.ts:28-39`
- Modify: `E:\vidcraft\backend\src\modules\script\script.controller.ts:54`

- [ ] **Step 1: ScriptShot 类型加 `bgm` 字段**

`script.service.ts` 第 8-16 行，`ScriptShot` 类型定义加 `bgm`：

```ts
export type ScriptShot = {
  index: number;
  description: string;
  camera_motion: string;
  duration: number;
  voiceover: string;
  subtitle: string;
  bgm: string;
  reference_image_url: string | null;
};
```

- [ ] **Step 2: toScene() 不再硬编码 bgm**

`script.service.ts` 第 79-91 行：

```ts
private toScene(shot: ScriptShot) {
  return {
    id: `scene-${shot.index}`,
    index: shot.index,
    duration: shot.duration || 3,
    thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${shot.index + 1}`,
    description: shot.description,
    camera_motion: shot.camera_motion || 'static',
    bgm: shot.bgm || 'Modern Beat',
    voiceover: shot.voiceover || '',
    subtitle: shot.subtitle || '',
  };
}
```

- [ ] **Step 3: Controller SSE generate 不再硬编码 bgm**

`script.controller.ts` 第 28-39 行，`bgm` 从 shot 数据读取：

```ts
for (const shot of script.storyboard as Array<Record<string, unknown>>) {
  const scene = {
    id: `scene-${shot.index as number}`,
    index: shot.index,
    duration: (shot.duration as number) || 3,
    thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${(shot.index as number) + 1}`,
    description: shot.description,
    camera_motion: shot.camera_motion || 'static',
    bgm: (shot.bgm as string) || 'Modern Beat',
    voiceover: shot.voiceover || '',
    subtitle: shot.subtitle || '',
  };
  // ...
}
```

- [ ] **Step 4: Controller saveStoryboard body 类型加 `bgm`**

`script.controller.ts` 第 54 行：

```ts
@Put(':id/storyboard')
async saveStoryboard(
  @Param('id') id: string,
  @Body() body: {
    storyboard: Array<{
      index: number; description: string; camera_motion: string;
      duration: number; voiceover: string; subtitle: string;
      bgm: string; reference_image_url: string | null;
    }>
  },
) {
  return ok(await this.scriptService.saveStoryboard(id, body.storyboard));
}
```

- [ ] **Step 5: 运行后端 type-check 验证**

Run: `cd E:/vidcraft/backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 6: 提交后端改动**

```bash
git add backend/src/modules/script/script.service.ts backend/src/modules/script/script.controller.ts
git commit -m "fix(script): add bgm field to ScriptShot type, stop hardcoding in toScene/SSE"
```

---

### Task 2: 后端 — director-agent 生成的分镜补 `bgm` 字段

**Files:**
- Modify: `E:\vidcraft\backend\src\modules\script\director-agent.service.ts:91-111`
- Modify: `E:\vidcraft\backend\src\modules\script\director-agent.service.ts:115-175`

- [ ] **Step 1: normalize() 补 `bgm` 字段**

`director-agent.service.ts` 第 91-111 行，`normalize()` 返回的对象加 `bgm`：

```ts
private normalize(raw: Partial<ScriptShot>[]): ScriptShot[] {
  return raw
    .filter((s) => typeof s?.description === 'string' && s.description.trim())
    .map((s, index) => {
      const motion =
        typeof s.camera_motion === 'string' && CAMERA_MOTIONS.includes(s.camera_motion)
          ? s.camera_motion
          : 'static';
      const duration = Number.isFinite(s.duration as number)
        ? Math.min(6, Math.max(2, Math.round(s.duration as number)))
        : 3;
      return {
        index,
        description: (s.description as string).trim(),
        camera_motion: motion,
        duration,
        voiceover: typeof s.voiceover === 'string' ? s.voiceover : '',
        subtitle: typeof s.subtitle === 'string' ? s.subtitle : '',
        bgm: typeof s.bgm === 'string' ? s.bgm : 'Modern Beat',
        reference_image_url: null,
      };
    });
}
```

- [ ] **Step 2: fallback() 每个分镜补 `bgm`**

`director-agent.service.ts` 第 132-173 行，所有 fallback shot 加 `bgm: 'Modern Beat'`：

```ts
const shots: Array<Omit<ScriptShot, 'index'>> = [
  {
    description: `开场 Hook：${hook}`,
    camera_motion: 'push-in', duration: 3,
    voiceover: hook, subtitle: '别划走',
    bgm: 'Modern Beat', reference_image_url: null,
  },
  {
    description: `${name} 产品外观与核心卖点特写`,
    camera_motion: 'static', duration: 3,
    voiceover: points[0] ? `它最大的亮点就是${points[0]}` : `${name} 的设计很有诚意`,
    subtitle: points[0] || '核心卖点',
    bgm: 'Modern Beat', reference_image_url: null,
  },
  {
    description: `使用场景演示：${scene}`,
    camera_motion: 'tracking', duration: 3,
    voiceover: `${scene}，用起来格外顺手`,
    subtitle: scene,
    bgm: 'Modern Beat', reference_image_url: null,
  },
  {
    description: points[1] ? `卖点细节展示：${points[1]}` : `适合人群：${audience}`,
    camera_motion: 'push-in', duration: 3,
    voiceover: points[1] ? `而且${points[1]}` : `特别适合${audience}`,
    subtitle: points[1] || audience,
    bgm: 'Modern Beat', reference_image_url: null,
  },
  {
    description: '行动号召 CTA',
    camera_motion: 'static', duration: 3,
    voiceover: cta, subtitle: cta,
    bgm: 'Modern Beat', reference_image_url: null,
  },
];
```

- [ ] **Step 3: 检查 import — director-agent 引用了旧的 ScriptShot 路径**

`director-agent.service.ts` 第 3 行：`import type { ScriptShot } from '../../common/mock-store.service';`
改为：
```ts
import type { ScriptShot } from './script.service';
```

- [ ] **Step 4: 运行后端 type-check**

Run: `cd E:/vidcraft/backend && npm run type-check`
Expected: 0 errors

- [ ] **Step 5: 提交**

```bash
git add backend/src/modules/script/director-agent.service.ts
git commit -m "fix(director-agent): add bgm field to normalized and fallback shots"
```

---

### Task 3: 前端 — ShotTimeline 组件（左栏）

**Files:**
- Create: `E:\vidcraft\frontend\src\pages\ScriptStudio\ShotTimeline.tsx`

- [ ] **Step 1: 创建 ShotTimeline 组件**

```tsx
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
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
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/pages/ScriptStudio/ShotTimeline.tsx
git commit -m "feat: add ShotTimeline component for storyboard left panel"
```

---

### Task 4: 前端 — ShotEditor 组件（中栏）

**Files:**
- Create: `E:\vidcraft\frontend\src\pages\ScriptStudio\ShotEditor.tsx`

- [ ] **Step 1: 创建 ShotEditor 组件**

```tsx
import { useState } from 'react';
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
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
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
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/pages/ScriptStudio/ShotEditor.tsx
git commit -m "feat: add ShotEditor component for storyboard center panel"
```

---

### Task 5: 前端 — FactorPanel 组件（右栏）

**Files:**
- Create: `E:\vidcraft\frontend\src\pages\ScriptStudio\FactorPanel.tsx`

- [ ] **Step 1: 创建 FactorPanel 组件**

```tsx
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
        <span style={{ fontSize: 11, color: applying ? '#F59E0B' : '#10B981', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/pages/ScriptStudio/FactorPanel.tsx
git commit -m "feat: add FactorPanel component for storyboard right panel"
```

---

### Task 6: 前端 — 重写 ScriptStudio 页面壳

**Files:**
- Modify: `E:\vidcraft\frontend\src\pages\ScriptStudio\index.tsx`

- [ ] **Step 1: 重写 ScriptStudio 页面**

完整替换 `index.tsx`：

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Skeleton, Tag } from 'antd';
import { RocketOutlined, UndoOutlined, RedoOutlined, SaveOutlined, ThunderboltFilled } from '@ant-design/icons';
import { scriptService } from '@/services/scriptService';
import type { Scene, ScriptMode, FactorGroup, FactorState, FactorKey, ScriptHistoryEntry } from '@/types';
import ShotTimeline from './ShotTimeline';
import ShotEditor from './ShotEditor';
import FactorPanel from './FactorPanel';
import styles from './ScriptStudio.module.css';

const DEFAULT_SCENE: Omit<Scene, 'id' | 'index'> = {
  duration: 3,
  thumb_url: '',
  description: '',
  camera_motion: 'static',
  bgm: 'Modern Beat',
  voiceover: '',
  subtitle: '',
};

export default function ScriptStudio() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();

  // ---- state ----
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scriptId, setScriptId] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [mode, setMode] = useState<ScriptMode>('auto');
  const [factorState, setFactorState] = useState<FactorState>({
    visual_style: '电影级精致',
    opener: '利益点切入',
    narration: '冷静知性',
    pacing: '中节奏',
    cta: '直接报价',
  });
  const [factors, setFactors] = useState<FactorGroup[]>([]);
  const [history, setHistory] = useState<ScriptHistoryEntry[]>([]);
  const [applyingFactor, setApplyingFactor] = useState(false);

  // ---- load existing script + factors on mount ----
  useEffect(() => {
    let cancelled = false;
    const pid = projectId;
    if (!pid) { setLoading(false); return; }

    Promise.all([
      scriptService.getLatestByProject(pid),
      scriptService.getFactors().catch(() => [] as FactorGroup[]),
    ]).then(([existing, factorList]) => {
      if (cancelled) return;
      if (existing && existing.scenes.length > 0) {
        setScenes(existing.scenes);
        setScriptId(existing.id);
        setSelectedIndex(0);
      }
      if (factorList.length > 0) {
        setFactors(factorList);
        const initState = { ...factorState };
        factorList.forEach((g) => { if (!initState[g.key]) initState[g.key] = g.options[0]; });
        setFactorState(initState);
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- handlers ----
  const handleGenerate = useCallback(async () => {
    setScenes([]);
    setGenerating(true);
    try {
      const pid = projectId || '';
      for await (const event of scriptService.generate({ project_id: pid, strategy_type: 'pain_point' })) {
        if (event.type === 'scene') {
          setScenes((prev) => [...prev, event.scene]);
        } else if (event.type === 'done') {
          setScriptId(event.script_id);
          setGenerating(false);
        }
      }
    } catch {
      message.error('剧本生成失败');
      setGenerating(false);
    }
  }, [projectId, message]);

  const handleSave = useCallback(async () => {
    if (!scriptId) return;
    try {
      await scriptService.saveStoryboard(scriptId, { scenes });
      message.success('分镜已保存');
    } catch {
      message.error('保存失败');
    }
  }, [scriptId, scenes, message]);

  const handleFieldChange = useCallback((index: number, field: string, value: string | number) => {
    setScenes((prev) => prev.map((s) => (s.index === index ? { ...s, [field]: value } : s)));
  }, []);

  const handleAddShot = useCallback(() => {
    const newIndex = scenes.length;
    const newScene: Scene = {
      id: `scene-${newIndex}-${Date.now()}`,
      index: newIndex,
      ...DEFAULT_SCENE,
      thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${newIndex + 1}`,
    };
    setScenes((prev) => [...prev, newScene]);
    setSelectedIndex(newIndex);
  }, [scenes.length]);

  const handleDeleteShot = useCallback((index: number) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.index !== index).map((s, i) => ({ ...s, index: i, id: `scene-${i}` }));
      return next;
    });
    setSelectedIndex((prev) => {
      if (prev === index) return Math.max(0, index - 1);
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const handleRegenerateShot = useCallback(async (index: number) => {
    if (!scriptId) return;
    setRegenerating(true);
    try {
      const resp = await fetch(`/api/scripts/${scriptId}/regenerate-shot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vidcraft_access_token')}` },
        body: JSON.stringify({ shot_index: index }),
      });
      const data = await resp.json();
      const result = data.data || data;
      if (result?.shot) {
        setScenes((prev) => prev.map((s) => (s.index === index ? { ...s, ...result.shot, index } : s)));
      }
      message.success('分镜已重生');
    } catch {
      message.error('重生失败');
    } finally {
      setRegenerating(false);
    }
  }, [scriptId, message]);

  const handleFactorChange = useCallback(async (key: FactorKey, value: string) => {
    setFactorState((prev) => ({ ...prev, [key]: value }));
    if (!scriptId) return;
    setApplyingFactor(true);
    try {
      const resp = await fetch(`/api/scripts/${scriptId}/replace-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vidcraft_access_token')}` },
        body: JSON.stringify({ dimension: key, new_value: value }),
      });
      const data = await resp.json();
      const result = data.data || data;
      if (result?.affected_shots) {
        const now = new Date().toISOString();
        setHistory((prev) => [{
          id: `${Date.now()}`,
          timestamp: now,
          message: `替换 "${factors.find((f) => f.key === key)?.label || key}" → ${value}`,
          affected_scene_ids: result.affected_shots.map((i: number) => `#${String(i + 1).padStart(2, '0')}`),
        }, ...prev]);
      }
    } catch {
      message.error('因子替换失败');
    } finally {
      setApplyingFactor(false);
    }
  }, [scriptId, factors, message]);

  const handleGenerateVideo = useCallback(() => {
    const target = projectId
      ? `/projects/${projectId}/video?scriptId=${scriptId}`
      : `/video-creation?scriptId=${scriptId}`;
    navigate(target);
  }, [projectId, scriptId, navigate]);

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 3), 0);

  // ---- loading state ----
  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.skelShell}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  // ---- empty state ----
  if (!scenes.length && !generating) {
    return (
      <div className={styles.shell}>
        <div className={styles.page}>
          <div className={styles.emptyState}>
            <h2>分镜编辑</h2>
            <p>基于商品信息，AI 自动生成带货视频分镜剧本，也可手动逐镜编辑</p>
            <button
              className={styles.genBtn}
              onClick={handleGenerate}
              disabled={generating}
            >
              <ThunderboltFilled /> AI 生成剧本
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- editor ----
  const selectedScene = scenes.find((s) => s.index === selectedIndex);

  return (
    <div className={styles.shell}>
      {/* ====== Toolbar ====== */}
      <div className={styles.toolbar}>
        <div className={styles.modeSegment}>
          <button className={styles.modeBtn} disabled title="即将上线">爆款仿写</button>
          <button className={styles.modeBtn} disabled title="即将上线">灵感模板</button>
          <button className={`${styles.modeBtn} ${styles.modeBtnActive}`} onClick={handleGenerate}>
            <ThunderboltFilled style={{ fontSize: 11, marginRight: 2 }} /> AI 生成剧本
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={!scriptId || generating}>
            <SaveOutlined /> 保存
          </button>
        </div>
      </div>

      {/* ====== 3-column workspace ====== */}
      <div className={styles.workspace}>
        <ShotTimeline
          scenes={scenes}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onAdd={handleAddShot}
          onDelete={handleDeleteShot}
        />
        <ShotEditor
          scene={selectedScene}
          regenerating={regenerating}
          onChange={handleFieldChange}
          onRegenerate={handleRegenerateShot}
        />
        <FactorPanel
          factors={factors}
          factorState={factorState}
          history={history}
          applying={applyingFactor}
          onFactorChange={handleFactorChange}
        />
      </div>

      {/* ====== Bottom bar ====== */}
      <div className={styles.bottombar}>
        <div className={styles.bottombarLeft}>
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>总时长</span>
            <span className={styles.bottomStatValue}>{totalDuration}s</span>
          </div>
          <span className={styles.bottomSep} />
          <div className={styles.bottomStat}>
            <span className={styles.bottomStatLabel}>分镜数</span>
            <span className={styles.bottomStatValue}>{scenes.length}</span>
          </div>
        </div>
        <div className={styles.bottombarRight}>
          <button
            className={styles.genBtn}
            onClick={handleGenerateVideo}
            disabled={!scriptId || scenes.length === 0 || generating}
          >
            <RocketOutlined /> 生成视频
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 删除旧页面的 `.page` / `.emptyState` 样式依赖检查**

旧 CSS 中 `.genBtn` 定义了两次（第 539-557 行为底部栏，第 569-573 行为空状态按钮），确认两次定义不会冲突。空状态按钮使用 `style` 属性内联覆盖即可，不改 CSS。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/ScriptStudio/index.tsx
git commit -m "feat: rewrite ScriptStudio as full 3-column storyboard editor"
```

---

### Task 7: 前端 — 验证构建

**Files:** 不涉及代码改动

- [ ] **Step 1: 运行 type-check**

Run: `cd E:/vidcraft/frontend && npm run type-check`
Expected: 0 errors

- [ ] **Step 2: 运行 lint**

Run: `cd E:/vidcraft/frontend && npm run lint`
Expected: 0 errors, 0 warnings

- [ ] **Step 3: 运行 build**

Run: `cd E:/vidcraft/frontend && npm run build`
Expected: Build succeeds

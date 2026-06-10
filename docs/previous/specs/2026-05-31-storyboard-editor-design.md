# 分镜编辑器（ScriptStudio 改造）设计文档

**日期**: 2026-05-31
**范围**: 前端 ScriptStudio 页面 → 分镜编辑器

## 目标

将当前简单的"生成剧本"页面改造为完整的三栏分镜编辑器，使用原型 UI 布局，保留现有 ScriptStudio 的数据逻辑。

## 不变

- 路由 `/projects/:id/script`
- 后端 API（仅需给 ScriptShot 加 `bgm` 字段）
- CSS 文件 `ScriptStudio.module.css`（已有全部三栏样式）

## 布局

三栏工作台 + 顶部工具栏 + 底部操作栏：

```
工具栏: [爆款仿写(禁用)] [灵感模板(禁用)] [AI生成剧本(激活)]  [保存] [版本]
──────────────────────────────────────────────────────────────────
左 260px         │ 中 flex-1 (max 640px)  │ 右 320px
分镜时间轴        │ 分镜编辑器             │ 创作因子
                  │                        │
#01 3s [thumb]   │ #01         [重生分镜]  │ 5 组 chip
#02 4s [thumb]   │ Prompt·画面描述 [ta]    │ 操作历史
#03 3s [thumb]   │ 镜头运动 [select]       │
[+ 添加分镜]      │ BGM [select]            │
                  │ 配音文案 [ta]           │
                  │ 字幕 [input]            │
──────────────────────────────────────────────────────────────────
底部栏: 总时长 10.5s                              [生成视频]
```

## 数据流

1. 加载：`GET /scripts?project_id=` → 有数据填 scenes，无数据显示空状态
2. AI 生成：SSE `POST /scripts/generate` → 流式追加到时间轴
3. 手动编辑 → 本地 state → 保存按钮 → `PUT /scripts/:id/storyboard`
4. 重生分镜：SSE `POST /scripts/:id/regenerate-shot`
5. 因子替换：SSE `POST /scripts/:id/replace-factor`
6. 生成视频：跳转 `/projects/:id/video?scriptId=`

## 后端小改

- ScriptShot 类型加 `bgm: string` 字段
- `toScene()` 不再硬编码 bgm
- `director-agent.service.ts` fallback shot 加 bgm 字段

## 组件拆分

- `ScriptStudio/index.tsx` — 页面壳，持有所有状态
- `components/ShotTimeline/` — 左栏：镜头卡片列表 + 添加按钮
- `components/ShotEditor/` — 中栏：选中镜头的编辑表单
- `components/FactorPanel/` — 右栏：因子 chip + 操作历史

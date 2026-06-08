import { useState, useMemo, useRef, type ReactNode } from 'react';
import { Input, Collapse, Empty, Tag } from 'antd';
import {
  SearchOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  FolderOpenOutlined,
  PictureOutlined,
  EditOutlined,
  VideoCameraOutlined,
  DatabaseOutlined,
  FireOutlined,
  BarChartOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  SoundOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  StarOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  CrownOutlined,
  ThunderboltFilled,
  FileTextOutlined,
  AimOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SyncOutlined,
  SwapOutlined,
  SmileOutlined,
} from '@ant-design/icons';

import styles from './Help.module.css';

/* ================================================================
   Types & content structure
   ================================================================ */

interface HelpSection {
  key: string;
  title: string;
  content: ReactNode;
}

interface HelpCategory {
  key: string;
  icon: ReactNode;
  title: string;
  sections: HelpSection[];
}

/* ================================================================
   Content callout helpers
   ================================================================ */

function TipBox({ children }: { children: ReactNode }) {
  return (
    <div className={styles.tipBox}>
      <BulbOutlined className={styles.calloutIcon} />
      <span>{children}</span>
    </div>
  );
}

function WarningBox({ children }: { children: ReactNode }) {
  return (
    <div className={styles.warningBox}>
      <WarningOutlined className={styles.calloutIcon} />
      <span>{children}</span>
    </div>
  );
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className={styles.infoBox}>
      <InfoCircleOutlined className={styles.calloutIcon} />
      <span>{children}</span>
    </div>
  );
}

/* ================================================================
   Category content definitions
   ================================================================ */

const CATEGORIES: HelpCategory[] = [
  /* ---- 1. 快速入门 ---- */
  {
    key: 'getting-started',
    icon: <RocketOutlined />,
    title: '快速入门',
    sections: [
      {
        key: 'what-is-vidcraft',
        title: '什么是 VidCraft',
        content: (
          <div>
            <div className={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #4648D4 50%, #0EA5E9 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 20,
                }}>
                  <ThunderboltFilled />
                </div>
                <div>
                  <div className={styles.cardTitle}>VidCraft AI 视频创作平台</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                    AIGC x TikTok Commerce
                  </div>
                </div>
              </div>
              <p className={styles.cardBody}>
                VidCraft 是一款专为 TikTok 电商卖家打造的 AIGC 视频创作平台。
                只需提供商品链接或图片，即可自动生成高质量的商品推广短视频。
                平台集成了 AI 剧本生成、智能素材解析、爆款模板仿写、实时渲染等功能，
                帮助您快速产出适合 TikTok 生态的带货视频，将制作周期从 3-7 天压缩至约 30 分钟。
              </p>
            </div>
            <TipBox>
              当前支持 TikTok Shop、Shopify、Shopee、Lazada、速卖通等主流电商平台的商品链接解析。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'register-login',
        title: '注册与登录',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>创建您的 VidCraft 账号</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>访问 VidCraft 登录页面，点击"注册"按钮</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>输入电子邮箱地址和密码（密码至少 8 位，包含字母和数字）</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>完成邮箱验证码验证</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>填写基本信息（昵称、店铺类型等），进入工作台即可开始使用</span>
              </div>
            </div>
            <TipBox>建议使用企业邮箱注册，以便团队协作功能上线后无缝迁移。</TipBox>
          </div>
        ),
      },
      {
        key: 'guest-mode',
        title: '游客模式说明',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>游客模式</div>
              <p className={styles.cardBody}>
                游客模式无需注册即可体验 VidCraft 的核心功能。您可以使用有限的配额创建项目、生成视频，
                但生成的视频会带有水印，且项目数据仅在本地保存，退出后无法恢复。
              </p>
            </div>
            <WarningBox>
              游客模式下生成的项目数据不会持久保存。建议注册账号以保留创作进度和历史记录。
            </WarningBox>
            <div className={styles.card}>
              <div className={styles.cardTitle}>游客与注册用户对比</div>
              <div className={styles.tableWrap}>
                <table className={styles.helpTable}>
                  <thead>
                    <tr>
                      <th>功能</th>
                      <th>游客模式</th>
                      <th>注册用户</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>创建项目</td>
                      <td>每日 3 个配额</td>
                      <td>无限制</td>
                    </tr>
                    <tr>
                      <td>视频生成</td>
                      <td>每日 1 个</td>
                      <td>根据套餐</td>
                    </tr>
                    <tr>
                      <td>无水印</td>
                      <td><Tag color="error">不支持</Tag></td>
                      <td><Tag color="success">支持</Tag></td>
                    </tr>
                    <tr>
                      <td>项目持久保存</td>
                      <td><Tag color="error">不支持</Tag></td>
                      <td><Tag color="success">支持</Tag></td>
                    </tr>
                    <tr>
                      <td>数据分析</td>
                      <td><Tag color="error">不支持</Tag></td>
                      <td><Tag color="success">支持</Tag></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'workspace-overview',
        title: '工作台概览',
        content: (
          <div>
            <p className={styles.cardBody} style={{ marginBottom: 16 }}>
              VidCraft 工作台由以下核心模块组成，每个模块对应视频创作流程中的关键环节：
            </p>
            <div className={styles.featureGrid}>
              {[
                { icon: <AppstoreOutlined />, bg: '#EEF2FF', color: '#4648D4', label: 'Dashboard', desc: '项目概览、数据统计、最近项目' },
                { icon: <FolderOpenOutlined />, bg: '#FEF3C7', color: '#D97706', label: '项目管理', desc: '浏览和管理所有视频项目' },
                { icon: <PictureOutlined />, bg: '#D1FAE5', color: '#059669', label: '素材库', desc: '上传和管理商品素材' },
                { icon: <EditOutlined />, bg: '#EDE9FE', color: '#7C3AED', label: '剧本工坊', desc: 'AI 生成和编辑视频剧本' },
                { icon: <VideoCameraOutlined />, bg: '#FEE2E2', color: '#DC2626', label: '视频创作', desc: '渲染、预览和下载视频' },
                { icon: <DatabaseOutlined />, bg: '#E0F2FE', color: '#0284C7', label: '基因库', desc: '浏览和应用爆款视频模板' },
                { icon: <FireOutlined />, bg: '#FFF7ED', color: '#EA580C', label: '爆款分析器', desc: '分析竞品视频的爆款因子' },
                { icon: <BarChartOutlined />, bg: '#F0FDF4', color: '#16A34A', label: '数据分析', desc: '查看视频表现和 AI 诊断' },
              ].map((f) => (
                <div key={f.label} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className={styles.featureLabel}>{f.label}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  /* ---- 2. 项目管理 ---- */
  {
    key: 'project-management',
    icon: <FolderOpenOutlined />,
    title: '项目管理',
    sections: [
      {
        key: 'create-project',
        title: '创建新项目',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>创建您的第一个项目</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>点击侧边栏底部的 <Tag style={{ fontFamily: "'JetBrains Mono', monospace" }}>+ Create New Video</Tag> 按钮</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>在弹出的对话框中粘贴商品链接（URL）或上传商品图片</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>填写项目名称（可选，AI 会自动从商品信息中提取合适的名称）</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>点击"创建项目"，系统会自动解析商品信息并跳转到素材库页面</span>
              </div>
            </div>
            <TipBox>
              支持的链接格式：TikTok Shop、Shopee、Lazada、速卖通等平台的商品详情页链接。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'project-statuses',
        title: '项目状态说明',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>项目状态与含义</div>
            <div className={styles.tableWrap}>
              <table className={styles.helpTable}>
                <thead>
                  <tr>
                    <th>状态</th>
                    <th>标签颜色</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500 }}>草稿</td>
                    <td><Tag>draft</Tag></td>
                    <td>项目已创建，尚未提交素材</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>待生成剧本</td>
                    <td><Tag color="blue">script_pending</Tag></td>
                    <td>素材已就绪，等待 AI 生成剧本</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>待生成视频</td>
                    <td><Tag color="orange">video_pending</Tag></td>
                    <td>剧本已完成，等待渲染视频</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>生成中</td>
                    <td><Tag color="processing">in_progress</Tag></td>
                    <td>视频正在渲染中</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>已完成</td>
                    <td><Tag color="success">completed</Tag></td>
                    <td>视频生成完毕，可预览和下载</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>失败</td>
                    <td><Tag color="error">failed</Tag></td>
                    <td>生成过程出错，可重试</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        key: 'project-entry-modal',
        title: '项目入口弹框',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>工作台入口</div>
              <p className={styles.cardBody}>
                点击任意已有项目，会弹出工作台入口弹框，提供 4 个工作入口：
              </p>
            </div>
            <div className={styles.featureGrid}>
              {[
                { icon: <PictureOutlined />, bg: '#D1FAE5', color: '#059669', label: '素材库', desc: '上传和管理商品图片/视频素材' },
                { icon: <EditOutlined />, bg: '#EDE9FE', color: '#7C3AED', label: '分镜编辑·剧本', desc: '查看和编辑 AI 生成的剧本分镜' },
                { icon: <StarOutlined />, bg: '#FEF3C7', color: '#D97706', label: '风格模板', desc: '浏览基因库中的爆款模板并应用到本项目' },
                { icon: <VideoCameraOutlined />, bg: '#FEE2E2', color: '#DC2626', label: 'Video', desc: '进入视频创作流程，查看渲染进度' },
              ].map((f) => (
                <div key={f.label} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className={styles.featureLabel}>{f.label}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  /* ---- 3. 素材库 ---- */
  {
    key: 'material-library',
    icon: <PictureOutlined />,
    title: '素材库',
    sections: [
      {
        key: 'upload-material',
        title: '上传素材',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>上传商品素材</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>进入项目后的素材库页面</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>点击上传区域或拖拽文件到虚线框内</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>支持批量上传，最多同时上传 10 个文件</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>上传完成后，AI 会自动解析素材内容</span>
              </div>
            </div>
            <TipBox>建议使用高清商品图片（至少 1080 × 1080 像素）以获得最佳 AI 解析效果。</TipBox>
          </div>
        ),
      },
      {
        key: 'ai-parsing',
        title: 'AI 素材解析',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>智能解析能力</div>
            <p className={styles.cardBody} style={{ marginBottom: 16 }}>
              上传完成后，系统会自动对每个素材进行 AI 分析：
            </p>
            <div className={styles.featureGrid}>
              {[
                { icon: <FileTextOutlined />, bg: '#EEF2FF', color: '#4648D4', label: '商品描述', desc: 'AI 识别商品类别和特征，生成描述文本' },
                { icon: <CheckCircleOutlined />, bg: '#D1FAE5', color: '#059669', label: '质量评分', desc: '对图片清晰度、构图、光线等进行打分' },
                { icon: <ThunderboltOutlined />, bg: '#FEF3C7', color: '#D97706', label: '智能标签', desc: '自动打上品类、风格、场景等标签' },
                { icon: <AimOutlined />, bg: '#FEE2E2', color: '#DC2626', label: '卖点提取', desc: '从商品信息中提取核心卖点关键词' },
              ].map((f) => (
                <div key={f.label} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className={styles.featureLabel}>{f.label}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: 'format-requirements',
        title: '格式与要求',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>支持的文件格式</div>
            <div className={styles.tableWrap}>
              <table className={styles.helpTable}>
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>格式</th>
                    <th>最大尺寸</th>
                    <th>建议规格</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500 }}>图片</td>
                    <td>JPG, PNG, WebP</td>
                    <td>20 MB</td>
                    <td>1080 × 1080 或更高</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>视频</td>
                    <td>MP4, MOV, AVI</td>
                    <td>500 MB</td>
                    <td>1920 × 1080（横屏）或 1080 × 1920（竖屏），时长 ≤ 60s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <InfoBox>
              推荐使用竖屏（9:16）比例的视频素材，更适合 TikTok 平台展示。
            </InfoBox>
          </div>
        ),
      },
    ],
  },

  /* ---- 4. 剧本工坊 ---- */
  {
    key: 'script-studio',
    icon: <EditOutlined />,
    title: '剧本工坊',
    sections: [
      {
        key: 'ai-script-gen',
        title: 'AI 剧本生成',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>智能生成剧本</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>确保商品素材已上传到素材库</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>在创作因子面板中选择您想要的风格偏好</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>在自定义要求输入框中填写额外需求（可选）</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>点击"生成剧本"按钮，AI 将自动生成分镜剧本</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>5</span>
                <span className={styles.stepContent}>生成完成后可在分镜时间线中查看和编辑每个镜头</span>
              </div>
            </div>
            <TipBox>
              自定义要求可以帮助 AI 更好地理解您的需求。例如："突出价格优势"、"强调限时折扣"、"目标 25-35 岁女性用户"等。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'shot-editing',
        title: '分镜编辑',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>分镜时间线 (ShotTimeline)</div>
              <p className={styles.cardBody}>
                剧本由多个分镜 (Shot) 组成，每个分镜代表视频中的一个场景片段。
                拖拽分镜卡可以调整播放顺序，点击分镜可在右侧编辑面板中查看和修改详情。
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>分镜编辑器 (ShotEditor)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {[
                  { icon: <ClockCircleOutlined />, label: '时长', desc: '设置该分镜的播放秒数（1-10 秒）' },
                  { icon: <VideoCameraOutlined />, label: '镜头运动', desc: '静态、推近、拉远、平移、环绕' },
                  { icon: <SoundOutlined />, label: '背景音乐', desc: '选择或更换该分镜的 BGM' },
                  { icon: <EditOutlined />, label: '配音文案', desc: '编辑 AI 生成的旁白文字内容' },
                  { icon: <FileTextOutlined />, label: '字幕文案', desc: '设置显示在视频上的叠加文字' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#EEF2FF',
                      color: '#4648D4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.label}</div>
                      <div style={{ fontSize: 13, color: '#6B7280' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'factor-panel',
        title: '创作因子面板',
        content: (
          <div>
            <p className={styles.cardBody} style={{ marginBottom: 16 }}>
              创作因子是控制 AI 生成风格的核心参数。每个维度决定视频的一个创作方向，
              合理配置这些因子可以显著提升视频效果。
            </p>
            <div className={styles.featureGrid}>
              {[
                { icon: <EyeOutlined />, bg: '#EEF2FF', color: '#4648D4', label: '视觉风格', desc: '整体画面美学风格。选项：电影级精致、清新明亮、复古胶片、赛博朋克、简约白底等' },
                { icon: <RocketOutlined />, bg: '#FEF3C7', color: '#D97706', label: '开场方式', desc: '视频开头如何吸引观众。选项：直接展示、问题开场、对比展示、故事引入、数据震撼等' },
                { icon: <SoundOutlined />, bg: '#EDE9FE', color: '#7C3AED', label: '旁白风格', desc: '配音的语气和风格。选项：冷静知性、热情活力、专业权威、亲切自然等' },
                { icon: <ThunderboltOutlined />, bg: '#FEE2E2', color: '#DC2626', label: '节奏', desc: '视频剪辑节奏。选项：快节奏、中节奏、慢节奏' },
                { icon: <ShoppingCartOutlined />, bg: '#D1FAE5', color: '#059669', label: '行动号召 (CTA)', desc: '结尾的转化引导方式。选项：优惠下单、关注引导、链接点击、收藏分享等' },
              ].map((f) => (
                <div key={f.label} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className={styles.featureLabel}>{f.label}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: 'viral-imitation',
        title: '爆款仿写模式',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>一键应用爆款风格</div>
              <p className={styles.cardBody}>
                爆款仿写模式允许您将基因库中爆款视频的创作因子一键应用到当前项目，
                让 AI 生成的剧本与爆款视频保持相似的创作风格。
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>操作步骤</div>
              <div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>1</span>
                  <span className={styles.stepContent}>点击工具栏中的"爆款仿写"按钮</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>2</span>
                  <span className={styles.stepContent}>在弹出的基因库面板中选择一个爆款模板</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>3</span>
                  <span className={styles.stepContent}>预览该模板的 AI 分析报告和各维度因子</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>4</span>
                  <span className={styles.stepContent}>确认应用后，创作因子会自动覆盖到当前剧本</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>5</span>
                  <span className={styles.stepContent}>重新生成剧本即可获得与爆款同风格的视频脚本</span>
                </div>
              </div>
            </div>
            <InfoBox>
              仿写模式不会复制原视频的画面内容，仅会应用其创作风格因子（视觉风格、节奏、旁白等）。
              这完全是原创内容创作，不涉及版权问题。
            </InfoBox>
          </div>
        ),
      },
    ],
  },

  /* ---- 5. 视频创作 ---- */
  {
    key: 'video-creation',
    icon: <VideoCameraOutlined />,
    title: '视频创作',
    sections: [
      {
        key: 'generation-flow',
        title: '生成流程',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>从剧本到视频</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>确认剧本和素材无误后，在剧本工坊点击"生成视频"按钮</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>系统会提交视频渲染任务到后台队列</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>通过实时进度条查看渲染进度（使用 WebSocket 实时推送）</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>渲染完成后会收到通知提醒</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>5</span>
                <span className={styles.stepContent}>在视频创作页面预览和下载最终视频</span>
              </div>
            </div>
            <InfoBox>
              视频渲染时间取决于视频长度和复杂度，标准模式下通常在 3-15 分钟之间完成。
            </InfoBox>
          </div>
        ),
      },
      {
        key: 'rendering-progress',
        title: '渲染进度',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>实时进度追踪</div>
            <p className={styles.cardBody}>
              渲染过程中，进度追踪器会显示以下信息：
            </p>
            <ul style={{ fontSize: 14, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
              <li>总体进度百分比</li>
              <li>当前渲染分镜 / 总分镜数</li>
              <li>预估剩余时间</li>
              <li>实时画面预览（部分场景）</li>
            </ul>
            <TipBox>
              渲染过程中您可以离开页面或进行其他操作（如创建新项目），进度不会中断。
              每个分镜独立渲染，失败时支持单分镜重试，最多自动重试 2 次。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'preview-download',
        title: '预览与下载',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>视频完成后的操作</div>
              <div className={styles.featureGrid}>
                {[
                  { icon: <PlayCircleOutlined />, bg: '#EEF2FF', color: '#4648D4', label: '播放预览', desc: '在浏览器中直接播放完成的视频' },
                  { icon: <DownloadOutlined />, bg: '#D1FAE5', color: '#059669', label: '下载视频', desc: '将视频保存到本地，MP4 格式' },
                  { icon: <ThunderboltOutlined />, bg: '#FEF3C7', color: '#D97706', label: '分享', desc: '复制视频链接或直接分享到 TikTok 等平台' },
                  { icon: <SyncOutlined />, bg: '#FEE2E2', color: '#DC2626', label: '重新生成', desc: '对不满意的分镜重新生成' },
                ].map((f) => (
                  <div key={f.label} className={styles.featureCard}>
                    <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                      {f.icon}
                    </div>
                    <div className={styles.featureLabel}>{f.label}</div>
                    <div className={styles.featureDesc}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <WarningBox>
              游客模式下下载的视频会带有 VidCraft 水印。注册登录后下载的视频无水印。
            </WarningBox>
          </div>
        ),
      },
      {
        key: 'failure-retry',
        title: '失败重试',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>视频生成失败怎么办</div>
              <div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>1</span>
                  <span className={styles.stepContent}>查看失败原因提示（常见原因：素材不清晰、AI 解析超时、音频生成失败等）</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>2</span>
                  <span className={styles.stepContent}>根据提示修复相关问题（如替换模糊图片、减少素材数量等）</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>3</span>
                  <span className={styles.stepContent}>点击"重试"按钮，系统会重新提交渲染任务</span>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>常见失败原因与解决方法</div>
              <div className={styles.tableWrap}>
                <table className={styles.helpTable}>
                  <thead>
                    <tr>
                      <th>失败原因</th>
                      <th>解决方法</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>素材质量不足</td>
                      <td>替换为更高清的图片或视频</td>
                    </tr>
                    <tr>
                      <td>AI 解析超时</td>
                      <td>减少素材数量后重试</td>
                    </tr>
                    <tr>
                      <td>音频生成失败</td>
                      <td>更换配音风格或调整旁白文案长度后重试</td>
                    </tr>
                    <tr>
                      <td>系统异常</td>
                      <td>稍后重试或联系客服并提供项目 ID</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },

  /* ---- 6. 基因库 ---- */
  {
    key: 'gene-bank',
    icon: <DatabaseOutlined />,
    title: '基因库',
    sections: [
      {
        key: 'browse-templates',
        title: '浏览模板',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>爆款视频模板库</div>
            <p className={styles.cardBody}>
              基因库展示经过 AI 分析的爆款带货视频模板，您可以通过多种方式浏览：
            </p>
            <ul style={{ fontSize: 14, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
              <li><strong>按品类筛选：</strong>美妆、电子产品、运动、家居、食品、服饰等</li>
              <li><strong>按平台筛选：</strong>TikTok、YouTube、Instagram</li>
              <li><strong>关键词搜索：</strong>按标题、品类、风格标签搜索</li>
            </ul>
            <p className={styles.cardBody}>
              每个模板卡片包含：视频缩略图、标题、镜头数、风格标签、表现评分、发布日期。
            </p>
          </div>
        ),
      },
      {
        key: 'ai-report',
        title: 'AI 分析报告',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>深入理解爆款视频</div>
            <p className={styles.cardBody}>
              点击模板卡片可查看详细的 AI 分析报告，包含以下维度：
            </p>
            <div className={styles.featureGrid}>
              {[
                { icon: <StarOutlined />, bg: '#FEF3C7', color: '#D97706', label: '爆款评分', desc: '综合评分 (1-100)，预测视频的爆款潜力' },
                { icon: <AimOutlined />, bg: '#FEE2E2', color: '#DC2626', label: 'Hook 分析', desc: '视频前 3 秒吸引观众的具体手法拆解' },
                { icon: <ThunderboltOutlined />, bg: '#EDE9FE', color: '#7C3AED', label: '节奏分析', desc: '剪辑节奏和场景切换频率分析' },
                { icon: <EyeOutlined />, bg: '#EEF2FF', color: '#4648D4', label: '风格标签', desc: '视觉风格、色调、镜头运动等标签' },
                { icon: <SoundOutlined />, bg: '#D1FAE5', color: '#059669', label: '音效分析', desc: '背景音乐和音效选择的特征分析' },
              ].map((f) => (
                <div key={f.label} className={styles.featureCard}>
                  <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className={styles.featureLabel}>{f.label}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: 'apply-factors',
        title: '应用创作因子',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>将爆款因子应用到项目</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>在基因库中点击目标模板卡片，查看 AI 分析报告</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>点击报告中的"应用因子并去剧本"按钮</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>在弹出的项目列表中选择要应用的目标项目</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>系统会自动跳转到剧本工坊，因子已预填好</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>5</span>
                <span className={styles.stepContent}>点击"生成剧本"即可获得与该模板风格相似的剧本</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },

  /* ---- 7. 爆款分析器 ---- */
  {
    key: 'viral-analyzer',
    icon: <FireOutlined />,
    title: '爆款分析器',
    sections: [
      {
        key: 'upload-analyze',
        title: '上传与分析',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>分析任意带货视频</div>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>进入爆款分析器页面</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>粘贴 TikTok 或 YouTube 视频链接（也支持直接上传视频文件，最大 500MB）</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>点击"分析"按钮</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>4</span>
                <span className={styles.stepContent}>AI 会自动提取视频画面和音频进行多维度分析</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>5</span>
                <span className={styles.stepContent}>等待 1-3 分钟即可查看完整的分析报告</span>
              </div>
            </div>
            <TipBox>
              建议分析近期（3 个月内）发布的爆款视频，分析结果更具参考价值。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'report-reading',
        title: '分析报告解读',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>报告维度说明</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {[
                { icon: <RiseOutlined />, label: '爆款指数', desc: '0-100 的综合评分，基于多个维度的加权计算' },
                { icon: <AimOutlined />, label: 'Hook 分析', desc: '前 3 秒吸引力的详细拆解，包括视觉钩子和文案钩子' },
                { icon: <SwapOutlined />, label: '剪辑风格', desc: '镜头切换频率、转场效果类型、画面节奏曲线' },
                { icon: <EyeOutlined />, label: '视觉分析', desc: '色彩搭配方案、构图方式、画面质量评估' },
                { icon: <SoundOutlined />, label: '音频分析', desc: 'BGM 风格识别、音量曲线、旁白节奏分析' },
                { icon: <SmileOutlined />, label: '观众留存', desc: '预估的观众注意力曲线，识别高流失和低流失节点' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: '#EEF2FF',
                    color: '#4648D4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: 'sync-genebank',
        title: '同步到基因库',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>保存有价值的分析结果</div>
            <p className={styles.cardBody}>
              如果您觉得某个视频的分析结果很有参考价值，可以将其保存到基因库：
            </p>
            <div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepContent}>在分析报告页面点击"保存到基因库"</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepContent}>填写标题和分类标签</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepContent}>确认后该视频的 AI 分析数据会保存到您的基因库中</span>
              </div>
            </div>
            <InfoBox>
              保存到基因库的视频分析数据仅供您个人使用，不会公开分享给其他用户。
            </InfoBox>
          </div>
        ),
      },
    ],
  },

  /* ---- 8. 数据分析 ---- */
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    title: '数据分析',
    sections: [
      {
        key: 'kpi-metrics',
        title: 'KPI 指标说明',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>核心数据指标</div>
            <div className={styles.tableWrap}>
              <table className={styles.helpTable}>
                <thead>
                  <tr>
                    <th>指标</th>
                    <th>说明</th>
                    <th>计算方式</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500 }}>观看量</td>
                    <td>视频被观看的总次数</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                      播放次数累计
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>完播率</td>
                    <td>完整观看视频的用户比例</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                      完播数 ÷ 播放数 × 100%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>互动率</td>
                    <td>点赞、评论、分享等互动比例</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                      互动数 ÷ 播放数 × 100%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>转化率</td>
                    <td>通过视频完成购买的用户比例</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                      购买数 ÷ 播放数 × 100%
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>GMV</td>
                    <td>通过视频产生的总销售额</td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                      订单金额汇总
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        key: 'heatmap',
        title: '因子效果热力图',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>理解因子与效果的关系</div>
            <p className={styles.cardBody}>
              因子效果热力图展示了不同创作因子（视觉风格、开场方式、旁白、节奏、CTA）
              与各 KPI 指标之间的相关性。
            </p>
            <ul style={{ fontSize: 14, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
              <li>颜色越深表示相关性越强</li>
              <li>行代表不同的创作因子维度</li>
              <li>列代表不同的 KPI 指标</li>
              <li>通过热力图可以直观地了解哪些因子对哪些指标影响最大</li>
            </ul>
            <TipBox>
              例如：如果"快节奏"因子与"完播率"呈强正相关，说明快节奏的视频更容易让观众完整看完。
            </TipBox>
          </div>
        ),
      },
      {
        key: 'ai-diagnosis',
        title: 'AI 诊断报告',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>智能优化建议</div>
              <p className={styles.cardBody}>
                AI 诊断报告会自动分析您的视频表现数据，提供以下内容：
              </p>
              <ul style={{ fontSize: 14, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
                <li>综合表现评分</li>
                <li>各维度的优势和不足分析</li>
                <li>具体的优化建议（修改因子、调整文案等）</li>
                <li>针对下一个视频的创作方向建议</li>
              </ul>
            </div>
            <InfoBox>
              AI 诊断报告基于平台所有用户的匿名聚合数据进行训练，建议会随着数据积累持续优化。
            </InfoBox>
          </div>
        ),
      },
    ],
  },

  /* ---- 9. 账户设置 ---- */
  {
    key: 'account-settings',
    icon: <SettingOutlined />,
    title: '账户设置',
    sections: [
      {
        key: 'profile',
        title: '个人资料管理',
        content: (
          <div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>修改个人信息</div>
              <p className={styles.cardBody}>
                在个人资料页面可以修改以下信息：
              </p>
              <ul style={{ fontSize: 14, color: '#374151', lineHeight: 2, paddingLeft: 20 }}>
                <li><strong>头像：</strong>点击头像区域上传新图片</li>
                <li><strong>昵称：</strong>修改您的显示名称</li>
                <li><strong>邮箱：</strong>更改绑定的电子邮箱（需重新验证）</li>
                <li><strong>密码：</strong>修改登录密码（需验证当前密码）</li>
              </ul>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>修改密码步骤</div>
              <div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>1</span>
                  <span className={styles.stepContent}>进入个人资料页面</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>2</span>
                  <span className={styles.stepContent}>点击"修改密码"</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>3</span>
                  <span className={styles.stepContent}>输入当前密码</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>4</span>
                  <span className={styles.stepContent}>输入新密码并确认</span>
                </div>
                <div className={styles.stepItem}>
                  <span className={styles.stepNumber}>5</span>
                  <span className={styles.stepContent}>点击确认，密码修改成功</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'guest-vs-registered',
        title: '游客模式 vs 注册用户',
        content: (
          <div className={styles.card}>
            <div className={styles.cardTitle}>功能对比</div>
            <div className={styles.tableWrap}>
              <table className={styles.helpTable}>
                <thead>
                  <tr>
                    <th>功能</th>
                    <th>游客</th>
                    <th>免费版</th>
                    <th>Pro 版</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500 }}>创建项目</td>
                    <td>每日 3 个</td>
                    <td>无限制</td>
                    <td>无限制</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>视频生成</td>
                    <td>每日 1 个</td>
                    <td>每月 10 个</td>
                    <td>每月 100 个</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>无水印</td>
                    <td><Tag color="error">✗</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>云端保存</td>
                    <td><Tag color="error">✗</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>数据分析</td>
                    <td><Tag color="error">✗</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>优先渲染</td>
                    <td><Tag color="error">✗</Tag></td>
                    <td><Tag color="error">✗</Tag></td>
                    <td><Tag color="success">✓</Tag></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>高清输出</td>
                    <td>标清</td>
                    <td>高清 720p</td>
                    <td>超清 1080p</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>高级 AI</td>
                    <td>基础版</td>
                    <td>标准版</td>
                    <td>完整版</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        key: 'upgrade',
        title: '升级选项',
        content: (
          <div>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ background: '#F8FAFC', color: '#6B7280' }}>
                  <UserOutlined />
                </div>
                <div className={styles.featureLabel}>免费版</div>
                <div className={styles.featureDesc}>
                  注册即享：每月 10 个视频、基础 AI 功能、无水印、云端保存、数据分析
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <CrownOutlined />
                </div>
                <div className={styles.featureLabel}>Pro 版</div>
                <div className={styles.featureDesc}>
                  每月 100 个视频、所有 AI 高级功能、优先渲染队列、超清 1080p 输出、详细数据分析
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                  <ThunderboltFilled />
                </div>
                <div className={styles.featureLabel}>Enterprise 版</div>
                <div className={styles.featureDesc}>
                  自定义配额、专属客户支持、API 接入、私有部署选项、定制化 AI 模型
                </div>
              </div>
            </div>
            <InfoBox>
              点击顶栏的 <Tag style={{ fontFamily: "'JetBrains Mono', monospace" }}>Upgrade Pro</Tag> 按钮可查看详细价格和升级。
            </InfoBox>
          </div>
        ),
      },
    ],
  },

  /* ---- 10. 常见问题 ---- */
  {
    key: 'faq',
    icon: <QuestionCircleOutlined />,
    title: '常见问题',
    sections: [
      {
        key: 'faq-list',
        title: 'FAQ',
        content: (
          <div className={styles.faqSection}>
            <div className={styles.faqCard}>
              <Collapse
                bordered={false}
                expandIconPosition="end"
                items={[
                  {
                    key: '1',
                    label: '视频生成需要多长时间？',
                    children: (
                      <p>
                        标准模式下，一个 30 秒的视频通常需要 3-10 分钟。生成时间取决于视频长度、
                        分辨率、素材数量等因素。快速模式可以缩短到 1-3 分钟，但画质会有所降低。
                        高质量模式可能需要 10-20 分钟。
                      </p>
                    ),
                  },
                  {
                    key: '2',
                    label: '支持哪些电商平台？',
                    children: (
                      <p>
                        目前支持 TikTok Shop、Shopify、速卖通 (AliExpress)、Shopee、Lazada 等主流
                        电商平台的商品链接解析。如果您的平台不在列表中，可以手动上传商品图片和描述信息，
                        AI 同样可以基于这些素材生成视频。
                      </p>
                    ),
                  },
                  {
                    key: '3',
                    label: '游客模式下能做什么？',
                    children: (
                      <p>
                        游客模式可以体验 VidCraft 的核心功能流程，包括创建项目、上传素材、
                        AI 剧本生成和视频渲染。但每日有配额限制（3 个项目、1 个视频），
                        生成的视频带有水印，且数据不会持久保存。建议注册账号以获得完整体验。
                      </p>
                    ),
                  },
                  {
                    key: '4',
                    label: '生成失败怎么办？',
                    children: (
                      <p>
                        首先查看失败原因提示，常见问题包括素材不清晰、AI 解析超时、音频生成失败等。
                        修复问题后点击"重试"按钮即可重新渲染。每个分镜支持独立重试，系统最多自动重试 2 次。
                        如果问题持续，请联系客服并提供项目 ID。
                      </p>
                    ),
                  },
                  {
                    key: '5',
                    label: '如何提高视频质量？',
                    children: (
                      <p>
                        建议从以下方面提升视频质量：<br />
                        (1) 使用高清素材（至少 1080p 分辨率）；<br />
                        (2) 在自定义要求中详细描述您的需求和目标受众；<br />
                        (3) 尝试不同的创作因子组合，通过数据分析找到最佳配置；<br />
                        (4) 参考基因库中的爆款模板风格，使用爆款仿写模式；<br />
                        (5) 确保素材光线充足、背景干净、商品主体清晰。
                      </p>
                    ),
                  },
                  {
                    key: '6',
                    label: '素材有什么格式要求？',
                    children: (
                      <p>
                        图片：支持 JPG、PNG、WebP 格式，最大 20MB，建议 1080 × 1080 像素或更高。<br />
                        视频：支持 MP4、MOV、AVI 格式，最大 500MB，建议 1920 × 1080（横屏）或 1080 × 1920（竖屏），
                        时长不超过 60 秒。推荐使用竖屏比例（9:16）以适应 TikTok 平台。
                      </p>
                    ),
                  },
                  {
                    key: '7',
                    label: '如何取消正在进行的生成？',
                    children: (
                      <p>
                        在视频创作页面，点击生成进度条旁边的"取消"按钮即可终止渲染。
                        取消后的项目状态会回退到"待生成"状态，您可以在修改剧本或素材后重新提交生成。
                      </p>
                    ),
                  },
                  {
                    key: '8',
                    label: '视频中的水印如何去除？',
                    children: (
                      <p>
                        游客模式下生成的视频会带有 VidCraft 水印。注册并登录账号后，
                        即使是免费版用户，生成的所有视频也都不会带有水印。只需完成注册即可享受无水印体验。
                      </p>
                    ),
                  },
                  {
                    key: '9',
                    label: '创作因子会影响什么？',
                    children: (
                      <p>
                        创作因子会影响 AI 生成剧本的各个方面：<br />
                        · 视觉风格决定画面美学方向（色调、质感、构图偏好）；<br />
                        · 开场方式决定视频开头吸引观众的手段；<br />
                        · 旁白风格影响配音的语气和表达方式；<br />
                        · 节奏控制剪辑和画面切换速度；<br />
                        · CTA 决定视频结尾的转化引导方式。<br />
                        合理配置这些因子可以显著提升视频效果，建议根据目标受众和产品特点进行调整。
                      </p>
                    ),
                  },
                  {
                    key: '10',
                    label: '如何联系客服？',
                    children: (
                      <p>
                        您可以通过以下方式联系 VidCraft 客服团队：<br />
                        · 邮件：support@vidcraft.ai<br />
                        · 在线客服：工作时间（9:00-18:00 北京时间）在页面右下角点击客服图标<br />
                        · 工单系统：在账户设置页面提交工单，我们会在 24 小时内回复
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        ),
      },
    ],
  },
];

/* ================================================================
   Help page component
   ================================================================ */

export default function Help() {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;

    const query = searchQuery.toLowerCase();
    return CATEGORIES
      .map((cat) => {
        const matchingSections = cat.sections.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            (typeof (s as any)._searchText === 'string' &&
              (s as any)._searchText.toLowerCase().includes(query)),
        );
        const titleMatch = cat.title.toLowerCase().includes(query);
        return {
          ...cat,
          sections: titleMatch ? cat.sections : matchingSections,
          _match: titleMatch || matchingSections.length > 0,
        };
      })
      .filter((cat) => cat._match);
  }, [searchQuery]);

  const handleCategoryClick = (key: string) => {
    setActiveCategory(key);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>帮助中心</h1>
          <p className={styles.headerSubtitle}>
            了解 VidCraft 的各项功能，快速上手 AI 视频创作
          </p>
        </div>
        <div className={styles.searchWrap}>
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="搜索帮助内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className={styles.layout}>
        {/* Sidebar navigation */}
        <aside className={styles.sidebarNav}>
          <div className={styles.navSectionTitle}>功能指引</div>
          {filteredCategories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`${styles.navItem} ${
                !isSearching && activeCategory === cat.key ? styles.navItemActive : ''
              }`}
              onClick={() => handleCategoryClick(cat.key)}
            >
              <span className={styles.navItemIcon}>{cat.icon}</span>
              {cat.title}
            </button>
          ))}
        </aside>

        {/* Content panel */}
        <div className={styles.contentArea} ref={contentRef}>
          {filteredCategories.length === 0 ? (
            <div className={styles.emptyWrap}>
              <Empty description="未找到相关帮助内容，请尝试其他关键词" />
            </div>
          ) : (
            filteredCategories
              .filter((cat) => isSearching || activeCategory === cat.key)
              .map((cat) => (
                <div key={cat.key} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{cat.title}</h2>
                  {cat.sections.map((section) => (
                    <div key={section.key} className={styles.subSection}>
                      <h3 className={styles.subSectionTitle}>{section.title}</h3>
                      {section.content}
                    </div>
                  ))}
                </div>
              ))
          )}

          {/* Footer */}
          <footer className={styles.footer}>
            <span>© 2026 VidCraft AI Workstation. 让视频营销更简单。</span>
            <div>
              <a href="#">服务条款</a>
              <a href="#">隐私政策</a>
              <a href="#">联系我们</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

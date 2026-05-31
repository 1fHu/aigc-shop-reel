import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, App } from 'antd';
import {
  PictureOutlined,
  FileTextOutlined,
  FireOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

import { projectService } from '@/services/projectService';
import { videoService } from '@/services/videoService';
import type { ProjectListItem } from '@/types';
import styles from './ProjectEntryModal.module.css';

interface Props {
  open: boolean;
  /** 当前点击的项目（任意已有项目点击后进入此弹框） */
  project: ProjectListItem | null;
  /** 关闭弹框（右上角 X / 蒙层点击）→ 返回项目列表 */
  onClose: () => void;
}

interface Entry {
  key: string;
  title: string;
  desc: string;
  icon: ReactNode;
}

/**
 * 已完成项目的「工作台入口」弹框
 *
 * 从项目列表点击任意 **已有** 项目时弹出，提供四个子模块入口：
 * 素材库 / 分镜编辑·剧本 / 风格·爆款选择 / Video。
 *
 * 入口跳转：
 *   - 视频创作：查项目最新视频任务——有任务（生成中/已完成/失败）→ 视频页（页面按状态显示
 *     播放 / 渲染进度 / 失败重试）；无任务 → 提示「还没有视频任务」。
 *   - 风格模板：跳到剧本生成页（ScriptStudio）。
 *   - 分镜编辑 / 剧本：拉项目详情，script_count>0 → 剧本编辑页；否则提示「尚未完成」。
 *   - 素材库：进入项目素材库。
 * 右上角 X（Modal 内置 close）关闭弹框即返回项目列表。
 * 新建项目流程不走此弹框，仍由 NewProjectModal 处理。
 */
const ENTRIES: Entry[] = [
  { key: 'materials', title: '素材库',       desc: '上传商品图，AI 解析卖点',   icon: <PictureOutlined /> },
  { key: 'style',     title: '风格模板',      desc: '挑选视频风格与爆款模板',     icon: <FireOutlined /> },
  { key: 'video',     title: '视频创作',      desc: '一键生成带货短视频',         icon: <PlayCircleOutlined /> },
  { key: 'script',    title: '分镜编辑',      desc: '编辑分镜脚本与配音文案',     icon: <FileTextOutlined /> },
];

export default function ProjectEntryModal({ open, project, onClose }: Props) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  // pending：分镜/剧本入口需先拉项目详情判断，期间禁用按钮防重复点击
  const [pending, setPending] = useState(false);

  const handleEntry = async (entry: Entry) => {
    if (!project || pending) return;
    const pid = project.id;

    switch (entry.key) {
      // 视频创作：查最新视频任务——有任务（生成中/已完成/失败）→ 视频页；无任务 → 提示
      case 'video':
        setPending(true);
        try {
          const latest = await videoService.getLatestByProject(pid);
          if (!latest) {
            message.warning('还没有视频任务');
          } else {
            onClose();
            navigate(`/projects/${pid}/video`);
          }
        } catch {
          /* 拦截器已 toast */
        } finally {
          setPending(false);
        }
        return;

      case 'materials':
        onClose();
        navigate(`/projects/${pid}/materials`);
        return;

      // 风格模板 → 剧本生成页
      case 'style':
        onClose();
        navigate(`/projects/${pid}/script`);
        return;

      // 分镜编辑 / 剧本：拉详情看 script_count，已生成 → 剧本编辑页；否则提示未完成
      case 'script':
        setPending(true);
        try {
          const detail = await projectService.detail(pid);
          if ((detail.script_count ?? 0) > 0) {
            onClose();
            navigate(`/projects/${pid}/script`);
          } else {
            message.warning('分镜 / 剧本尚未完成');
          }
        } catch {
          /* 拦截器已 toast */
        } finally {
          setPending(false);
        }
        return;

      default:
        message.info(`「${entry.title}」功能开发中`);
    }
  };

  return (
    <Modal
      open={open}
      title={project ? `项目：${project.name}` : '项目工作台'}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnClose
    >
      <p className={styles.hint}>选择要进入的工作模块</p>
      <div className={styles.grid}>
        {ENTRIES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={styles.entry}
            disabled={pending}
            onClick={() => handleEntry(entry)}
          >
            <span className={styles.entryIcon}>{entry.icon}</span>
            <span className={styles.entryTitle}>{entry.title}</span>
            <span className={styles.entryDesc}>{entry.desc}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

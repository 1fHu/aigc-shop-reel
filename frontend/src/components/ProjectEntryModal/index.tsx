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
 *   - Video：已完成生成 → 视频播放页；否则提示「视频还未生成」。
 *   - 分镜编辑 / 剧本：拉项目详情，script_count>0 → 剧本编辑页；否则提示「尚未完成」。
 *   - 风格 / 爆款选择：跳到商品信息上传/解析页（product-parse）。
 *   - 素材库：跳转尚未实现，先占位提示。
 * 右上角 X（Modal 内置 close）关闭弹框即返回项目列表。
 * 新建项目流程不走此弹框，仍由 NewProjectModal 处理。
 */
const ENTRIES: Entry[] = [
  { key: 'materials', title: '素材库',        desc: '管理项目图片 / 视频素材',   icon: <PictureOutlined /> },
  { key: 'script',    title: '分镜编辑 / 剧本', desc: '编辑分镜脚本与口播文案',     icon: <FileTextOutlined /> },
  { key: 'style',     title: '风格 / 爆款选择', desc: '挑选视频风格与爆款模板',     icon: <FireOutlined /> },
  { key: 'video',     title: 'Video',          desc: '查看 / 生成成片',           icon: <PlayCircleOutlined /> },
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
      // Video：已完成生成 → 播放页；否则提示未生成
      case 'video':
        if (project.status === 'completed') {
          onClose();
          navigate(`/projects/${pid}/video`);
        } else {
          message.warning('视频还未生成');
        }
        return;

      // 风格 / 爆款选择 → 商品信息上传/解析页
      case 'style':
        onClose();
        navigate(`/projects/${pid}/product-parse`);
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

      // 其余入口（素材库）跳转尚未实现，先占位
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

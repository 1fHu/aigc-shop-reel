import { Modal, App } from 'antd';
import {
  PictureOutlined,
  FileTextOutlined,
  FireOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

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
 * 注意：四个入口的跳转功能尚未实现，当前仅完成前端设计（见各 onClick 占位）。
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
  const { message } = App.useApp();

  // TODO(project-entry): 四个入口的跳转尚未实现，先占位。后续按 key 路由：
  //   materials → /projects/:id/materials，script → /projects/:id/script，
  //   video → /projects/:id/video，style → 风格/爆款选择页（待定）。
  const handleEntry = (entry: Entry) => {
    message.info(`「${entry.title}」功能开发中`);
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

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AutoComplete, Input, Spin } from 'antd';
import {
  SearchOutlined,
  FolderOpenOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
} from '@ant-design/icons';

import { projectService } from '@/services/projectService';
import { materialService } from '@/services/materialService';
import type { MaterialGlobalSearchItem, ProjectListItem } from '@/types';
import styles from './GlobalSearch.module.css';

const DEBOUNCE_MS = 300;

/**
 * 顶栏全局搜索：按关键词同时检索「项目名称」与「素材库文件名/标签」，
 * 结果分组下拉展示，点击跳转到对应项目 / 项目素材库。
 *
 * - 项目：projectService.list({ keyword }) （后端已支持 keyword 模糊匹配）
 * - 素材：materialService.globalSearch（跨项目，按 file_name / tags 模糊匹配）
 */
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [materials, setMaterials] = useState<MaterialGlobalSearchItem[]>([]);

  const timer = useRef<number | undefined>(undefined);
  // 防止「先发后到」的过期响应覆盖新结果
  const reqId = useRef(0);

  const runSearch = (kw: string) => {
    const q = kw.trim();
    if (!q) {
      setProjects([]);
      setMaterials([]);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    Promise.allSettled([
      projectService.list({ keyword: q, page: 1, limit: 6 }),
      materialService.globalSearch(q, 'all', 8),
    ]).then(([p, m]) => {
      if (id !== reqId.current) return;
      setProjects(p.status === 'fulfilled' ? p.value : []);
      setMaterials(m.status === 'fulfilled' ? m.value : []);
      setLoading(false);
    });
  };

  const handleChange = (v: string) => {
    setValue(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => runSearch(v), DEBOUNCE_MS);
  };

  const handleSelect = (val: string) => {
    // val 形如 "project|<projectId>" 或 "material|<projectId>|<materialId>"
    const [kind, projectId] = val.split('|');
    if (kind === 'project' || kind === 'material') {
      navigate(`/projects/${projectId}/materials`);
    }
    setValue('');
    setProjects([]);
    setMaterials([]);
  };

  const options = useMemo(() => {
    const groups: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[] }[] = [];

    if (projects.length) {
      groups.push({
        label: <span className={styles.groupTitle}>项目</span>,
        options: projects.map((p) => ({
          value: `project|${p.id}`,
          label: (
            <div className={styles.option}>
              <FolderOpenOutlined className={styles.optIcon} />
              <span className={styles.optName}>{p.name}</span>
              <span className={styles.optMeta}>{p.video_count} 视频</span>
            </div>
          ),
        })),
      });
    }

    if (materials.length) {
      groups.push({
        label: <span className={styles.groupTitle}>素材</span>,
        options: materials.map((m) => ({
          value: `material|${m.project_id}|${m.id}`,
          label: (
            <div className={styles.option}>
              {m.file_type === 'video' ? (
                <VideoCameraOutlined className={styles.optIcon} />
              ) : (
                <FileImageOutlined className={styles.optIcon} />
              )}
              <span className={styles.optName}>{m.file_name || '未命名素材'}</span>
              <span className={styles.optMeta}>{m.project_name}</span>
            </div>
          ),
        })),
      });
    }

    return groups;
  }, [projects, materials]);

  const notFound =
    value.trim() && !loading && projects.length === 0 && materials.length === 0
      ? <span className={styles.empty}>未找到相关项目或素材</span>
      : null;

  return (
    <AutoComplete
      value={value}
      options={options}
      onChange={handleChange}
      onSelect={handleSelect}
      popupMatchSelectWidth={380}
      notFoundContent={loading ? <Spin size="small" /> : notFound}
      style={{ width: '100%' }}
    >
      <Input
        prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
        suffix={loading ? <Spin size="small" /> : <span />}
        placeholder="搜索我的项目..."
        variant="filled"
        allowClear
      />
    </AutoComplete>
  );
}

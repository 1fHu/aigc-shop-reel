import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, Form, Button, App } from 'antd';

import { projectService } from '@/services/projectService';
import type { ProjectListItem } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 创建成功回调（如父组件需要刷新列表） */
  onCreated?: (project: ProjectListItem) => void;
}

/**
 * 新建项目 Modal
 * 在 Dashboard / Projects 两处使用
 */
export default function NewProjectModal({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ name: string; description?: string }>();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    form.resetFields();
    onClose();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const project = await projectService.create({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      message.success('项目已创建');
      onCreated?.(project);
      form.resetFields();
      onClose();
      // 创建后进入商品解析阶段
      navigate(`/projects/${project.id}/product-parse`);
    } catch (err) {
      // 表单校验错误或拦截器已 toast 网络错误
      if (!(err instanceof Error)) return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="新建项目"
      onCancel={handleClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose} disabled={loading}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>
            创建并开始
          </Button>
        </div>
      }
      destroyOnClose
      width={460}
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="项目名称"
          rules={[
            { required: true, message: '请输入项目名称' },
            { max: 60, message: '不超过 60 个字符' },
          ]}
        >
          <Input placeholder="如：夏日防晒霜推广" autoFocus />
        </Form.Item>
        <Form.Item name="description" label="项目描述（可选）">
          <Input.TextArea rows={3} placeholder="一句话概括项目目标..." maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

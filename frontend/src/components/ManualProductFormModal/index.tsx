import { useState } from 'react';
import { Modal, Form, Input, Select, Button, App, Space } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

import { productService } from '@/services/productService';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ParsedProduct,
  type ProductCategory,
  type UpdateProductPayload,
} from '@/types';

interface Props {
  open: boolean;
  projectId: string;
  /** 已有商品（带入表单初值；空表示新填） */
  initialValue?: ParsedProduct | null;
  onClose: () => void;
  onSaved: (product: ParsedProduct) => void;
}

interface FormValues {
  name: string;
  category: ProductCategory;
  selling_points: { value: string }[];
  target_audience?: string;
  usage_scene?: string;
  price_anchor?: string;
}

/**
 * 手动填写 / 更新商品信息 Modal
 * 调用 PUT /api/products/:project_id 绕过 AI 解析
 */
export default function ManualProductFormModal({
  open, projectId, initialValue, onClose, onSaved,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: UpdateProductPayload = {
        name: values.name.trim(),
        category: values.category,
        selling_points: values.selling_points
          .map((p) => p.value?.trim())
          .filter((v): v is string => !!v),
        target_audience: values.target_audience?.trim() || undefined,
        usage_scene:     values.usage_scene?.trim() || undefined,
        price_anchor:    values.price_anchor?.trim() || undefined,
      };

      // 客户端再校验一次 selling_points（清空空白后可能少于 1）
      if (payload.selling_points.length === 0) {
        message.warning('请至少填写一条核心卖点');
        return;
      }

      setSubmitting(true);
      const result = await productService.update(projectId, payload);
      message.success('商品信息已保存');
      onSaved(result);
      form.resetFields();
      onClose();
    } catch (err) {
      // 表单校验错误：antd 已经在字段下方红字提示
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      // 网络错误：拦截器已 toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    form.resetFields();
    onClose();
  };

  // 初始值
  const initialFormValues: Partial<FormValues> = initialValue ? {
    name: initialValue.name,
    category: (PRODUCT_CATEGORIES as readonly string[]).includes(initialValue.category)
      ? (initialValue.category as ProductCategory)
      : undefined,
    selling_points: (initialValue.selling_points || []).map((v) => ({ value: v })),
    target_audience: initialValue.target_audience,
    usage_scene: initialValue.usage_scene,
    price_anchor: initialValue.price_anchor,
  } : {
    selling_points: [{ value: '' }],   // 默认一条空卖点
  };

  return (
    <Modal
      open={open}
      title={initialValue ? '编辑商品信息' : '手动填写商品信息'}
      onCancel={handleClose}
      width={560}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleClose} disabled={submitting}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            保存并继续
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark
        initialValues={initialFormValues}
        style={{ marginTop: 12 }}
      >
        <Form.Item
          name="name"
          label="商品名称"
          rules={[
            { required: true, message: '请输入商品名称' },
            { max: 200, message: '不超过 200 个字符' },
          ]}
        >
          <Input placeholder="如：XX SPF50+ 防晒霜 50ml" autoFocus />
        </Form.Item>

        <Form.Item
          name="category"
          label="品类"
          rules={[{ required: true, message: '请选择品类' }]}
        >
          <Select
            placeholder="选择商品所属品类"
            options={PRODUCT_CATEGORIES.map((c) => ({
              value: c,
              label: PRODUCT_CATEGORY_LABELS[c],
            }))}
          />
        </Form.Item>

        <Form.Item label="核心卖点（1-5 条）" required>
          <Form.List
            name="selling_points"
            rules={[
              {
                validator: async (_, items: { value: string }[]) => {
                  const valid = (items || []).filter((it) => it?.value?.trim());
                  if (valid.length === 0) return Promise.reject(new Error('请至少填写一条核心卖点'));
                  if (valid.length > 5) return Promise.reject(new Error('最多 5 条核心卖点'));
                  return Promise.resolve();
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {fields.map((field, i) => (
                  <Space key={field.key} style={{ width: '100%' }} align="baseline">
                    <Form.Item
                      {...field}
                      name={[field.name, 'value']}
                      style={{ marginBottom: 0, flex: 1 }}
                      rules={[
                        { max: 100, message: '不超过 100 个字符' },
                      ]}
                    >
                      <Input
                        placeholder={`卖点 ${i + 1}（如：SPF50+ PA++++）`}
                        style={{ width: 380 }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => remove(field.name)}
                        aria-label="删除"
                      />
                    )}
                  </Space>
                ))}
                {fields.length < 5 && (
                  <Button
                    type="dashed"
                    onClick={() => add({ value: '' })}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    添加卖点（{fields.length}/5）
                  </Button>
                )}
                <Form.ErrorList errors={errors} />
              </Space>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item
          name="target_audience"
          label="目标人群"
          rules={[{ max: 200, message: '不超过 200 个字符' }]}
        >
          <Input.TextArea rows={2} placeholder="如：18-30 岁都市女性" maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          name="usage_scene"
          label="使用场景"
          rules={[{ max: 200, message: '不超过 200 个字符' }]}
        >
          <Input.TextArea rows={2} placeholder="如：户外运动、日常出行" maxLength={200} showCount />
        </Form.Item>

        <Form.Item
          name="price_anchor"
          label="价格锚点"
          rules={[{ max: 100, message: '不超过 100 个字符' }]}
        >
          <Input placeholder="如：原价 ¥199，现 ¥89" maxLength={100} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Tabs, Upload, App } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

import { useAuthStore, selectUser, selectIsGuest } from '@/stores/authStore';
import { authService } from '@/services/authService';
import styles from './Account.module.css';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function AccountPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const user = useAuthStore(selectUser);
  const isGuest = useAuthStore(selectIsGuest);
  const updateUser = useAuthStore((s) => s.updateUser);

  const activeTab = searchParams.get('tab') || 'profile';

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key }, { replace: true });
  };

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setProfileSaving(true);
      const updated = await authService.updateProfile({ nickname: values.nickname });
      updateUser(updated);
      message.success('个人资料已更新');
    } catch {
      // validation error already shown by Form
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      message.error('仅支持 JPG/PNG/WebP 格式的头像');
      return false;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      message.error('头像文件不能超过 5MB');
      return false;
    }
    handleUploadAvatar(file);
    return false;
  };

  const handleUploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    try {
      const result = await authService.uploadAvatar(file);
      updateUser({ avatar_url: result.avatar_url });
      message.success('头像已更新');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setPasswordSaving(true);
      await authService.changePassword(values);
      message.success('密码已修改，请重新登录');
      passwordForm.resetFields();
      navigate('/login', { replace: true });
    } catch {
      // validation error already shown by Form
    } finally {
      setPasswordSaving(false);
    }
  };

  const avatarLetter = (user?.nickname || 'V').slice(0, 1).toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>账户设置</h1>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'profile',
            label: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                个人资料
              </span>
            ),
            children: (
              <div className={styles.formSection}>
                <div className={styles.avatarSection}>
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className={styles.avatarPreview} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{avatarLetter}</div>
                  )}
                  <Upload
                    beforeUpload={handleAvatarBeforeUpload}
                    showUploadList={false}
                    accept="image/jpeg,image/png,image/webp"
                  >
                    <Button icon={<UploadOutlined />} loading={avatarUploading}>
                      上传新头像
                    </Button>
                  </Upload>
                </div>

                <Form
                  form={profileForm}
                  layout="vertical"
                  initialValues={{ nickname: user?.nickname || '' }}
                >
                  <Form.Item
                    name="nickname"
                    label="用户名"
                    rules={[
                      { required: true, message: '请输入用户名' },
                      { min: 2, max: 30, message: '用户名需 2-30 个字符' },
                    ]}
                  >
                    <Input placeholder="输入新的用户名" />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={handleSaveProfile}
                      loading={profileSaving}
                    >
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            ),
          },
          {
            key: 'security',
            label: (
              <span>
                <LockOutlined style={{ marginRight: 6 }} />
                安全设置
              </span>
            ),
            disabled: isGuest,
            children: isGuest ? (
              <div className={styles.guestNotice}>
                游客模式不支持修改密码。请登录或注册账号。
              </div>
            ) : (
              <div className={styles.formSection}>
                <Form
                  form={passwordForm}
                  layout="vertical"
                >
                  <Form.Item
                    name="currentPassword"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password placeholder="输入当前密码" />
                  </Form.Item>

                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 8, message: '密码至少 8 位' },
                      {
                        pattern: /[a-zA-Z]/,
                        message: '密码须包含字母',
                      },
                      {
                        pattern: /[0-9]/,
                        message: '密码须包含数字',
                      },
                    ]}
                  >
                    <Input.Password placeholder="至少 8 位，须包含字母与数字" />
                  </Form.Item>

                  <Form.Item
                    name="confirmNewPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请再次输入新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="再次输入新密码" />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={handleChangePassword}
                      loading={passwordSaving}
                    >
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            ),
          },
          {
            key: 'preferences',
            label: '偏好设置',
            children: (
              <div className={styles.guestNotice}>
                偏好设置即将上线，敬请期待。
              </div>
            ),
          },
        ]}
        className={styles.tabs}
      />
    </div>
  );
}

import type { ThemeConfig } from 'antd';

/**
 * VidCraft 全局设计 tokens
 * 与 Figma 设计稿严格对齐，所有页面通过 ConfigProvider 自动应用
 */
export const theme: ThemeConfig = {
  token: {
    // Brand（与 DESIGN.md / prototype.html 对齐）
    colorPrimary: '#4648D4',           // 主色（Indigo）
    colorInfo: '#6366F1',              // 次主色（浅 Indigo，链接强调）
    colorSuccess: '#10B981',           // 成功 / Completed pill
    colorWarning: '#F59E0B',           // 警告 / Generating pill
    colorError: '#EF4444',             // 错误 / Failed pill

    // Backgrounds
    colorBgLayout: '#F8FAFC',          // 页面外层背景
    colorBgContainer: '#FFFFFF',       // 卡片 / 容器背景

    // Text
    colorText: '#111827',              // 主文字
    colorTextSecondary: '#6B7280',     // 次文字
    colorTextTertiary: '#9CA3AF',      // 弱文字
    colorBorder: '#E5E7EB',            // 边框（极少用）

    // Radius
    borderRadius: 12,                  // 卡片默认
    borderRadiusLG: 16,                // 大卡片
    borderRadiusSM: 8,                 // 按钮、输入框

    // Spacing
    paddingContentHorizontal: 24,

    // Typography
    fontFamily:
      '"Inter", "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontWeightStrong: 600,

    // Shadow（柔和单层投影）
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.06)',

    // Motion
    motionDurationMid: '0.2s',
  },

  components: {
    // Layout（侧边栏白底，区别于默认深色）
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#F8FAFC',
      headerHeight: 64,
      headerPadding: '0 24px',
    },

    // Menu（侧边栏菜单：白底 + 浅紫选中态）
    Menu: {
      itemBg: '#FFFFFF',
      itemSelectedBg: '#EEF2FF',
      itemSelectedColor: '#4648D4',
      itemHoverBg: '#F5F3FF',
      itemHoverColor: '#4648D4',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },

    // Button
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      fontWeight: 500,
    },

    // Card
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
      headerHeight: 56,
    },

    // Statistic
    Statistic: {
      contentFontSize: 32,
      titleFontSize: 14,
    },

    // Tag（status pill）
    Tag: {
      borderRadiusSM: 999,
    },
  },
};

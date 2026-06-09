import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

const Projects = lazy(() => import('./pages/Projects'));
const MaterialLibrary = lazy(() => import('./pages/MaterialLibrary'));
const ScriptStudio = lazy(() => import('./pages/ScriptStudio'));
const VideoCreation = lazy(() => import('./pages/VideoCreation'));
const Analytics = lazy(() => import('./pages/Analytics'));
const GeneBank = lazy(() => import('./pages/GeneBank'));
const ViralAnalyzer = lazy(() => import('./pages/ViralAnalyzer'));
const ViralAnalyzerDetail = lazy(() => import('./pages/ViralAnalyzer/detail'));
const Help = lazy(() => import('./pages/Help'));
const Account = lazy(() => import('./pages/Account'));
const Subscription = lazy(() => import('./pages/Subscription'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Spin style={{ display: 'block', marginTop: 120 }} size="large" />}>{children}</Suspense>;
}

/**
 * 路由设计：
 *   /login                      — 公共
 *   /                           — Dashboard
 *   /projects                   — 项目列表
 *   /projects/:id/...           — 项目内子页（直链用，从项目卡片点进去）
 *   /script-studio etc.         — 顶层快捷入口（sidebar 导航用，?projectId= 可选）
 *
 * 项目列表点击交互：
 *   - 点击任意「已有项目」→ 弹出工作台入口弹框 ProjectEntryModal
 *     （素材库 / 分镜编辑·剧本 / 风格模板 / Video 四个入口）
 *   - 仅「新建项目」按钮走创建流程（NewProjectModal → /projects/:id/materials）
 *
 * 项目级页面同时支持「项目嵌套」和「顶层带 query」两种 URL，
 * 业务代码统一从 useParams / useSearchParams 取项目 id（后续真接入时再细化）。
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          {/* 全局页面 */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Lazy><Projects /></Lazy>} />
          <Route path="/analytics" element={<Lazy><Analytics /></Lazy>} />
          <Route path="/help" element={<Lazy><Help /></Lazy>} />
          <Route path="/gene-bank" element={<Lazy><GeneBank /></Lazy>} />
          <Route path="/viral-library" element={<Navigate to="/gene-bank" replace />} />
          <Route path="/viral-analyzer" element={<Lazy><ViralAnalyzer /></Lazy>} />
          <Route path="/viral-analyzer/:id" element={<Lazy><ViralAnalyzerDetail /></Lazy>} />

          {/* 快捷入口（无需项目 ID） */}
          <Route path="/account" element={<Lazy><Account /></Lazy>} />
          <Route path="/subscription" element={<Lazy><Subscription /></Lazy>} />
          <Route path="/script-studio" element={<Lazy><ScriptStudio /></Lazy>} />

          {/* 项目内子页：素材库 → 分镜编辑 → 视频创作 */}
          <Route path="/projects/:id/materials"    element={<Lazy><MaterialLibrary /></Lazy>} />
          <Route path="/projects/:id/script"       element={<Lazy><ScriptStudio /></Lazy>} />
          <Route path="/projects/:id/video"        element={<Lazy><VideoCreation /></Lazy>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

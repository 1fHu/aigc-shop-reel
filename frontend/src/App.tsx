import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import MaterialLibrary from './pages/MaterialLibrary';
import ScriptStudio from './pages/ScriptStudio';
import VideoCreation from './pages/VideoCreation';
import Analytics from './pages/Analytics';
import GeneBank from './pages/GeneBank';
import ViralAnalyzer from './pages/ViralAnalyzer';
import ViralAnalyzerDetail from './pages/ViralAnalyzer/detail';
import Help from './pages/Help';

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
          <Route path="/projects" element={<Projects />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
          <Route path="/gene-bank" element={<GeneBank />} />
          <Route path="/viral-library" element={<Navigate to="/gene-bank" replace />} />
          <Route path="/viral-analyzer" element={<ViralAnalyzer />} />
          <Route path="/viral-analyzer/:id" element={<ViralAnalyzerDetail />} />

          {/* 快捷入口（无需项目 ID） */}
          <Route path="/script-studio" element={<ScriptStudio />} />

          {/* 项目内子页：素材库 → 分镜编辑 → 视频创作 */}
          <Route path="/projects/:id/materials"    element={<MaterialLibrary />} />
          <Route path="/projects/:id/script"       element={<ScriptStudio />} />
          <Route path="/projects/:id/video"        element={<VideoCreation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

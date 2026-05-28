import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProductParse from './pages/ProductParse';
import MaterialLibrary from './pages/MaterialLibrary';
import ScriptStudio from './pages/ScriptStudio';
import VideoCreation from './pages/VideoCreation';
import Analytics from './pages/Analytics';
import ViralLibrary from './pages/ViralLibrary';
import GeneBank from './pages/GeneBank';

/**
 * 路由设计：
 *   /login                      — 公共
 *   /                           — Dashboard
 *   /projects                   — 项目列表
 *   /projects/:id/...           — 项目内子页（直链用，从项目卡片点进去）
 *   /script-studio etc.         — 顶层快捷入口（sidebar 导航用，?projectId= 可选）
 *
 * 项目级页面同时支持「项目嵌套」和「顶层带 query」两种 URL，
 * 业务代码统一从 useParams / useSearchParams 取项目 id（后续真接入时再细化）。
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          {/* 全局页面 */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/gene-bank" element={<GeneBank />} />
          <Route path="/viral-library" element={<ViralLibrary />} />

          {/* 项目级页面 —— 顶层入口（sidebar 用） */}
          <Route path="/product-parse"  element={<ProductParse />} />
          <Route path="/script-studio"  element={<ScriptStudio />} />
          <Route path="/video-creation" element={<VideoCreation />} />
          <Route path="/materials"      element={<MaterialLibrary />} />

          {/* 项目级页面 —— 项目嵌套（从项目卡点进去用） */}
          <Route path="/projects/:id/product-parse" element={<ProductParse />} />
          <Route path="/projects/:id/script"        element={<ScriptStudio />} />
          <Route path="/projects/:id/video"         element={<VideoCreation />} />
          <Route path="/projects/:id/materials"     element={<MaterialLibrary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

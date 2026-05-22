import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProductParse from './pages/ProductParse';
import MaterialLibrary from './pages/MaterialLibrary';
import ScriptStudio from './pages/ScriptStudio';
import VideoCreation from './pages/VideoCreation';
import Analytics from './pages/Analytics';
import ViralLibrary from './pages/ViralLibrary';
import GeneBank from './pages/GeneBank';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id/product-parse" element={<ProductParse />} />
          <Route path="/projects/:id/materials" element={<MaterialLibrary />} />
          <Route path="/projects/:id/script" element={<ScriptStudio />} />
          <Route path="/projects/:id/video" element={<VideoCreation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/viral-library" element={<ViralLibrary />} />
          <Route path="/gene-bank" element={<GeneBank />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

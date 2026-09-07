import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EntityDetail from './pages/EntityDetail'
import Upload from './pages/Upload'   


export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entities/:id" element={<EntityDetail />} />
           <Route path="/upload" element={<Upload />} /> 
        </Route>
      </Routes>
    </HashRouter>
  )
}


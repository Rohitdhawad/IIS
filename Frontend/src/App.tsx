import { HashRouter, Routes, Route } from 'react-router-dom'

import Landing from './pages/Landing'
import Login from './pages/Login'
import CaseManagement from './pages/CaseManagementPage'
import CreateCase from './pages/CreateCase'

import CaseWorkspaceLayout from './components/CaseWorkspaceLayout'

import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Entities from './pages/Entities'
import EntityDetail from './pages/EntityDetail'
import Relationships from './pages/Relationships'
import NetworkAnalysis from './pages/NetworkAnalysis'
import Timeline from './pages/Timeline'
import GraphVersions from './pages/GraphVersions'


function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '40px' }}>
      <div className="eyebrow">CASE WORKSPACE</div>

      <h2>{title}</h2>

      <p className="intro-text">
        This investigation module will be connected next.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>

        {/* =========================
            PUBLIC PAGES
        ========================== */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =========================
            CASE MANAGEMENT
        ========================== */}

        <Route
          path="/cases"
          element={<CaseManagement />}
        />

        <Route
          path="/cases/create"
          element={<CreateCase />}
        />


        {/* =========================
            CASE WORKSPACE
        ========================== */}

        <Route
          path="/cases/:caseId"
          element={<CaseWorkspaceLayout />}
        >

          {/* Dashboard */}
          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          {/* Data / Reports */}
          <Route
            path="upload"
            element={<Upload />}
          />

          {/* Entities */}
          <Route
            path="entities"
            element={
              <Entities />
            }
          />

          {/* Relationships */}
          <Route
            path="relationships"
            element={
              <Relationships />
            }
          />

          {/* Network Analysis */}
          <Route
            path="network"
            element={
              <NetworkAnalysis />
            }
          />

          {/* Timeline */}
          <Route
            path="timeline"
            element={
              <Timeline />
            }
          />

          {/* Graph Versions */}
          <Route
            path="graphs"
            element={
              <GraphVersions />
            }
          />

          {/* Individual Entity */}
          <Route
            path="entities/:id"
            element={<EntityDetail />}
          />

        </Route>

      </Routes>
    </HashRouter>
  )
}
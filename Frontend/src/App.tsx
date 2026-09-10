import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import Landing from './pages/Landing'
import Login from './pages/Login'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import RecentCases from './pages/RecentCases'
import SearchCases from './pages/SearchCases'
import CaseWorkspace from './components/CaseWorkspace'
import CaseOverview from './pages/CaseOverview'
import CaseTimeline from './pages/CaseTimeline'
import CaseEvidence from './pages/CaseEvidence'
import CaseNetwork from './pages/CaseNetwork'
import CaseInsights from './pages/CaseInsights'
import CaseRelated from './pages/CaseRelated'
import CaseEntities from './pages/CaseEntities'
import CaseAudit from './pages/CaseAudit'
import EntityDetail from './pages/EntityDetail'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* ── Landing (no sidebar, no auth) ── */}
        <Route path="/" element={<Landing />} />

        {/* ── Login (teammate's implementation — navigates to /app/dashboard on success) ── */}
        <Route path="/login" element={<Login />} />

        {/* ── App shell: global sidebar (Dashboard / Recent Cases / Search) ── */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cases" element={<RecentCases />} />
          <Route path="search" element={<SearchCases />} />

          {/* ── Case Workspace: case-specific secondary sidebar ── */}
          <Route path="cases/:caseId" element={<CaseWorkspace />}>
            <Route index element={<CaseOverview />} />
            <Route path="timeline" element={<CaseTimeline />} />
            <Route path="evidence" element={<CaseEvidence />} />
            <Route path="network" element={<CaseNetwork />} />
            <Route path="insights" element={<CaseInsights />} />
            <Route path="related" element={<CaseRelated />} />
            <Route path="entities" element={<CaseEntities />} />
            <Route path="entities/:entityId" element={<EntityDetail />} />
            <Route path="audit" element={<CaseAudit />} />
          </Route>
        </Route>

        {/* ── Catch-all: back to landing ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

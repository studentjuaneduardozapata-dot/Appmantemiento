import { Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import TodayPage from '@/pages/TodayPage'
import AssetsPage from '@/pages/AssetsPage'
import AssetNewPage from '@/pages/assets/AssetNewPage'
import AreaDetailPage from '@/pages/assets/AreaDetailPage'
import AssetDetailPage from '@/pages/assets/AssetDetailPage'
import AssetEditPage from '@/pages/assets/AssetEditPage'
import SchedulePage from '@/pages/SchedulePage'
import NewPlanPage from '@/pages/schedule/NewPlanPage'
import PlanDetailPage from '@/pages/schedule/PlanDetailPage'
import EditPlanPage from '@/pages/schedule/EditPlanPage'
import IncidentsPage from '@/pages/IncidentsPage'
import IncidentNewPage from '@/pages/incidents/IncidentNewPage'
import IncidentDetailPage from '@/pages/incidents/IncidentDetailPage'
import HistoryPage from '@/pages/HistoryPage'
import ScanPage from '@/pages/ScanPage'
import AdminPage from '@/pages/AdminPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />

        {/* Assets — literal 'new' antes que :id */}
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/new" element={<AssetNewPage />} />
        <Route path="assets/area/:id" element={<AreaDetailPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="assets/:id/edit" element={<AssetEditPage />} />

        {/* Schedule */}
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="schedule/new-plan" element={<NewPlanPage />} />
        <Route path="schedule/plan/:id" element={<PlanDetailPage />} />
        <Route path="schedule/plan/:id/edit" element={<EditPlanPage />} />

        {/* Incidents — literal 'new' antes que :id */}
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/new" element={<IncidentNewPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />

        <Route path="history" element={<HistoryPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

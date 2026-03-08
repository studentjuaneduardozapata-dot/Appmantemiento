import { Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import TodayPage from '@/pages/TodayPage'
import AssetsPage from '@/pages/AssetsPage'
import SchedulePage from '@/pages/SchedulePage'
import IncidentsPage from '@/pages/IncidentsPage'
import HistoryPage from '@/pages/HistoryPage'
import SummaryPage from '@/pages/SummaryPage'
import ScanPage from '@/pages/ScanPage'
import AdminPage from '@/pages/AdminPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

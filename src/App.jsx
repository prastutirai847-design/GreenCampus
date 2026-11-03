import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import {
  GuestRoute,
  RequireAuth,
  RequireCollegeSetup,
} from './components/auth/RouteGuards.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DataEntryPage } from './pages/DataEntryPage.jsx';
import { BuildingsPage } from './pages/BuildingsPage.jsx';
import { BuildingDetailPage } from './pages/BuildingDetailPage.jsx';
import { DepartmentsPage } from './pages/DepartmentsPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { EmissionsPage } from './pages/EmissionsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { RecommendationsPage } from './pages/RecommendationsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { CollegeSetupPage } from './pages/CollegeSetupPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="setup" element={<CollegeSetupPage />} />
        <Route element={<RequireCollegeSetup />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="emissions" element={<EmissionsPage />} />
            <Route path="data-entry" element={<DataEntryPage />} />
            <Route path="buildings" element={<BuildingsPage />} />
            <Route path="buildings/:id" element={<BuildingDetailPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

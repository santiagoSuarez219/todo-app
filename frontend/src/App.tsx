import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import TodayView from './pages/TodayView';
import WeekView from './pages/WeekView';
import OverdueView from './pages/OverdueView';

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="activities/today" element={<TodayView />} />
        <Route path="activities/this-week" element={<WeekView />} />
        <Route path="activities/overdue" element={<OverdueView />} />
      </Route>
    </Routes>
  );
}

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}

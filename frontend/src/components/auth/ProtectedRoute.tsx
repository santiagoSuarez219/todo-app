import { Outlet, Navigate } from "react-router-dom";
import { useMe } from "../../hooks/useAuth";

export default function ProtectedRoute() {
  const { data: user, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-700 dark:border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

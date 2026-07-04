import { Outlet, Navigate } from "react-router-dom";
import { useMe } from "@/hooks/useAuth";

export default function ProtectedRoute() {
  const { data: user, isLoading, error } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

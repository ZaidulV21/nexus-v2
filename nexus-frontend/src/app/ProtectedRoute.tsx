import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROUTES } from '@/routes/routes';

/** Gates Admin routes behind authentication. Unauthenticated users
 *  are redirected to /login. The admin area lives under /admin/*. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, actor } = useAuth();
  const location = useLocation();

  if (isInitializing) return null;

  if (!isAuthenticated || actor?.type !== 'ADMIN') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

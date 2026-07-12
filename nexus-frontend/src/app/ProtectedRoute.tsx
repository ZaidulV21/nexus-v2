import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROUTES } from '@/routes/routes';

/** Gates Admin routes behind authentication. Client actors (if they ever
 *  hit an Admin URL) are redirected to login too - the Admin app and the
 *  Client Portal are separate auth contexts per the PRD. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, actor } = useAuth();
  const location = useLocation();

  if (isInitializing) return null;

  if (!isAuthenticated || actor?.type !== 'ADMIN') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

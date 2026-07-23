import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROUTES } from '@/routes/routes';

/** Gates Client Portal routes behind CLIENT authentication.
 *  Unauthenticated users are redirected to /login. The portal
 *  area lives under /portal/*. */
export function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, actor } = useAuth();
  const location = useLocation();

  if (isInitializing) return null;

  if (!isAuthenticated || actor?.type !== 'CLIENT') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

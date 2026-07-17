import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ROUTES } from '@/routes/routes';

/** Gates Client Portal routes behind CLIENT authentication - the mirror of
 *  ProtectedRoute (which gates the Admin app behind ADMIN authentication).
 *  An Admin actor landing on a portal URL is sent to login, matching the
 *  PRD's separation between the two surfaces. */
export function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing, actor } = useAuth();
  const location = useLocation();

  if (isInitializing) return null;

  if (!isAuthenticated || actor?.type !== 'CLIENT') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

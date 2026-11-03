import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { AuthLoadingScreen } from './AuthLoadingScreen.jsx';

export function GuestRoute() {
  const { status, user } = useAuth();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (user) {
    return <Navigate to={user.collegeSetupComplete ? '/' : '/setup'} replace />;
  }
  return <Outlet />;
}

export function RequireAuth() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
}

export function RequireCollegeSetup() {
  const { status, user } = useAuth();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.collegeSetupComplete) return <Navigate to="/setup" replace />;
  return <Outlet />;
}

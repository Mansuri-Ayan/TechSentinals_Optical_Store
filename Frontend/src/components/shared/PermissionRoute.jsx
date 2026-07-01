import { Navigate, useLocation } from 'react-router-dom';
import { useHasPermission } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/store';

/**
 * Wraps a route. Redirects to the appropriate dashboard if no permission.
 * Auto-detects route context (admin / shopkeeper / accountant).
 */
const PermissionRoute = ({ permission, children, redirectTo }) => {
  const hasPermission = useHasPermission(permission);
  const { isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return null; // Wait for auth

  if (!hasPermission) {
    // Determine fallback from current route context
    const fallback =
      redirectTo ||
      (location.pathname.startsWith('/shopkeeper')
        ? '/shopkeeper/dashboard'
        : location.pathname.startsWith('/accountant')
          ? '/accountant/dashboard'
          : '/admin/dashboard');

    return <Navigate to={fallback} replace />;
  }
  return children;
};

export default PermissionRoute;

import { Navigate, useLocation } from 'react-router-dom';
import { useHasPermission, useMyPermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/store';

/**
 * Wraps a route. Redirects to the appropriate dashboard if no permission.
 * Auto-detects route context (admin / shopkeeper / accountant).
 */
const PermissionRoute = ({ permission, children, redirectTo }) => {
  const { isLoading: isLoadingPermissions } = useMyPermissions();
  const hasPermission = useHasPermission(permission);
  const { isLoading: isLoadingAuth } = useAuthStore();
  const location = useLocation();

  if (isLoadingAuth || isLoadingPermissions) return null; // Wait for auth and permissions

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

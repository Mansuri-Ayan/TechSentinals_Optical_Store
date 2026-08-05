import { useHasPermission, useMyPermissions } from '../../hooks/usePermissions';

/**
 * Renders children only if user has the permission.
 * If not, renders null (or fallback if provided).
 */
const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { isLoading } = useMyPermissions();
  const hasPermission = useHasPermission(permission);

  if (isLoading) return null; // Wait for permissions query

  return hasPermission ? children : fallback;
};

export default PermissionGuard;

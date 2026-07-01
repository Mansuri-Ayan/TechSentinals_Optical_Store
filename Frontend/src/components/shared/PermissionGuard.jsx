import { useHasPermission } from '../../hooks/usePermissions';

/**
 * Renders children only if user has the permission.
 * If not, renders null (or fallback if provided).
 */
const PermissionGuard = ({ permission, children, fallback = null }) => {
  const hasPermission = useHasPermission(permission);
  return hasPermission ? children : fallback;
};

export default PermissionGuard;

import { useLocation, useParams } from 'react-router-dom';
import { useAuthStore, useStoreStore } from '../store/store';

export const useRoleContext = () => {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const location = useLocation();
  const params = useParams();

  const isPathAdmin = location.pathname.startsWith('/admin');
  const role = user?.role || 'worker';
  const isAdmin = role === 'admin' || role === 'super_admin';

  const basePath = isPathAdmin ? '/admin' : '/shopkeeper';
  const dashboardPath = isPathAdmin ? '/admin/dashboard' : '/shopkeeper/dashboard';

  let storeId = null;
  if (isPathAdmin) {
    storeId = params.storeId || params.store_id || selectedStore?.id || 'admin';
  } else {
    storeId = user?.store_id || selectedStore?.id || 'admin';
  }

  const buildPath = (subpath) => {
    if (isPathAdmin) {
      const currentStoreId = storeId || 'admin';
      if (subpath === 'dashboard') return '/admin/dashboard';
      if (subpath === 'stores') return '/admin/stores';
      if (subpath === 'analyses') return '/admin/analyses';
      if (subpath === 'warehouse') return '/admin/warehouse';
      if (subpath === 'permissions') return '/admin/permissions';
      if (subpath === 'sales') return '/admin/sales';
      if (subpath === 'expenses') return `/admin/store/${currentStoreId}/expenses`;
      return `/admin/store/${currentStoreId}/${subpath}`;
    } else {
      if (subpath === 'dashboard') return '/shopkeeper/dashboard';
      return `/shopkeeper/${subpath}`;
    }
  };

  const showStoreSwitcher = isPathAdmin && isAdmin;

  return {
    role,
    isAdmin,
    isPathAdmin,
    storeId,
    basePath,
    dashboardPath,
    buildPath,
    showStoreSwitcher,
  };
};

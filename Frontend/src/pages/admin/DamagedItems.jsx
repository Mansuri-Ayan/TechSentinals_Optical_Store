import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import DamagedStockTab from '../../components/admin/DamagedStockTab';
import { useAuthStore, useStoreStore } from '../../store/store';
import { useRoleContext } from '../../hooks/useRoleContext';
import { useStores } from '../../hooks/useStores';
import { usePagePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../../components/shared/PermissionGuard';

export default function DamagedItems() {
  const { user } = useAuthStore();
  const { selectedStore } = useStoreStore();
  const { storeId, buildPath, showStoreSwitcher, isPathAdmin } = useRoleContext();
  const { stores } = useStores();
  const perms = usePagePermissions('qc');
  const deadstockPerms = usePagePermissions('deadstock');
  const canUpdate = (perms.canUpdate ?? false) || (perms.canManage ?? false) || (deadstockPerms.canUpdate ?? false);

  const [selectedBranch, setSelectedBranch] = useState(storeId || 'All');

  useEffect(() => {
    if (isPathAdmin && selectedStore && selectedStore.id !== 'admin') {
      setSelectedBranch(selectedStore.id);
    }
  }, [selectedStore, isPathAdmin]);

  const effectiveStoreId = isPathAdmin
    ? (selectedBranch === 'All' ? undefined : selectedBranch)
    : (user?.store_id || selectedStore?.id || 'admin');

  return (
    <PermissionGuard permission={['qc:read', 'deadstock:read']} fallback={
      <div className="p-8 text-center text-slate-500 font-sans">
        You do not have permission to view damaged items and QC claims.
      </div>
    }>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans animate-fade-in overflow-x-hidden">
        <div>
          <div className="flex items-center text-sm text-slate-500 font-medium mb-3 space-x-2">
            <Link to={buildPath('dashboard')} className="hover:text-slate-800 transition-colors">Dashboard</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-slate-900 font-semibold">Damaged Items & Claims</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight flex items-center gap-2.5">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
                Damaged Stock & QC Claims
              </h1>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">
                Review and resolve store stock damage with suppliers (Replacement, Alternative Product, Financial Refund) and file lab liability claims.
              </p>
            </div>
          </div>
        </div>

        <DamagedStockTab
          storeId={effectiveStoreId}
          showStoreSwitcher={showStoreSwitcher}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
          stores={stores}
          canUpdate={canUpdate}
        />
      </div>
    </PermissionGuard>
  );
}

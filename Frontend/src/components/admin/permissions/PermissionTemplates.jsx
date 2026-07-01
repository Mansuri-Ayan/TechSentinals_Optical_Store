import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { usePermissions } from '../../../hooks/usePermissions';

const PermissionTemplates = () => {
  const { 
    allPermissionsQuery,
    globalMatrixQuery,
    updateGlobal,
    isUpdatingGlobal
  } = usePermissions();

  const permissions = allPermissionsQuery.data || [];
  const grants = globalMatrixQuery.data || {};
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <Shield className="w-6 h-6 text-blue-400" />
        <div>
          <h3 className="font-semibold text-blue-400">Global Defaults (Tier 1)</h3>
          <p className="text-sm text-blue-300/70">
            Configure platform-wide default permissions for each role. These apply to all businesses unless overridden by an Admin.
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <PermissionMatrix 
          permissions={permissions}
          roles={['ADMIN', 'MANAGER', 'WORKER', 'OPTICIAN', 'ACCOUNTANT']}
          grants={grants}
          onToggle={(role, permission, isGranted) => {
            updateGlobal({ roleType: role, permissionId: permission.id, isGranted });
          }}
          isLoading={allPermissionsQuery.isPending || globalMatrixQuery.isPending || isUpdatingGlobal}
        />
      </div>
    </div>
  );
};

export default PermissionTemplates;

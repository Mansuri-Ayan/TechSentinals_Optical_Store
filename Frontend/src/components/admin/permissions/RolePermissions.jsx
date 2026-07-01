import React, { useMemo } from 'react';
import { Building2, RotateCcw } from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { usePermissions } from '../../../hooks/usePermissions';

const RolePermissions = () => {
  const { 
    allPermissionsQuery,
    globalMatrixQuery,
    adminRoleMatrixQuery,
    updateAdminRole,
    clearAdminRole,
    isUpdatingAdminRole,
    isClearingAdminRole,
  } = usePermissions();

  const permissions = allPermissionsQuery.data || [];
  
  // The AdminRoleMatrix gives us explicit overrides set by this Admin.
  // The GlobalMatrix gives us the Tier 1 defaults.
  // We need to merge them to show the effective grant to the user.
  // We also need to compute sourceTiers to show the 'B' (Business) vs 'G' (Global) badge.
  
  const globalGrants = globalMatrixQuery.data || {};
  const adminGrants = adminRoleMatrixQuery.data || {};
  
  const mergedGrants = useMemo(() => {
    const merged = {};
    const tiers = {};
    
    // We only care about roles below ADMIN
    const roles = ['MANAGER', 'WORKER', 'OPTICIAN', 'ACCOUNTANT'];
    
    roles.forEach(role => {
      merged[role] = {};
      tiers[role] = {};
      
      permissions.forEach(p => {
        const key = p.key;
        
        if (adminGrants[role] && key in adminGrants[role]) {
          merged[role][key] = adminGrants[role][key];
          tiers[role][key] = 'ADMIN_ROLE';
        } else {
          merged[role][key] = globalGrants[role]?.[key] || false;
          tiers[role][key] = 'GLOBAL';
        }
      });
    });
    
    return { grants: merged, tiers };
  }, [permissions, globalGrants, adminGrants]);

  // Handler for toggle: if we toggle, we set the AdminRoleOverride (Tier 2).
  const handleToggle = (role, permission, isGranted) => {
    updateAdminRole({ roleType: role, permissionId: permission.id, isGranted });
  };
  
  // Wait, how do they CLEAR an override to fallback to Global? 
  // We can add a right-click or a separate clear action, but a simple checkbox toggle can only set true/false override.
  // If we want them to clear it, maybe a button next to the badge? Or if they set it back to the global default, we auto-clear it?
  // Let's implement an auto-clear logic: if they try to set it to what the Global default already is, we call clearAdminRole!
  const smartToggle = (role, permission, isGranted) => {
    const globalState = globalGrants[role]?.[permission.key] || false;
    if (isGranted === globalState) {
      // It matches global default, so clear the override
      clearAdminRole({ roleType: role, permissionId: permission.id });
    } else {
      // It differs, set override
      updateAdminRole({ roleType: role, permissionId: permission.id, isGranted });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
        <Building2 className="w-6 h-6 text-purple-400" />
        <div>
          <h3 className="font-semibold text-purple-400">Business Defaults (Tier 2)</h3>
          <p className="text-sm text-purple-300/70">
            Configure default permissions for roles within your business. This overrides Global Defaults. Toggling to match Global will remove your explicit override.
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <PermissionMatrix 
          permissions={permissions}
          roles={['MANAGER', 'WORKER', 'OPTICIAN', 'ACCOUNTANT']}
          grants={mergedGrants.grants}
          sourceTiers={mergedGrants.tiers}
          onToggle={smartToggle}
          isLoading={allPermissionsQuery.isPending || globalMatrixQuery.isPending || adminRoleMatrixQuery.isPending || isUpdatingAdminRole || isClearingAdminRole}
        />
      </div>
    </div>
  );
};

export default RolePermissions;

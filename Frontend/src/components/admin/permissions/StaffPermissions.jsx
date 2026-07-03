import React, { useState, useMemo } from 'react';
import { UserCog, Search } from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { usePermissions } from '../../../hooks/usePermissions';
import { useStoreStaff } from '../../../hooks/useStaff';
import { useStoreStore } from '../../../store/store';

const StaffPermissions = () => {
  const { selectedStore } = useStoreStore();
  const { 
    allPermissionsQuery,
    globalMatrixQuery,
    adminRoleMatrixQuery,
    useUserMatrixQuery,
    updateUser,
    clearUser,
    isUpdatingUser,
    isClearingUser,
  } = usePermissions();

  const [selectedStaff, setSelectedStaff] = useState(null);

  // Fetch staff for the current store
  const { staff, isLoadingStaff } = useStoreStaff(selectedStore?.id, { page: 1, limit: 100 });
  
  // Use the query for the selected user
  const userMatrixQuery = useUserMatrixQuery(selectedStaff?.role, selectedStaff?.id);

  const permissions = allPermissionsQuery.data || [];
  const globalGrants = globalMatrixQuery.data || {};
  const adminGrants = adminRoleMatrixQuery.data || {};
  const userGrants = userMatrixQuery.data || {};

  const mergedGrants = useMemo(() => {
    if (!selectedStaff) return { grants: {}, tiers: {} };
    
    const merged = {};
    const tiers = {};
    const role = selectedStaff.role; // e.g. 'MANAGER'
    const staffRole = role?.toUpperCase();
    
    // Create a generic key for the matrix columns. We use the person's name as the column.
    const colKey = selectedStaff.full_name;
    merged[colKey] = {};
    tiers[colKey] = {};
    
    permissions.forEach(p => {
      const key = p.key;
      
      if (key in userGrants) {
        merged[colKey][key] = userGrants[key];
        tiers[colKey][key] = 'USER';
      } else if (adminGrants[staffRole] && key in adminGrants[staffRole]) {
        merged[colKey][key] = adminGrants[staffRole][key];
        tiers[colKey][key] = 'ADMIN_ROLE';
      } else {
        merged[colKey][key] = globalGrants[staffRole]?.[key] || false;
        tiers[colKey][key] = 'GLOBAL';
      }
    });
    
    return { grants: merged, tiers };
  }, [permissions, globalGrants, adminGrants, userGrants, selectedStaff]);

  const handleToggle = (colKey, permission, isGranted) => {
    if (!selectedStaff) return;
    const staffRole = selectedStaff.role?.toUpperCase();
    
    // Check what the underlying Tier 2 / Tier 1 default is
    const underlyingState = (adminGrants[staffRole] && permission.key in adminGrants[staffRole])
      ? adminGrants[staffRole][permission.key]
      : (globalGrants[staffRole]?.[permission.key] || false);

    if (isGranted === underlyingState) {
      // Clear the override because it matches the default
      clearUser({ userType: staffRole, userId: selectedStaff.id, permissionId: permission.id });
    } else {
      // Set the override
      updateUser({ userType: staffRole, userId: selectedStaff.id, permissionId: permission.id, isGranted });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
        <UserCog className="w-6 h-6 text-emerald-400" />
        <div>
          <h3 className="font-semibold text-emerald-400">Staff Overrides (Tier 3)</h3>
          <p className="text-sm text-emerald-300/70">
            Grant or revoke specific permissions for an individual staff member. This overrides Business and Global defaults.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row items-start">
        {/* Staff Selection Sidebar */}
        <div className="w-full lg:w-1/3 bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col max-h-[70vh]">
          <h4 className="font-semibold text-slate-300 mb-4">Select Staff Member</h4>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
            {isLoadingStaff ? (
              <div className="text-sm text-slate-500 text-center py-4">Loading staff...</div>
            ) : staff?.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">No staff found.</div>
            ) : (
              staff?.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStaff(s)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex flex-col gap-1 ${
                    selectedStaff?.id === s.id 
                      ? "bg-emerald-500/20 border-emerald-500 text-white" 
                      : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span className="font-medium text-sm truncate">{s.full_name}</span>
                  <span className="text-xs uppercase tracking-wider opacity-70">{s.role}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Matrix Area */}
        <div className="w-full lg:w-2/3 bg-slate-800 border border-slate-700 rounded-xl p-4">
          {!selectedStaff ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <UserCog className="w-12 h-12 mb-4 opacity-50" />
              <p>Select a staff member to manage their permissions.</p>
            </div>
          ) : (
            <PermissionMatrix 
              permissions={permissions}
              roles={[selectedStaff.full_name]}
              grants={mergedGrants.grants}
              sourceTiers={mergedGrants.tiers}
              onToggle={handleToggle}
              isLoading={allPermissionsQuery.isPending || globalMatrixQuery.isPending || adminRoleMatrixQuery.isPending || userMatrixQuery.isPending || isUpdatingUser || isClearingUser}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffPermissions;

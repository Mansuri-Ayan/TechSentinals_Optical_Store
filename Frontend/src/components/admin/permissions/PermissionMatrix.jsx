import React, { useMemo } from 'react';
import { Check, X, Info } from 'lucide-react';

/**
 * Reusable Permission Matrix for all tiers.
 * 
 * Props:
 * @param {Array} permissions - List of all permission objects (id, module, action, key, label, is_special)
 * @param {Array} roles - Array of role strings/objects to display as columns (e.g. ['manager', 'worker', 'optician', 'accountant'])
 * @param {Object} grants - Current grants. Format: { [role]: { [permissionKey]: isGranted } }
 * @param {Object} sourceTiers - Optional. Format: { [role]: { [permissionKey]: 'GLOBAL' | 'ADMIN_ROLE' | 'USER' } }
 * @param {Function} onToggle - (role, permissionKey, newValue) => void
 * @param {Boolean} isLoading - Loading state
 * @param {Boolean} readOnly - If true, all checkboxes are disabled
 */
const PermissionMatrix = ({
  permissions = [],
  roles = [],
  grants = {},
  sourceTiers = {},
  onToggle,
  isLoading,
  readOnly = false,
}) => {
  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups = {};
    permissions.forEach(p => {
      if (!groups[p.module]) {
        groups[p.module] = [];
      }
      groups[p.module].push(p);
    });
    return groups;
  }, [permissions]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderSourceTierBadge = (tier) => {
    if (!tier) return null;
    let color = "bg-slate-700 text-slate-300";
    let title = "Inherited";
    
    if (tier === "GLOBAL") {
      color = "bg-blue-500/20 text-blue-400";
      title = "Global Default";
    } else if (tier === "ADMIN_ROLE") {
      color = "bg-purple-500/20 text-purple-400";
      title = "Business Default";
    } else if (tier === "USER") {
      color = "bg-emerald-500/20 text-emerald-400";
      title = "User Override";
    }

    return (
      <span title={title} className={`text-[10px] px-1.5 py-0.5 rounded ml-2 ${color}`}>
        {tier === "GLOBAL" ? "G" : tier === "ADMIN_ROLE" ? "B" : "U"}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-slate-700 rounded-xl hide-scrollbar bg-slate-800/50">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-900 sticky top-0 z-10 shadow-md">
          <tr>
            <th className="px-4 py-3 font-semibold text-slate-300 border-b border-slate-700 w-1/4">
              Module / Action
            </th>
            {roles.map(role => (
              <th key={role} className="px-4 py-3 font-semibold text-slate-300 border-b border-slate-700 text-center uppercase tracking-wider text-xs">
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <React.Fragment key={module}>
              {/* Module Header Row */}
              <tr className="bg-slate-800">
                <td colSpan={roles.length + 1} className="px-4 py-2 font-bold text-emerald-400 border-b border-slate-700 uppercase text-xs tracking-wider">
                  {module}
                </td>
              </tr>
              {/* Actions for this module */}
              {perms.map((p) => (
                <tr key={p.key} className="hover:bg-slate-700/30 transition-colors border-b border-slate-700/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center">
                      <span className="text-slate-300">{p.label}</span>
                      {p.is_special && (
                        <Info className="w-3 h-3 ml-2 text-amber-500" title="Special Permission (High Risk)" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{p.key}</div>
                  </td>
                  {roles.map(role => {
                    const isGranted = grants[role]?.[p.key] || false;
                    const tier = sourceTiers[role]?.[p.key];
                    
                    return (
                      <td key={`${p.key}-${role}`} className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <label className={`relative inline-flex items-center ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={isGranted}
                              disabled={readOnly}
                              onChange={(e) => onToggle && onToggle(role, p, e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                          {renderSourceTierBadge(tier)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionMatrix;

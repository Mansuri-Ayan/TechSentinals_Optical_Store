import { useState, useMemo } from 'react';
import {
  KeyRound, Shield, Search, Filter, Check, X,
  AlertTriangle, Loader2, Sparkles, RefreshCw, Layers
} from 'lucide-react';
import { useGlobalPermissions } from '../../hooks/useSuperAdmin';

export default function SuperAdminGlobalPermissions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [updatingKey, setUpdatingKey] = useState(null);

  const {
    matrix,
    isLoading,
    updatePermissionAsync,
    isUpdating,
  } = useGlobalPermissions();

  const roles = matrix?.roles || ['ADMIN', 'MANAGER', 'WORKER', 'OPTICIAN', 'ACCOUNTANT'];
  const modules = matrix?.modules || {};

  const moduleNames = useMemo(() => Object.keys(modules), [modules]);

  const handleToggle = async (role, item) => {
    const currentVal = item.grants?.[role] || false;
    const actionKey = `${role}-${item.key}`;
    setUpdatingKey(actionKey);

    try {
      await updatePermissionAsync({
        role_type: role,
        permission_key: item.key,
        is_granted: !currentVal,
      });
    } catch (err) {
      // Toast shown by mutation
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredModules = useMemo(() => {
    const result = {};
    const query = searchTerm.toLowerCase().trim();

    Object.entries(modules).forEach(([modName, items]) => {
      if (selectedModule !== 'ALL' && modName !== selectedModule) {
        return;
      }

      const filteredItems = items.filter((p) => {
        if (!query) return true;
        return (
          p.display_name?.toLowerCase().includes(query) ||
          p.key?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );
      });

      if (filteredItems.length > 0) {
        result[modName] = filteredItems;
      }
    });

    return result;
  }, [modules, searchTerm, selectedModule]);

  const roleColors = {
    ADMIN: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    MANAGER: 'text-blue-600 bg-blue-50 border-blue-200',
    WORKER: 'text-amber-600 bg-amber-50 border-amber-200',
    OPTICIAN: 'text-purple-600 bg-purple-50 border-purple-200',
    ACCOUNTANT: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-8 h-8 text-emerald-600" />
            Global Role Permissions Matrix
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            Tier-1 baseline template. Onboarding tenants duplicate these defaults into their local role overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
            Total Rules: <span className="text-emerald-600 font-extrabold">{matrix?.total_permissions || 0}</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions by name, key (e.g. sales:read), or description..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 text-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedModule('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedModule === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Modules
          </button>
          {moduleNames.map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedModule === mod
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 bg-white border border-slate-200/60 rounded-3xl shadow-2xs">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : Object.keys(filteredModules).length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl p-12 text-center flex flex-col items-center shadow-2xs">
          <KeyRound className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No permissions match your filter</h3>
          <p className="text-slate-500 text-xs">Try clearing your search term or selecting All Modules.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredModules).map(([modName, items]) => (
            <div
              key={modName}
              className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs"
            >
              <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{modName} Module</h2>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/60">
                  {items.length} Rules
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/30">
                      <th className="py-3 px-6 w-2/5">Permission Specification</th>
                      {roles.map((role) => (
                        <th key={role} className="py-3 px-4 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded-md border ${roleColors[role] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                            {role}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.display_name}</span>
                            {item.is_dangerous && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-50 text-red-600 border border-red-200 flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                HIGH IMPACT
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">{item.key}</div>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </td>

                        {roles.map((role) => {
                          const isGranted = item.grants?.[role] || false;
                          const actionKey = `${role}-${item.key}`;
                          const isThisUpdating = updatingKey === actionKey;

                          return (
                            <td key={role} className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleToggle(role, item)}
                                disabled={isThisUpdating}
                                className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer border ${
                                  isGranted
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-50 text-slate-300 border-slate-200 hover:text-slate-400 hover:bg-slate-100'
                                } disabled:opacity-50`}
                                title={`Toggle ${item.display_name} for ${role}`}
                              >
                                {isThisUpdating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                ) : isGranted ? (
                                  <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

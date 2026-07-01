import React, { useState } from "react";
import { Shield, ShieldAlert, Key, Undo, Search, User, Briefcase, ChevronDown, Check, X, Users, Settings } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuthStore } from "../../store/store";

export default function Permissions() {
  const [activeTab, setActiveTab] = useState("role-defaults");
  
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Access Control
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-sm lg:text-base max-w-2xl">
            Configure global role boundaries and manage fine-grained staff overrides to ensure secure, least-privilege access across your organization.
          </p>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="inline-flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl mb-8 border border-slate-200/50 shadow-inner">
        <button
          onClick={() => setActiveTab("role-defaults")}
          className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "role-defaults"
              ? "text-slate-900 bg-white shadow-sm ring-1 ring-slate-900/5"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          <Settings className={`w-4 h-4 ${activeTab === 'role-defaults' ? 'text-emerald-500' : ''}`} />
          Global Role Defaults
        </button>
        <button
          onClick={() => setActiveTab("staff-overrides")}
          className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "staff-overrides"
              ? "text-slate-900 bg-white shadow-sm ring-1 ring-slate-900/5"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'staff-overrides' ? 'text-blue-500' : ''}`} />
          Staff Overrides
        </button>
      </div>

      <div className="bg-transparent">
        {activeTab === "role-defaults" && <RoleDefaultsTab />}
        {activeTab === "staff-overrides" && <StaffOverridesTab />}
      </div>
    </div>
  );
}

function CustomToggle({ checked, onChange, disabled, isOverride }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange()}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        checked ? (isOverride ? 'bg-indigo-500' : 'bg-emerald-500') : 'bg-slate-200'
      } ${isOverride ? 'ring-2 ring-indigo-200 ring-offset-1' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function RoleDefaultsTab() {
  const [selectedRole, setSelectedRole] = useState("WORKER");
  const roles = ["ADMIN", "MANAGER", "WORKER", "OPTICIAN", "ACCOUNTANT"];
  
  const { useRoleDefaultsQuery, updateRoleDefault, isUpdatingRoleDefault } = usePermissions();
  const { data: matrix, isLoading } = useRoleDefaultsQuery(selectedRole);

  const handleToggle = (permKey, currentVal) => {
    updateRoleDefault({
      roleType: selectedRole,
      permissionKey: permKey,
      isGranted: !currentVal
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-slate-400" />
          Select Business Role:
        </label>
        <div className="relative min-w-[200px]">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
          >
            {roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="sm:ml-auto text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          Viewing defaults for <span className="text-emerald-600 font-bold">{selectedRole}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading security matrix...</p>
        </div>
      ) : matrix ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Object.entries(matrix).map(([module, perms]) => (
            <div key={module} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 capitalize tracking-tight">
                  {module} Module
                </h3>
              </div>
              <div className="space-y-4">
                {perms.map(p => (
                  <div key={p.key} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-2 flex-1 pr-4">
                      <span className={`text-sm font-semibold transition-colors ${
                        p.is_dangerous ? 'text-red-600' : 'text-slate-600 group-hover/item:text-slate-900'
                      }`}>
                        {p.display_name}
                      </span>
                      {p.is_dangerous && (
                        <div className="px-1.5 py-0.5 rounded bg-red-50 border border-red-100 flex items-center gap-1" title="Dangerous Action">
                          <ShieldAlert className="w-3 h-3 text-red-500" />
                          <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">High Risk</span>
                        </div>
                      )}
                    </div>
                    <CustomToggle 
                      checked={p.is_granted}
                      onChange={() => handleToggle(p.key, p.is_granted)}
                      disabled={isUpdatingRoleDefault || selectedRole === "ADMIN"}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold">No permission data found for this role.</p>
        </div>
      )}
    </div>
  );
}

function StaffOverridesTab() {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [search, setSearch] = useState("");
  const { staffListQuery, useStaffPermissionsQuery, updateStaffPermission, clearStaffPermission, isUpdatingStaffPermission, isClearingStaffPermission } = usePermissions();
  
  const rawStaffList = Array.isArray(staffListQuery.data) ? staffListQuery.data : [];
  const staffList = rawStaffList.map(s => ({
    id: s.id,
    type: s.user_type,
    name: `${s.first_name} ${s.last_name || ""}`.trim(),
    storeName: s.store_name,
    initials: `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase()
  }));
  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.storeName && s.storeName.toLowerCase().includes(search.toLowerCase())) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const { data: matrix, isLoading } = useStaffPermissionsQuery(selectedStaff?.type, selectedStaff?.id);

  const handleToggle = (permKey, currentGrantedVal) => {
    if (!selectedStaff) return;
    updateStaffPermission({
      userType: selectedStaff.type,
      userId: selectedStaff.id,
      permissionKey: permKey,
      isGranted: !currentGrantedVal
    });
  };

  const handleClear = (permKey) => {
    if (!selectedStaff) return;
    clearStaffPermission({
      userType: selectedStaff.type,
      userId: selectedStaff.id,
      permissionKey: permKey
    });
  };

  const GRADIENTS = [
    "from-blue-500 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-600",
    "from-purple-500 to-violet-600"
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)] min-h-[600px] animate-fade-in">
      {/* Staff List Sidebar */}
      <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search staff members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {staffListQuery.isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-slate-500">Loading directory...</p>
            </div>
          ) : filteredStaff.length > 0 ? (
            filteredStaff.map((staff, idx) => {
              const isSelected = selectedStaff?.id === staff.id && selectedStaff?.type === staff.type;
              const grad = GRADIENTS[idx % GRADIENTS.length];
              return (
                <button
                  key={`${staff.type}-${staff.id}`}
                  onClick={() => setSelectedStaff(staff)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-50 border border-indigo-100 shadow-sm"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-xs shadow-inner flex-shrink-0`}>
                    {staff.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {staff.name}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 truncate mt-0.5 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {staff.storeName}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No staff found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Matrix Area */}
      <div className="w-full flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
        {!selectedStaff ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-indigo-200" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Select a Staff Member</h2>
            <p className="text-slate-500 font-medium max-w-sm">
              Choose an employee from the directory to view and manage their specific permission overrides.
            </p>
          </div>
        ) : isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-bold">Loading overrides...</p>
          </div>
        ) : (
          <>
            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
                    {selectedStaff.initials}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedStaff.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide">
                        {selectedStaff.type}
                      </span>
                      <span className="text-sm font-semibold text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {selectedStaff.storeName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/30">
              {matrix ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {Object.entries(matrix).map(([module, perms]) => (
                    <div key={module} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Key className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-800 capitalize tracking-tight">
                          {module} Configuration
                        </h3>
                      </div>
                      
                      <div className="space-y-4">
                        {perms.map(p => (
                          <div 
                            key={p.key} 
                            className={`flex flex-col gap-3 p-4 rounded-xl border transition-all duration-300 ${
                              p.is_override 
                                ? 'bg-indigo-50/30 border-indigo-200 ring-1 ring-indigo-500/10' 
                                : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-sm font-bold ${p.is_dangerous ? 'text-red-600' : 'text-slate-800'}`}>
                                    {p.display_name}
                                  </span>
                                  {p.is_dangerous && (
                                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" title="Dangerous Action" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    p.is_granted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {p.is_granted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {p.is_granted ? 'Granted' : 'Denied'}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className={`text-[11px] font-bold ${
                                    p.is_override ? 'text-indigo-600' : 'text-slate-500'
                                  }`}>
                                    {p.is_override ? 'Staff Override' : 'Role Default'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {p.is_override && (
                                  <button
                                    onClick={() => handleClear(p.key)}
                                    disabled={isClearingStaffPermission}
                                    className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                                    title="Restore Default Role Permission"
                                  >
                                    <Undo className="w-3.5 h-3.5" /> Clear
                                  </button>
                                )}
                                <CustomToggle 
                                  checked={p.is_granted}
                                  onChange={() => handleToggle(p.key, p.is_granted)}
                                  disabled={isUpdatingStaffPermission || isClearingStaffPermission}
                                  isOverride={p.is_override}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold">No permission configuration found.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

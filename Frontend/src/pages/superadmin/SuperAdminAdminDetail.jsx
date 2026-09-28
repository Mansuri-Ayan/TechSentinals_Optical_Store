import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Store, Users, DollarSign, Package,
  ShieldAlert, LogIn, RefreshCw, MapPin, Mail, Phone,
  Calendar, CheckCircle2, XCircle, AlertTriangle, Layers,
  ChevronRight, Sparkles, ExternalLink, ShieldCheck, Warehouse
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useTenant360 } from '../../hooks/useSuperAdmin';
import {
  toggleSuperAdminStoreStatusApi,
  syncTenantPermissionsApi,
  impersonateAdminApi,
  updateAdminStatusApi
} from '../../api/superadmin/superadmin.api';
import { useAuthStore } from '../../store/store';

export default function SuperAdminAdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const adminId = parseInt(id, 10);
  const { setUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isSyncingPerms, setIsSyncingPerms] = useState(false);
  const [togglingStoreId, setTogglingStoreId] = useState(null);

  const {
    overview,
    isLoadingOverview,
    stores,
    isLoadingStores,
    staff,
    isLoadingStaff,
    refetch,
  } = useTenant360(adminId);

  const admin = overview?.admin;
  const stats = overview;

  const handleStatusChange = async (newStatus) => {
    try {
      await updateAdminStatusApi(adminId, newStatus);
      toast.success(`Tenant status updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update tenant status');
    }
  };

  const handleImpersonate = async () => {
    if (admin?.status !== 'ACTIVE') {
      toast.warning('Cannot impersonate a suspended or inactive tenant.');
      return;
    }
    setIsImpersonating(true);
    try {
      const res = await impersonateAdminApi(adminId);
      sessionStorage.setItem('impersonation_token', res.access_token);
      sessionStorage.setItem('impersonation_session', JSON.stringify(res.admin));
      setUser({ ...res.admin, role: 'admin' });
      toast.success(`Impersonating ${res.admin.business_name}`);
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start impersonation session');
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleToggleStoreStatus = async (storeId, currentStatus) => {
    setTogglingStoreId(storeId);
    try {
      await toggleSuperAdminStoreStatusApi(storeId, !currentStatus);
      toast.success(`Store status updated to ${!currentStatus ? 'ACTIVE' : 'INACTIVE'}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update store status');
    } finally {
      setTogglingStoreId(null);
    }
  };

  const handleSyncPermissions = async () => {
    if (!window.confirm('Are you sure you want to resync this business permissions to the master global template?')) {
      return;
    }
    setIsSyncingPerms(true);
    try {
      const res = await syncTenantPermissionsApi(adminId);
      toast.success(res?.message || 'Permissions synchronized successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to synchronize permissions');
    } finally {
      setIsSyncingPerms(false);
    }
  };

  if (isLoadingOverview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-semibold">Loading 360° Tenant Intelligence...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-3xl p-12 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Business Tenant Not Found</h3>
        <p className="text-slate-500 text-xs mb-6">The requested tenant ID {adminId} does not exist or has been deleted.</p>
        <button
          onClick={() => navigate('/super-admin/admins')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
        >
          Back to Businesses
        </button>
      </div>
    );
  }

  const roleColors = {
    Manager: 'text-blue-700 bg-blue-50 border-blue-200',
    Optician: 'text-purple-700 bg-purple-50 border-purple-200',
    Worker: 'text-amber-700 bg-amber-50 border-amber-200',
    Accountant: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back Button & Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/super-admin/admins')}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 rounded-xl hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Businesses</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200/80 rounded-xl hover:shadow-xs transition-all cursor-pointer"
            title="Refresh Tenant Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleImpersonate}
            disabled={isImpersonating || admin.status !== 'ACTIVE'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            <span>{isImpersonating ? 'Launching...' : 'Login as Admin'}</span>
          </button>
        </div>
      </div>

      {/* Tenant Profile Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-extrabold text-2xl shrink-0 shadow-xs">
              {admin.business_name?.[0] || 'B'}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                  {admin.business_name}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  ID: #{admin.id}
                </span>
                <select
                  value={admin.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer outline-none transition-all ${
                    admin.status === 'ACTIVE'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : admin.status === 'SUSPENDED'
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-700">Owner:</span> {admin.owner_first_name} {admin.owner_last_name}
                <span>•</span>
                <span>Onboarded: {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}</span>
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {admin.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {admin.phone}
                </span>
                {(admin.city || admin.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {admin.city ? `${admin.city}, ` : ''}{admin.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-center min-w-[100px]">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Branches</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.stores_count || 0}</p>
            </div>
            <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-center min-w-[100px]">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Staff Roster</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.staff_count?.total || 0}</p>
            </div>
            <div className="px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-center min-w-[120px]">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total GMV</p>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">₹{(stats.sales?.gmv || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 border-b border-slate-100 -mb-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: '360° Overview', icon: Building2 },
            { id: 'stores', label: `Stores (${stores.length})`, icon: Store },
            { id: 'staff', label: `Staff Members (${staff.length})`, icon: Users },
            { id: 'config', label: 'Configuration & Tools', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: 360° Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed GMV</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">₹{(stats.sales?.gmv || 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">Platform lifetime gross volume</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoices Issued</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">{stats.sales?.invoices || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">Avg Ticket: ₹{Math.round(stats.sales?.aov || 0)}</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Valuation</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Warehouse className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">₹{(stats.inventory?.valuation || 0).toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">{stats.inventory?.units || 0} trackable product units</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff Ratio</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-3">{stats.staff_count?.total || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.staff_count?.managers || 0} Mgr • {stats.staff_count?.opticians || 0} Opt • {stats.staff_count?.workers || 0} Wrk
              </p>
            </div>
          </div>

          {/* Details 2-Column Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Legal, Tax & Registration Details */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Tax & Legal Profile
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Registered Business Name</span>
                  <span className="font-bold text-slate-800">{admin.business_name}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">GST Identification Number</span>
                  <span className="font-mono font-bold text-slate-800">{admin.gst_number || 'Not Registered'}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Permanent Account Number (PAN)</span>
                  <span className="font-mono font-bold text-slate-800">{admin.pan_number || 'Not Provided'}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Central Warehouse Mode</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${stats.config?.warehouse_enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                    {stats.config?.warehouse_enabled ? 'Enabled' : 'Disabled (Standard)'}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Account Status</span>
                  <span className="font-bold text-emerald-600">{admin.status}</span>
                </div>
              </div>
            </div>

            {/* Address & Primary Contact */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Address & Headquarters
              </h2>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Street Address</span>
                  <span className="font-semibold text-slate-800 text-right">{admin.address || 'N/A'}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">City & State</span>
                  <span className="font-semibold text-slate-800">{admin.city || 'N/A'}, {admin.state || 'N/A'}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Postal Pincode</span>
                  <span className="font-mono font-semibold text-slate-800">{admin.pincode || 'N/A'}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Primary Contact Email</span>
                  <span className="font-semibold text-slate-800">{admin.email}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Primary Phone Number</span>
                  <span className="font-semibold text-slate-800">{admin.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Stores (Branches) */}
      {activeTab === 'stores' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs animate-in fade-in duration-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Retail Stores & Branches</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage branch active status and view individual branch performances.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {stores.length} Branches
            </span>
          </div>

          {isLoadingStores ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : stores.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No stores created under this tenant</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Store Details</th>
                    <th className="py-3.5 px-6">Location</th>
                    <th className="py-3.5 px-6">Contact</th>
                    <th className="py-3.5 px-6">Revenue GMV</th>
                    <th className="py-3.5 px-6">Orders</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Toggle Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {stores.map((store) => (
                    <tr key={store.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{store.store_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {store.store_code}
                          </span>
                          {store.is_main_store && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Flagship Main Store
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div>{store.city || 'N/A'}, {store.state || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{store.address}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div>{store.phone || 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">{store.email || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        ₹{(store.revenue || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-semibold">
                        {store.orders_count || 0}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${store.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${store.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {store.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                          disabled={togglingStoreId === store.id}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                            store.is_active
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {togglingStoreId === store.id ? 'Updating...' : store.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff Members */}
      {activeTab === 'staff' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs animate-in fade-in duration-200">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Staff Roster</h2>
              <p className="text-xs text-slate-500 mt-0.5">Managers, workers, opticians, and accountants under this business.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {staff.length} Members
            </span>
          </div>

          {isLoadingStaff ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No staff members enrolled yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Name</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Assigned Store</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Phone</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {staff.map((member) => (
                    <tr key={`${member.role}-${member.id}`} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-4 px-6 font-bold text-slate-900">{member.name}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${roleColors[member.role] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">{member.store_name || 'Business Level'}</td>
                      <td className="py-4 px-6 text-slate-600">{member.email}</td>
                      <td className="py-4 px-6 text-slate-600">{member.phone || 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[10px] ${member.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-400 font-medium">
                        {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Configuration & Tools */}
      {activeTab === 'config' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Tenant Lifecycle & Maintenance</h2>
              <p className="text-xs text-slate-500 mt-0.5">Platform governance controls and configuration synchronization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permission Resync Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sync Global Permissions</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Resynchronizes this tenant&apos;s role permissions (<code className="bg-slate-200/70 px-1 py-0.5 rounded text-[10px]">AdminRolePermissionOverride</code>) with the master Tier-1 global permissions template.
                </p>
                <button
                  onClick={handleSyncPermissions}
                  disabled={isSyncingPerms}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSyncingPerms ? 'Synchronizing...' : 'Resync to Global Template'}
                </button>
              </div>

              {/* Impersonation Card */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <span>Impersonate Tenant Portal</span>
                </div>
                <p className="text-xs text-indigo-950/70 leading-relaxed">
                  Log in directly to this tenant&apos;s dashboard as an administrator to troubleshoot configuration, support their staff, or inspect catalog issues.
                </p>
                <button
                  onClick={handleImpersonate}
                  disabled={isImpersonating || admin.status !== 'ACTIVE'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isImpersonating ? 'Connecting...' : 'Launch Impersonation Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

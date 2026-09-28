import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Settings, User, KeyRound, Activity, Shield, CheckCircle2,
  AlertCircle, RefreshCw, Loader2, Database, Cpu, Clock, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSuperAdminSettings } from '../../hooks/useSuperAdmin';

export default function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const {
    profile,
    isLoadingProfile,
    health,
    isLoadingHealth,
    updateProfileAsync,
    isUpdatingProfile,
    changePasswordAsync,
    isChangingPassword,
  } = useSuperAdminSettings();

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
    },
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (profile) {
      resetProfile({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
      });
    }
  }, [profile, resetProfile]);

  const onProfileSubmit = async (data) => {
    try {
      await updateProfileAsync(data);
    } catch (err) {}
  };

  const onPasswordSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('New password and confirm password do not match');
      return;
    }
    try {
      await changePasswordAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      resetPassword({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {}
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-8 h-8 text-emerald-600" />
          Platform Settings & Diagnostics
        </h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm">
          Manage super administrative credentials, profile parameters, and inspect live platform infrastructure health.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'profile', label: 'Super Admin Profile', icon: User },
          { id: 'security', label: 'Security & Password', icon: KeyRound },
          { id: 'diagnostics', label: 'System Health Diagnostics', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs animate-in fade-in duration-200">
          <div className="max-w-xl">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1">
              Account Profile
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Update personal administrative identification details.
            </p>

            {isLoadingProfile ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              </div>
            ) : (
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...registerProfile('first_name', { required: 'First name is required' })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                    {profileErrors.first_name && (
                      <p className="text-[11px] text-red-500 mt-1">{profileErrors.first_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...registerProfile('last_name')}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Platform superadmin root email is immutable for security.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeTab === 'security' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs animate-in fade-in duration-200">
          <div className="max-w-xl">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mb-1">
              Change Password
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Ensure your account is protected with a strong, complex passphrase.
            </p>

            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    {...registerPassword('current_password', { required: 'Current password is required' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all pr-10"
                    placeholder="Enter existing password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="text-[11px] text-red-500 mt-1">{passwordErrors.current_password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    {...registerPassword('new_password', {
                      required: 'New password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all pr-10"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="text-[11px] text-red-500 mt-1">{passwordErrors.new_password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  {...registerPassword('confirm_password', { required: 'Please confirm password' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  placeholder="Re-enter new password"
                />
                {passwordErrors.confirm_password && (
                  <p className="text-[11px] text-red-500 mt-1">{passwordErrors.confirm_password.message}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Platform Live Health Diagnostic</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    health?.status === 'HEALTHY'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${health?.status === 'HEALTHY' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {health?.status || 'CHECKING...'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Live connectivity probe to core SaaS infrastructure layers.</p>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rerun Health Probe</span>
              </button>
            </div>

            {isLoadingHealth ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {/* Database Health Card */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>PostgreSQL Database</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {health?.database?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-400 font-medium">Engine</span>
                      <span className="font-semibold text-slate-800">{health?.database?.type || 'PostgreSQL'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-400 font-medium">Build Signature</span>
                      <span className="font-mono text-[11px] text-slate-700 text-right truncate max-w-[240px]">
                        {health?.database?.version || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-medium">Async Engine</span>
                      <span className="font-mono text-[11px] text-emerald-600 font-bold">asyncpg (Pool Active)</span>
                    </div>
                  </div>
                </div>

                {/* Runtime & Host Environment */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Cpu className="w-4 h-4 text-emerald-600" />
                      <span>Backend Runtime Environment</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                      FastAPI + Uvicorn
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-400 font-medium">Python Version</span>
                      <span className="font-mono text-[11px] font-bold text-slate-800">
                        v{health?.environment?.python_version || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/40">
                      <span className="text-slate-400 font-medium">Operating System</span>
                      <span className="font-semibold text-slate-800">{health?.environment?.os || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400 font-medium">CPU Architecture</span>
                      <span className="font-mono text-[11px] text-slate-700">{health?.environment?.arch || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Server Timestamp / Sync */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3 md:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Synchronized Platform Clock</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Server UTC Timestamp:</span>
                      <span className="font-mono font-bold text-slate-800 ml-2">
                        {health?.timestamp ? new Date(health.timestamp).toUTCString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Local Browser Time:</span>
                      <span className="font-mono font-bold text-emerald-700 ml-2">
                        {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

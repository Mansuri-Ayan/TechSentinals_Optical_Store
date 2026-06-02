import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/store';
import { LogOut, User, Mail, Shield, Calendar, Activity, Building } from 'lucide-react';

const ProfileHome = () => {
  const { logout, isLoggingOut } = useAuth();
  const { user, isLoading } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center text-slate-300 px-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center text-slate-300 p-4 sm:p-6">
        <div className="glass-dark max-w-md w-full p-6 sm:p-8 rounded-2xl border border-white/5 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <User className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Not Authenticated</h2>
          <p className="text-slate-400 mb-5 sm:mb-6 text-sm">Please log in to access the system details and profile information.</p>
          <a
            href="/login"
            className="inline-block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 text-sm"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Format date strings
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-navy py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-64 sm:w-96 h-64 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl w-full">
        {/* Main Card */}
        <div className="glass-dark rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-white/10 shadow-2xl overflow-hidden animate-fade-in">
          {/* Top Banner / Color Block */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>

          {/* Header section */}
          <div className="flex flex-col sm:flex-row items-center sm:justify-between border-b border-white/5 pb-6 sm:pb-8 mb-6 sm:mb-8 gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-center sm:text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-xl shadow-indigo-500/10 flex-shrink-0">
                {user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-words">{user.full_name}</h1>
                <p className="text-slate-400 font-medium text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="capitalize">{user.role}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 py-2.5 px-5 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-slate-300 rounded-xl transition-all duration-200 text-sm font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center sm:justify-start"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Email */}
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
              <div className="p-2.5 sm:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-400 flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="overflow-hidden min-w-0">
                <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Email Address</h3>
                <p className="text-slate-200 font-medium mt-1 truncate text-sm sm:text-base">{user.email}</p>
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
              <div className="p-2.5 sm:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-400 flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Account Status</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <p className="text-slate-200 font-medium capitalize text-sm sm:text-base">{user.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </div>

            {/* Store Association */}
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
              <div className="p-2.5 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-400 flex-shrink-0">
                <Building className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="overflow-hidden min-w-0">
                <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Store ID</h3>
                <p className="text-slate-200 font-medium mt-1 truncate font-mono text-xs sm:text-sm">{user.store_id || 'Global Admin (No specific store)'}</p>
              </div>
            </div>

            {/* Created At */}
            <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
              <div className="p-2.5 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-400 flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Member Since</h3>
                <p className="text-slate-200 font-medium mt-1 text-sm sm:text-base">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-4 sm:pt-6 gap-2">
            <p>Last login: {formatDate(user.last_login_at)}</p>
            <p className="font-semibold text-emerald-500/80">TechSentinals Optical Store</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHome;

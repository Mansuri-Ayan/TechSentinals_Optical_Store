import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, LayoutDashboard, Building2, Store, KeyRound,
  BarChart3, Settings, LogOut, Shield, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/store';

export default function SuperAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { to: '/super-admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/super-admin/analytics', label: 'Platform Analytics', icon: BarChart3, badge: 'Insights' },
    { to: '/super-admin/admins', label: 'Businesses (Tenants)', icon: Building2 },
    { to: '/super-admin/stores', label: 'Stores Directory', icon: Store },
    { to: '/super-admin/permissions', label: 'Global Permissions', icon: KeyRound },
    { to: '/super-admin/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Dark theme matching executive portal */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-68 bg-[#0B132B] border-r border-white/5 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/10 bg-[#0B132B]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-sm tracking-wide">SYSTEM PORTAL</h2>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SUPER ADMIN
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/25 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Pill & Sign Out */}
        <div className="p-4 border-t border-white/10 bg-[#0B132B] space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user?.first_name ? user.first_name[0] : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Super Admin'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'Platform Owner'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-red-500/15"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        {/* Mobile Header Menu Button */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 bg-[#0B132B] border-b border-white/10 shadow-sm z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-white text-sm">SYSTEM PORTAL</span>
          <div className="w-8 h-8" />
        </header>

        {/* Overlay when sidebar open on mobile */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 hide-scrollbar p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

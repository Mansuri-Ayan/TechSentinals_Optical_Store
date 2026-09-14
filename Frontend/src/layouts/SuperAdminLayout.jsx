import { useCallback, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Menu, LayoutDashboard, Users, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function SuperAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - Dark theme matching main app sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#0B132B] border-r border-white/5 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 h-24 border-b border-white/10 bg-[#0B132B]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wide">SYSTEM PORTAL</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SUPER ADMIN</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <NavLink
            to="/super-admin/dashboard"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive ? 'bg-emerald-555 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            style={({ isActive }) => isActive ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : {}}
            onClick={() => setIsSidebarOpen(false)}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/super-admin/admins"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive ? 'bg-emerald-555 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            style={({ isActive }) => isActive ? { backgroundColor: 'rgba(16, 185, 129, 0.1)' } : {}}
            onClick={() => setIsSidebarOpen(false)}
          >
            <Building2Icon className="w-4.5 h-4.5" />
            Businesses (Admins)
          </NavLink>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-white/10 bg-[#0B132B]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative">
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Simple fallback icon if building not imported
function Building2Icon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

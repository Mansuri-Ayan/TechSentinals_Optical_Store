import { useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, ShieldAlert, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../components/admin/Sidebar';
import NotificationBell from '../components/shared/NotificationBell';
import { useMyPermissions } from '../hooks/usePermissions';
import { getMeApi } from '../api/auth/auth.api';
import { useAuthStore } from '../store/store';

function AdminLayout() {
  useMyPermissions(); // Fetch permissions on mount
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [impersonationData, setImpersonationData] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const raw = sessionStorage.getItem('impersonation_session');
    if (raw) {
      try {
        setImpersonationData(JSON.parse(raw));
      } catch (e) {
        setImpersonationData(null);
      }
    } else {
      setImpersonationData(null);
    }
  }, []);

  const handleExitImpersonation = async () => {
    try {
      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonation_session');
      // Re-fetch current authenticated user (the Super Admin cookie is still intact)
      const me = await getMeApi();
      setUser(me);
      toast.info('Exited tenant impersonation. Welcome back to Super Admin Portal.');
      navigate('/super-admin/admins', { replace: true });
    } catch (err) {
      sessionStorage.removeItem('impersonation_token');
      sessionStorage.removeItem('impersonation_session');
      navigate('/super-admin/dashboard', { replace: true });
    }
  };
  
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleToggleCollapse = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden absolute top-4 left-4 sm:top-5 sm:left-6 z-40 p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Notification Bell */}
        {createPortal(
          <div className="fixed top-4 right-4 sm:top-5 sm:right-6 lg:right-8 z-[999] flex items-center">
            <NotificationBell role="admin" />
          </div>,
          document.body
        )}

        {/* Impersonation Banner */}
        {impersonationData && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white px-4 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between shadow-md z-30 shrink-0 border-b border-amber-600/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <span className="font-extrabold uppercase text-[11px] tracking-wider bg-black/25 px-2 py-0.5 rounded-md mr-2">
                  Impersonation Mode
                </span>
                <span className="text-xs font-semibold">
                  Viewing as <strong className="font-bold underline">{impersonationData.business_name}</strong> ({impersonationData.email})
                </span>
              </div>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border border-white/20 shadow-xs ml-4"
              title="Return to Super Admin Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Impersonation</span>
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

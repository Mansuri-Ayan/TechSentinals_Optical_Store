import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/admin/Sidebar';
import NotificationBell from '../components/shared/NotificationBell';
import { useMyPermissions } from '../hooks/usePermissions';

function AdminLayout() {
  useMyPermissions(); // Fetch permissions on mount
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

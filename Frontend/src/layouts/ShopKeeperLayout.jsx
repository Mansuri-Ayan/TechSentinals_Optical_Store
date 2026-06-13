import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import ShopkeeperSidebar from '../components/shopkeeper/ShopkeeperSidebar';
import NotificationBell from '../components/shared/NotificationBell';

export default function ShopKeeperLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleToggleCollapse = useCallback(() => setIsSidebarCollapsed(prev => !prev), []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Component */}
      <ShopkeeperSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="lg:hidden text-[#0A0F1F] font-bold text-lg tracking-tight">TechSentinals</span>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell role="shopkeeper" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

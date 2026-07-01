import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import ShopkeeperSidebar from '../components/shopkeeper/ShopkeeperSidebar';
import { useMyPermissions } from '../hooks/usePermissions';

export default function ShopKeeperLayout() {
  useMyPermissions();
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
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden absolute top-4 left-4 sm:top-5 sm:left-6 z-40 p-2.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-all"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

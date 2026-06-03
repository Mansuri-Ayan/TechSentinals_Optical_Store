import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/admin/Sidebar';

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header with Hamburger */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center h-16 px-4 bg-[#0A0F1F] border-b border-white/10 shadow-lg">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 text-white font-semibold text-lg tracking-tight">TechSentinals</span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

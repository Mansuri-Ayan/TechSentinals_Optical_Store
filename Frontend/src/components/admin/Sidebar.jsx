import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Glasses, ChevronDown, Check } from 'lucide-react';

const dummyStores = [
  { id: 1, name: 'Main St Optical' },
  { id: 2, name: 'Downtown Eyewear' },
  { id: 3, name: 'Westside Clinic' }
];

const Sidebar = () => {
  const [selectedStore, setSelectedStore] = useState(dummyStores[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="w-[280px] bg-[#0A0F1F] text-slate-300 min-h-screen flex flex-col border-r border-white/5 shadow-2xl relative z-20">
      {/* Sidebar Header / Store Selector */}
      <div className="h-24 flex items-center px-6 border-b border-white/10 relative">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mr-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Glasses className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        </div>
        
        {dummyStores.length === 1 ? (
          <h2 className="text-lg font-semibold tracking-tight text-white truncate">{dummyStores[0].name}</h2>
        ) : (
          <div className="relative w-full" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between w-full bg-transparent text-white text-base font-semibold focus:outline-none py-2 text-left"
            >
              <span className="truncate">{selectedStore.name}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Custom Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                {dummyStores.map(store => (
                  <button
                    key={store.id}
                    onClick={() => {
                      setSelectedStore(store);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors ${
                      selectedStore.id === store.id 
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    {store.name}
                    {selectedStore.id === store.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-8 space-y-1.5">
        <div className="px-4 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview</div>
        
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${
              isActive 
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
          <span className="font-medium text-sm">Dashboard</span>
        </NavLink>

        <NavLink
          to="/admin/staff"
          className={({ isActive }) =>
            `flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${
              isActive 
                ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_10px_rgba(16,185,129,0.1)] border border-emerald-500/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
            }`
          }
        >
          <Users className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
          <span className="font-medium text-sm">Staff Directory</span>
        </NavLink>
      </nav>

      {/* User Profile & Footer */}
      <div className="p-4 border-t border-white/10 bg-[#060a16]">
        {/* Profile Card */}
        <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            AM
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">Admin Manager</p>
            <p className="text-xs text-slate-400 truncate">admin@gmail.com</p>
          </div>
        </div>

        <NavLink
          to="/login"
          className="flex items-center px-4 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group"
        >
          <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Sign Out</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;

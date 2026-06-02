import React, { useState } from 'react';
import { 
  Search, Edit2, Trash2, X, Plus, Users, 
  UserCheck, UserMinus, UserPlus, Download, 
  Upload, ChevronRight
} from 'lucide-react';
import AddStaffModal from '../../components/admin/AddStaffModal';

const roleColors = ['border-blue-500', 'border-emerald-500', 'border-purple-500', 'border-amber-500', 'border-rose-500', 'border-cyan-500', 'border-indigo-500'];

const initialStaffData = [
  { id: 1, name: 'Jane Doe', role: 'Optometrist', email: 'jane.doe@example.com', phone: '+1 234 567 8900', joiningDate: '2023-01-15', status: 'Active', lastActive: '2 mins ago', roleColor: 'border-blue-500', image: null },
  { id: 2, name: 'John Smith', role: 'Sales Associate', email: 'john.smith@example.com', phone: '+1 234 567 8901', joiningDate: '2023-03-10', status: 'Active', lastActive: '1 hr ago', roleColor: 'border-emerald-500', image: null },
  { id: 3, name: 'Emily Clark', role: 'Store Manager', email: 'emily.clark@example.com', phone: '+1 234 567 8902', joiningDate: '2022-11-05', status: 'On Leave', lastActive: '2 days ago', roleColor: 'border-purple-500', image: null },
  { id: 4, name: 'Michael Brown', role: 'Technician', email: 'michael.b@example.com', phone: '+1 234 567 8903', joiningDate: '2024-02-20', status: 'Active', lastActive: 'Just now', roleColor: 'border-amber-500', image: null },
];

const kpiData = [ 
  { title: 'Total Staff', value: '24', trend: '+12%', trendUp: true, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { title: 'Active Today', value: '18', trend: '+5%', trendUp: true, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { title: 'On Leave', value: '3', trend: '-1', trendUp: false, icon: UserMinus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { title: 'New This Month', value: '2', trend: '+2', trendUp: true, icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

const filters = ['All Roles', 'Active', 'On Leave', 'Managers', 'Optometrists'];

const Staff = () => {
  const [staff, setStaff] = useState(initialStaffData);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Roles');
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);

  // Derived state for filtering
  const filteredStaff = staff.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          person.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'All Roles' || 
                          person.status === activeFilter ||
                          (activeFilter === 'Managers' && person.role.includes('Manager')) ||
                          (activeFilter === 'Optometrists' && person.role.includes('Optometrist'));
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      setStaff(staff.filter(person => person.id !== id));
    }
  };

  const handleEditStaff = (updatedStaff) => {
    setStaff(staff.map(person => person.id === updatedStaff.id ? updatedStaff : person));
  };

  const handleAddStaff = (newStaff) => {
    setStaff(prev => [newStaff, ...prev]);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      
      {/* Breadcrumbs & Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-3 sm:mb-4 space-x-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-slate-900 font-semibold">Staff</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">Manage your optical store employees, roles, and permissions.</p>
          </div>
          
          {/* Contextual Actions */}
          <div className="flex items-center space-x-3">
            <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Upload className="w-4 h-4 mr-2 text-slate-400" />
              Import
            </button>
            <button className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Download className="w-4 h-4 mr-2 text-slate-400" />
              Export
            </button>
            <button 
              onClick={() => setShowAddStaff(true)}
              className="flex items-center px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10">
        {kpiData.map((kpi, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-0.5 sm:mb-1 truncate">{kpi.title}</p>
                <h3 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">{kpi.value}</h3>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${kpi.bg} ${kpi.color} flex-shrink-0 ml-2`}>
                <kpi.icon className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center text-xs sm:text-sm relative z-10">
              <span className={`font-semibold ${kpi.trendUp ? 'text-emerald-500' : 'text-amber-500'}`}>
                {kpi.trend}
              </span>
              <span className="text-slate-400 ml-1.5 sm:ml-2 truncate">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="relative w-full lg:max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-11 pr-16 py-3 bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 sm:text-sm font-medium transition-all shadow-sm placeholder:text-slate-400"
          />
          <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center pointer-events-none">
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">⌘K</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === filter 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Directory Cards */}
      <div className="space-y-3">
        {filteredStaff.length > 0 ? filteredStaff.map((person) => (
          <div key={person.id} className="bg-white border border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative overflow-hidden">
            {/* Accent Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${person.roleColor}`}></div>
            
            {/* Desktop Layout (md+): Single row with aligned fixed-width columns */}
            {/* Mobile Layout (<md): Stacked vertical */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              {/* Avatar + Name Section */}
              <div className="flex items-center pl-2 min-w-0 md:flex-1">
                <div className="relative flex-shrink-0">
                  {person.image ? (
                    <img src={person.image} alt={person.name} className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shadow-inner" />
                  ) : (
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold text-base md:text-lg shadow-inner">
                      {person.name.charAt(0)}
                    </div>
                  )}
                  {/* Online Pulse Indicator */}
                  {person.status === 'Active' && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                  )}
                </div>
                <div className="ml-3 md:ml-5 min-w-0">
                  <div className="text-sm md:text-base font-bold text-slate-900 truncate">{person.name}</div>
                  <div className="text-xs md:text-sm font-medium text-slate-500 mt-0.5 truncate">{person.email}</div>
                </div>
              </div>

              {/* Info columns + Actions - aligned on desktop */}
              <div className="flex flex-wrap items-center gap-2 pl-2 md:pl-0 md:flex-nowrap md:gap-0">
                {/* Role Badge - fixed width on desktop */}
                <div className="md:w-40 flex items-center md:justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {person.role}
                  </span>
                </div>
                
                {/* Status Badge - fixed width on desktop */}
                <div className="md:w-32 flex items-center md:justify-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    person.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${person.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {person.status}
                  </span>
                </div>

                {/* Last Active - fixed width on desktop, hidden on mobile (shown below) */}
                <div className="hidden md:flex md:w-32 items-center justify-center text-sm font-medium text-slate-400">
                  {person.lastActive}
                </div>

                {/* Action Buttons - always visible on mobile, hover on desktop */}
                <div className="md:w-auto flex items-center space-x-1 md:space-x-2 md:opacity-0 group-hover:opacity-100 transition-opacity ml-auto md:ml-0">
                  <button 
                    onClick={() => setEditingStaff(person)}
                    className="p-2 md:p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-colors" 
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(person.id)}
                    className="p-2 md:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg md:rounded-xl transition-colors" 
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile-only: Last Active time */}
            <div className="md:hidden mt-2 pl-2 text-xs font-medium text-slate-400">
              Last active: {person.lastActive}
            </div>
          </div>
        )) : (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl sm:rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-slate-100">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No staff members found</h3>
            <p className="text-slate-500 text-sm">We couldn't find anyone matching your search criteria.</p>
            <button 
              onClick={() => {setSearchTerm(''); setActiveFilter('All Roles');}}
              className="mt-3 sm:mt-4 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <AddStaffModal 
        isOpen={showAddStaff || !!editingStaff} 
        onClose={() => { setShowAddStaff(false); setEditingStaff(null); }} 
        onAddStaff={handleAddStaff}
        onEditStaff={handleEditStaff}
        initialData={editingStaff}
      />
    </div>
  );
};

export default Staff;

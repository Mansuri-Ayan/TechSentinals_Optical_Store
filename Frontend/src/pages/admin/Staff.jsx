import React, { useState } from 'react';
import { 
  Search, Edit2, Trash2, X, Plus, Users, 
  UserCheck, UserMinus, UserPlus, Download, 
  Upload, ChevronRight
} from 'lucide-react';

const initialStaffData = [
  { id: 1, name: 'Jane Doe', role: 'Optometrist', email: 'jane.doe@example.com', status: 'Active', lastActive: '2 mins ago', roleColor: 'border-blue-500' },
  { id: 2, name: 'John Smith', role: 'Sales Associate', email: 'john.smith@example.com', status: 'Active', lastActive: '1 hr ago', roleColor: 'border-emerald-500' },
  { id: 3, name: 'Emily Clark', role: 'Store Manager', email: 'emily.clark@example.com', status: 'On Leave', lastActive: '2 days ago', roleColor: 'border-purple-500' },
  { id: 4, name: 'Michael Brown', role: 'Technician', email: 'michael.b@example.com', status: 'Active', lastActive: 'Just now', roleColor: 'border-amber-500' },
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

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setStaff(staff.map(person => person.id === editingStaff.id ? editingStaff : person));
    setEditingStaff(null);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-fade-in font-sans">
      
      {/* Breadcrumbs & Header */}
      <div className="mb-8">
        <div className="flex items-center text-sm text-slate-500 font-medium mb-4 space-x-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">Dashboard</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-semibold">Staff</span>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
              Staff Directory
            </h1>
            <p className="text-slate-500 mt-2 text-base">Manage your optical store employees, roles, and permissions.</p>
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
              onClick={() => alert("Add Staff functionality is currently disabled.")}
              className="flex items-center px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpiData.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">{kpi.title}</p>
                <h3 className="text-3xl font-heading font-bold text-slate-900">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm relative z-10">
              <span className={`font-semibold ${kpi.trendUp ? 'text-emerald-500' : 'text-amber-500'}`}>
                {kpi.trend}
              </span>
              <span className="text-slate-400 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
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
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
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

      {/* Staff Directory Table (Card Style) */}
      <div className="space-y-3">
        {filteredStaff.length > 0 ? filteredStaff.map((person) => (
          <div key={person.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group relative overflow-hidden">
            {/* Accent Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${person.roleColor}`}></div>
            
            <div className="flex items-center w-full md:w-auto mb-4 md:mb-0 pl-2">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  {person.name.charAt(0)}
                </div>
                {/* Online Pulse Indicator */}
                {person.status === 'Active' && (
                  <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                )}
              </div>
              <div className="ml-5">
                <div className="text-base font-bold text-slate-900 flex items-center">
                  {person.name}
                </div>
                <div className="text-sm font-medium text-slate-500 mt-0.5">{person.email}</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center w-full md:w-auto space-y-4 md:space-y-0 md:space-x-8">
              <div className="w-full md:w-40 flex items-center md:justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {person.role}
                </span>
              </div>
              
              <div className="w-full md:w-32 flex items-center md:justify-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  person.status === 'Active' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${person.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {person.status}
                </span>
              </div>

              <div className="w-full md:w-32 flex items-center md:justify-center text-sm font-medium text-slate-400">
                {person.lastActive}
              </div>

              {/* Hover Actions */}
              <div className="w-full md:w-auto flex justify-end space-x-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingStaff(person)}
                  className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" 
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(person.id)}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No staff members found</h3>
            <p className="text-slate-500">We couldn't find anyone matching your search criteria.</p>
            <button 
              onClick={() => {setSearchTerm(''); setActiveFilter('All Roles');}}
              className="mt-4 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal Overlay */}
      {editingStaff && (
        <div className="fixed inset-0 glass flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-heading font-bold text-slate-900">Edit Member</h2>
                <p className="text-sm text-slate-500 mt-1">Update staff details and roles.</p>
              </div>
              <button 
                onClick={() => setEditingStaff(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input 
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input 
                  type="email"
                  required
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                  <input 
                    type="text"
                    required
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select 
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({...editingStaff, status: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-[#0A0F1F] text-white hover:bg-slate-800 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;

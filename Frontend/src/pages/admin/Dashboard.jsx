import React, { useState } from 'react';
import { Users, DollarSign, ShoppingBag, Activity, Plus } from 'lucide-react';
import AddStoreModal from '../../components/admin/AddStoreModal';

const Dashboard = () => {
  const [showAddStore, setShowAddStore] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header with Add Store button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <button
          onClick={() => setShowAddStore(true)}
          className="flex items-center px-5 py-2.5 bg-[#0A0F1F] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[
          { title: 'Total Revenue', value: '$54,230', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Active Staff', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Total Orders', value: '1,240', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
          { title: 'Conversion Rate', value: '4.8%', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className={`p-3 sm:p-4 rounded-lg ${stat.bg} ${stat.color} mr-3 sm:mr-4 flex-shrink-0`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-0.5 sm:mb-1 truncate">{stat.title}</p>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-8 h-64 sm:h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">Chart Placeholder</p>
      </div>

      <AddStoreModal 
        isOpen={showAddStore} 
        onClose={() => setShowAddStore(false)} 
      />
    </div>
  );
};

export default Dashboard;
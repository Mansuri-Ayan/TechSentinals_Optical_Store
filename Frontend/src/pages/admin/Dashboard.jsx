import React from 'react';
import { Users, DollarSign, ShoppingBag, Activity } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Total Revenue', value: '$54,230', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { title: 'Active Staff', value: '24', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
          { title: 'Total Orders', value: '1,240', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
          { title: 'Conversion Rate', value: '4.8%', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className={`p-4 rounded-lg ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">Chart Placeholder</p>
      </div>
    </div>
  );
};

export default Dashboard;
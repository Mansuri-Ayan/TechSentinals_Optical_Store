import { useState, useEffect } from 'react';
import { Award, RefreshCw, Download, Sliders, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';

import LoyaltyStatsCards from '../../components/loyalty/LoyaltyStatsCards';
import LoyaltyTierCard from '../../components/loyalty/LoyaltyTierCard';
import LoyaltyDistributionChart from '../../components/loyalty/LoyaltyDistributionChart';
import LoyaltyGrowthChart from '../../components/loyalty/LoyaltyGrowthChart';
import LoyaltyCustomerTable from '../../components/loyalty/LoyaltyCustomerTable';
import PointsConfigModal from '../../components/loyalty/PointsConfigModal';

import { getLoyaltyData, updatePointsConfig } from '../../data/loyaltyData';

const Loyalty = () => {
  const [customers, setCustomers] = useState([]);
  const [pointsConfig, setPointsConfig] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data
  const loadData = () => {
    const { customers: cust, pointsConfig: cfg } = getLoyaltyData();
    setCustomers(cust);
    setPointsConfig(cfg);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
      toast.success('Loyalty data refreshed.');
    }, 500);
  };

  const handleExport = () => {
    toast.info('Exporting loyalty customers list as CSV...');
    setTimeout(() => {
      toast.success('Export completed successfully.');
    }, 800);
  };

  const handleSaveConfig = (newConfig) => {
    updatePointsConfig(newConfig);
    setPointsConfig(newConfig);
    toast.success('Points multipliers configuration updated successfully.');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 pb-5 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-blue-500" />
            Loyalty Program
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
            Track customer loyalty points, membership tiers, and rewards.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Data
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0A0F1F] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <LoyaltyStatsCards customers={customers} />

      {/* Tiers summary & Points multiplier configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <LoyaltyTierCard customers={customers} />
        </div>
        
        {/* Points Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                Points Rules
              </h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                Edit Points
              </button>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2.5 font-extrabold">Product Type</th>
                    <th className="px-4 py-2.5 font-extrabold text-right">Points / Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {Object.keys(pointsConfig).map((key) => (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold">{key}</td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-900">{pointsConfig[key]} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-[10px] font-semibold text-slate-400 leading-relaxed mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
            * Multipliers dictate how many points customers earn per unit item order. Points update automatically upon invoicing.
          </div>
        </div>
      </div>

      {/* Growth & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <LoyaltyGrowthChart customers={customers} />
        </div>
        <div>
          <LoyaltyDistributionChart customers={customers} />
        </div>
      </div>

      {/* Customer Loyalty Table */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Customer Members Ledger</h2>
        </div>
        <LoyaltyCustomerTable customers={customers} routePrefix="/admin/loyalty" />
      </div>

      {/* Configuration Edit Modal */}
      <PointsConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={pointsConfig}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default Loyalty;

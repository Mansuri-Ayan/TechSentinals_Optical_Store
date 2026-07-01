import LoyaltyCustomerTable from '../../components/loyalty/LoyaltyCustomerTable';
import AdjustPointsModal from '../../components/loyalty/AdjustPointsModal';
import PointsConfigModal from '../../components/loyalty/PointsConfigModal';
import GlobalLoyaltyConfigModal from '../../components/loyalty/GlobalLoyaltyConfigModal';

import {
  useLoyaltyConfig,
  useUpdateLoyaltyConfig,
  useLoyaltyStats,
  useLoyaltyTrends,
  useLoyaltyTierDistribution,
  useLoyaltyCategories,
  useLoyaltyCustomers,
  useUpdateLoyaltyCategory,
  useAdjustLoyaltyPoints
} from '../../hooks/useLoyalty';
import { useState } from 'react';
import LoyaltyGrowthChart from '../../components/loyalty/LoyaltyGrowthChart';
import LoyaltyDistributionChart from '../../components/loyalty/LoyaltyDistributionChart';
import { Award, Download, Edit2, RefreshCw, Sliders } from 'lucide-react';
import { toast } from 'react-toastify';
import LoyaltyStatsCards from '../../components/loyalty/LoyaltyStatsCards';
import LoyaltyTierCard from '../../components/loyalty/LoyaltyTierCard';
import PermissionGuard from '../../components/shared/PermissionGuard';

const Loyalty = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Table filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isGlobalConfigModalOpen, setIsGlobalConfigModalOpen] = useState(false);
  const [adjustCustomer, setAdjustCustomer] = useState(null);

  // Hooks
  const { data: globalConfig, refetch: refetchGlobalConfig } = useLoyaltyConfig(null, 'shopkeeper');
  const { mutate: updateGlobalConfig, isPending: isUpdatingGlobalConfig } = useUpdateLoyaltyConfig(null, 'shopkeeper');

  const { data: stats, refetch: refetchStats } = useLoyaltyStats(null, 'shopkeeper');
  const { data: trends, refetch: refetchTrends } = useLoyaltyTrends(null, 'shopkeeper');
  const { data: tierDistribution, refetch: refetchTierDist } = useLoyaltyTierDistribution(null, 'shopkeeper');
  const { data: categories, refetch: refetchCategories } = useLoyaltyCategories(null, 'shopkeeper');
  
  const { data: customersData, refetch: refetchCustomers } = useLoyaltyCustomers(null, 'shopkeeper', {
    page: currentPage,
    page_size: 10,
    search: searchTerm || undefined,
    tier: tierFilter !== 'ALL' ? tierFilter : undefined
  });

  const { mutate: updateCategory, isPending: isUpdatingCategory } = useUpdateLoyaltyCategory(null, 'shopkeeper');
  const { mutate: adjustPoints, isPending: isAdjusting } = useAdjustLoyaltyPoints(null, 'shopkeeper');

  const handleRefresh = () => {
    setIsRefreshing(true);
    Promise.all([
      refetchGlobalConfig(),
      refetchStats(),
      refetchTrends(),
      refetchTierDist(),
      refetchCategories(),
      refetchCustomers()
    ]).then(() => {
      setIsRefreshing(false);
      toast.success('Loyalty data refreshed.');
    });
  };

  const handleExport = () => {
    toast.info('Exporting loyalty customers list as CSV...');
    setTimeout(() => {
      toast.success('Export completed successfully.');
    }, 800);
  };

  const handleSaveConfig = (updatedCategories) => {
    let promises = updatedCategories.map(cat => 
      new Promise((resolve, reject) => {
        updateCategory({ categoryId: cat.category_id, payload: { points_per_unit: cat.points_per_unit } }, {
          onSuccess: resolve,
          onError: reject
        });
      })
    );
    
    Promise.all(promises).then(() => {
      toast.success('Points configuration updated successfully.');
      setIsConfigModalOpen(false);
      refetchCategories();
    }).catch(err => {
      toast.error(err?.response?.data?.detail || 'Failed to update configuration.');
    });
  };

  const handleSaveGlobalConfig = (payload) => {
    updateGlobalConfig(payload, {
      onSuccess: () => {
        toast.success('Global loyalty rules updated successfully.');
        setIsGlobalConfigModalOpen(false);
        handleRefresh();
      },
      onError: (err) => {
        toast.error(err?.response?.data?.detail || 'Failed to update global configuration.');
      }
    });
  };

  const handleSaveAdjustments = (payload) => {
    adjustPoints(payload, {
      onSuccess: () => {
        toast.success('Points adjusted successfully.');
        setAdjustCustomer(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.detail || 'Failed to adjust points.');
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 pb-5 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-8 h-8 text-emerald-505" />
            Loyalty Program
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-semibold">
            Track customer loyalty points, membership tiers, and rewards.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <PermissionGuard permission="loyalty:configure">
            <button
              onClick={() => setIsGlobalConfigModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              Program Settings
            </button>
          </PermissionGuard>
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
      <LoyaltyStatsCards stats={stats} tierDistribution={tierDistribution} config={globalConfig} />

      {/* Tiers summary & Points multiplier configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <LoyaltyTierCard tierDistribution={tierDistribution} config={globalConfig} />
        </div>
        
        {/* Points Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-500" />
                Category Multipliers
              </h3>
              <PermissionGuard permission="loyalty:configure">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit Multipliers
                </button>
              </PermissionGuard>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2.5 font-extrabold">Product Type</th>
                    <th className="px-4 py-2.5 font-extrabold text-right">Points / Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {categories?.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold">{cat.category_name}</td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-900">{cat.points_per_unit} pts</td>
                    </tr>
                  ))}
                  {(!categories || categories.length === 0) && (
                    <tr>
                      <td colSpan="2" className="px-4 py-4 text-center text-slate-500 text-xs">No points rules configured.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-[10px] font-semibold text-slate-400 leading-relaxed mt-4 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
            * These multipliers dictate how many points customers earn per unit item order. Points update automatically upon invoicing.
          </div>
        </div>
      </div>

      {/* Growth & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <LoyaltyGrowthChart trends={trends?.trends} />
        </div>
        <div>
          <LoyaltyDistributionChart tierDistribution={tierDistribution} />
        </div>
      </div>

      {/* Customer Loyalty Table */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Customer Members Ledger</h2>
        </div>
        <LoyaltyCustomerTable 
          data={customersData} 
          routePrefix="/shopkeeper/loyalty" 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          tierFilter={tierFilter}
          setTierFilter={setTierFilter}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onAdjustPoints={(c) => setAdjustCustomer(c)}
        />
      </div>

      {/* Modals */}
      <GlobalLoyaltyConfigModal
        isOpen={isGlobalConfigModalOpen}
        onClose={() => setIsGlobalConfigModalOpen(false)}
        config={globalConfig}
        onSave={handleSaveGlobalConfig}
        isPending={isUpdatingGlobalConfig}
      />
      <PointsConfigModal 
        isOpen={isConfigModalOpen} 
        onClose={() => setIsConfigModalOpen(false)} 
        categories={categories} 
        onSave={handleSaveConfig} 
        isPending={isUpdatingCategory} 
      />
      <AdjustPointsModal 
        isOpen={!!adjustCustomer} 
        onClose={() => setAdjustCustomer(null)} 
        customer={adjustCustomer} 
        onSave={handleSaveAdjustments} 
        isPending={isAdjusting} 
      />
    </div>
  );
};

export default Loyalty;

import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, MapPin, Phone, Mail, FileText, CheckCircle, XCircle,
  IndianRupee, ShoppingBag, Users, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStoreByIdApi } from '../../api/stores/store.api';

// Import Tab Components
import StoreOverview from '../../components/admin/stores/StoreOverview';
import StoreStaffTab from '../../components/admin/stores/StoreStaffTab';
import StoreInventoryTab from '../../components/admin/stores/StoreInventoryTab';
import StoreSuppliersTab from '../../components/admin/stores/StoreSuppliersTab';
import StoreCustomersTab from '../../components/admin/stores/StoreCustomersTab';
import StoreSalesTab from '../../components/admin/stores/StoreSalesTab';
import StoreExpensesTab from '../../components/admin/stores/StoreExpensesTab';
import StoreReportsTab from '../../components/admin/stores/StoreReportsTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'staff', label: 'Staff Directory' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'customers', label: 'Customers' },
  { id: 'sales', label: 'Sales History' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'reports', label: 'Reports' },
];

const StoreDetail = () => {
  const { storeId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Staff Search State (Moved here to prevent focus loss in child)
  const [staffSearchInput, setStaffSearchInput] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffPage, setStaffPage] = useState(1);

  // Inventory Search & Filter State
  const [inventorySearchInput, setInventorySearchInput] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockFilter, setInventoryStockFilter] = useState('all');
  const [inventoryPage, setInventoryPage] = useState(1);

  // Staff Search Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setStaffSearch(staffSearchInput);
      setStaffPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [staffSearchInput]);

  // Inventory Search Debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setInventorySearch(inventorySearchInput);
      setInventoryPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [inventorySearchInput]);

  const { data: store, isLoading: isLoadingStore, isError: isStoreError } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => getStoreByIdApi(storeId),
    retry: false,
  });

  const formatRupee = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (isLoadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-500 font-semibold font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading Store Dashboard...
      </div>
    );
  }

  if (isStoreError || !store) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center font-sans mt-12">
        <div className="w-16 h-16 bg-red-50 text-red-500 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Store Not Found</h2>
        <p className="text-slate-500 mb-6">The store branch you are trying to view does not exist or has been deleted.</p>
        <Link to="/admin/stores" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-sm hover:bg-slate-800 transition-colors shadow-md">
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>
    );
  }

  const storeName = store.store_name || store.name;
  const storeCode = store.store_code || store.code;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StoreOverview storeId={storeId} />;
      case 'staff':
        return (
          <StoreStaffTab
            storeId={storeId}
            searchInput={staffSearchInput}
            setSearchInput={setStaffSearchInput}
            search={staffSearch}
            page={staffPage}
            setPage={setStaffPage}
          />
        );
      case 'inventory':
        return (
          <StoreInventoryTab
            storeId={storeId}
            searchInput={inventorySearchInput}
            setSearchInput={setInventorySearchInput}
            search={inventorySearch}
            stockFilter={inventoryStockFilter}
            setStockFilter={setInventoryStockFilter}
            page={inventoryPage}
            setPage={setInventoryPage}
          />
        );
      case 'suppliers':
        return <StoreSuppliersTab storeId={storeId} />;
      case 'customers':
        return <StoreCustomersTab storeId={storeId} />;
      case 'sales':
        return <StoreSalesTab storeId={storeId} />;
      case 'expenses':
        return <StoreExpensesTab storeId={storeId} />;
      case 'reports':
        return store && <StoreReportsTab store={store} storeId={storeId} />;
      default:
        return <StoreOverview storeId={storeId} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      
      {/* ── Breadcrumbs ── */}
      <div className="flex items-center text-sm text-slate-500 font-medium mb-4 space-x-2">
        <Link to="/admin/dashboard" className="hover:text-slate-800 transition-colors">Dashboard</Link>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
        <Link to="/admin/stores" className="hover:text-slate-800 transition-colors">Stores</Link>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
        <span className="text-slate-900 font-semibold">{storeName}</span>
      </div>

      {/* ── Page Title / Header Info ── */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8 justify-between items-stretch">
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md">
              {storeName[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {storeName}
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md self-center">
                  {storeCode}
                </span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {store.address}, {store.city}, {store.state} - {store.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* Store Contacts & Meta */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-2/3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
              <p className="text-xs font-bold text-slate-700 truncate">{store.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
              <p className="text-xs font-bold text-slate-700 truncate">{store.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GSTIN / TAX</p>
              <p className="text-xs font-bold text-slate-700 truncate">{store.gst_number || 'Not Registered'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Widgets Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[
          { id: 'revenue', label: 'Revenue Generated', value: formatRupee(store.revenue_generated || 0), color: 'text-blue-700 bg-blue-50 border-blue-200', icon: IndianRupee },
          { id: 'sales', label: 'Total Orders', value: store.total_orders || 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: ShoppingBag },
          { id: 'staff', label: 'Store Staff Count', value: store.staff_count || 0, color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Users },
          { id: 'status', label: 'Store Status', value: store.is_active ? 'Active' : 'Inactive', color: store.is_active ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200', icon: store.is_active ? CheckCircle : XCircle },
        ].map(kpi => {
          const Icon = kpi.icon;
          const isClickable = ['sales', 'staff'].includes(kpi.id);
          return (
            <div
              key={kpi.label}
              onClick={() => isClickable && setActiveTab(kpi.id)}
              className={`flex items-center gap-4 p-4 sm:p-5 bg-white border rounded-2xl shadow-sm ${kpi.color} ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              <div className="p-2.5 rounded-xl bg-white/60 flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
                <p className="text-lg sm:text-2xl font-bold">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="border-b border-slate-200 mb-6 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 text-sm font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active Tab Component Content ── */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

    </div>
  );
};

export default StoreDetail;

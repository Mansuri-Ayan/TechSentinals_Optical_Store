import { useState, useCallback } from 'react';
import { useSuperAdmin } from '../../hooks/useSuperAdmin';
import { Search, Loader2, Plus, Edit, Trash2, Building2, User, Phone, Mail, MapPin, X, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function SuperAdminAdmins() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [addEditModal, setAddEditModal] = useState({ isOpen: false, item: null });
  const [showPassword, setShowPassword] = useState(false);

  const {
    admins,
    total,
    pages,
    isLoading,
    createAdminAsync,
    updateAdminAsync,
    deleteAdminAsync,
  } = useSuperAdmin({
    page: currentPage,
    limit: 10,
    search: searchTerm || undefined,
    status_filter: statusFilter || undefined,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleOpenAdd = () => {
    reset({
      business_name: '',
      owner_first_name: '',
      owner_last_name: '',
      email: '',
      phone: '',
      password: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      pan_number: '',
    });
    setShowPassword(false);
    setAddEditModal({ isOpen: true, item: null });
  };

  const handleOpenEdit = (item) => {
    reset({
      business_name: item.business_name,
      owner_first_name: item.owner_first_name,
      owner_last_name: item.owner_last_name,
      phone: item.phone,
      address: item.address,
      city: item.city,
      state: item.state,
      pincode: item.pincode,
      gst_number: item.gst_number || '',
      pan_number: item.pan_number || '',
      status: item.status,
    });
    setAddEditModal({ isOpen: true, item });
  };

  const handleSave = async (data) => {
    try {
      if (addEditModal.item) {
        // Edit
        await updateAdminAsync({
          id: addEditModal.item.id,
          payload: {
            business_name: data.business_name,
            owner_first_name: data.owner_first_name,
            owner_last_name: data.owner_last_name,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            gst_number: data.gst_number || null,
            pan_number: data.pan_number || null,
            status: data.status,
          }
        });
      } else {
        // Create
        await createAdminAsync(data);
      }
      setAddEditModal({ isOpen: false, item: null });
    } catch (err) {
      // toast is shown by mutation
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Admin Business "${name}"? This will also soft-delete all their store branches.`)) {
      try {
        await deleteAdminAsync(id);
      } catch (err) {}
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-emerald-600" />
            Businesses Directory
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            List, onboard, update, and manage Admin tenant accounts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Onboard Business
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by owner, company, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 text-slate-900 rounded-xl text-xs font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-white border border-slate-200/80 text-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-pointer shadow-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table / Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 bg-white border border-slate-200/60 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No businesses found</h3>
          <p className="text-slate-500 text-xs">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Business Name</th>
                  <th className="py-4 px-6">Owner Name</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {admins.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/45 transition-all">
                    <td className="py-4 px-6 font-bold text-slate-900">{item.business_name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {item.owner_first_name} {item.owner_last_name}
                      </div>
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {item.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {item.phone}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${item.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : item.status === 'SUSPENDED' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-500' : item.status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-slate-400'} flex-shrink-0`} />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                          title="Edit Business Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.business_name)}
                          className="p-2 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100/50 hover:text-red-700 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                          title="Delete Business"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-55">
              <span className="text-slate-500">Page {currentPage} of {pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  Prev
                </button>
                <button
                  disabled={currentPage === pages}
                  onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {addEditModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setAddEditModal({ isOpen: false, item: null })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-6">
              {addEditModal.item ? 'Edit Business Owner Details' : 'Onboard New Business'}
            </h3>

            <form onSubmit={handleSubmit(handleSave)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business/Company Name</label>
                  <input
                    type="text"
                    {...register('business_name', { required: 'Business Name is required' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.business_name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.business_name.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    {...register('phone', { required: 'Phone is required', minLength: 10, maxLength: 10 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Owner First Name</label>
                  <input
                    type="text"
                    {...register('owner_first_name', { required: 'First Name is required' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.owner_first_name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.owner_first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Owner Last Name</label>
                  <input
                    type="text"
                    {...register('owner_last_name', { required: 'Last Name is required' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.owner_last_name && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.owner_last_name.message}</p>}
                </div>
              </div>

              {!addEditModal.item && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      {...register('email', { required: 'Email is required' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    {errors.email && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', { required: 'Password is required', minLength: 6 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.password.message}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address</label>
                <input
                  type="text"
                  {...register('address', { required: 'Address is required' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                {errors.address && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    {...register('city', { required: 'City is required' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.city && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    {...register('state', { required: 'State is required' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.state && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pincode</label>
                  <input
                    type="text"
                    {...register('pincode', { required: 'Pincode is required', minLength: 6, maxLength: 6 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  {errors.pincode && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{errors.pincode.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GST Registration (Optional)</label>
                  <input
                    type="text"
                    {...register('gst_number')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="27AADCB2230M1ZT"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PAN Card Number (Optional)</label>
                  <input
                    type="text"
                    {...register('pan_number')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    placeholder="AADCB2230M"
                  />
                </div>
              </div>

              {addEditModal.item && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Status</label>
                  <select
                    {...register('status', { required: true })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {addEditModal.item ? 'Save Updates' : 'Onboard Business'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

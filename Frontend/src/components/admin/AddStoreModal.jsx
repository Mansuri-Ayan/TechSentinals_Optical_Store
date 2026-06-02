import React, { useState } from 'react';
import { X, Store } from 'lucide-react';
import { useStoreStore } from '../../store/store';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const emptyStoreForm = {
  name: '',
  createdBy: 'Admin User',
  creatorEmail: 'admin@techsentinals.com',
  gst: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  status: 'Active',
};

const AddStoreModal = ({ isOpen, onClose }) => {
  const [storeForm, setStoreForm] = useState(emptyStoreForm);
  const { addStore } = useStoreStore();

  if (!isOpen) return null;

  const handleStoreChange = (field, value) => {
    setStoreForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStoreSubmit = (e) => {
    e.preventDefault();
    addStore(storeForm);
    setStoreForm({ ...emptyStoreForm });
    onClose();
  };

  const handleCancel = () => {
    setStoreForm({ ...emptyStoreForm });
    onClose();
  };

  return (
    <div className="fixed inset-0 glass flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-2xl w-full overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-8 py-4 sm:py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Add New Store</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Fill in the store details below.</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleStoreSubmit} className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Store Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">1</span>
              Store Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Store Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => handleStoreChange('name', e.target.value)}
                  placeholder="Enter store name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Created By</label>
                <input
                  type="text"
                  readOnly
                  value={storeForm.createdBy}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Creator Email</label>
                <input
                  type="email"
                  readOnly
                  value={storeForm.creatorEmail}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-500 cursor-not-allowed transition-all text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">GST Number</label>
                <input
                  type="text"
                  value={storeForm.gst}
                  onChange={(e) => handleStoreChange('gst', e.target.value)}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">2</span>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  required
                  value={storeForm.phone}
                  onChange={(e) => handleStoreChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => handleStoreChange('email', e.target.value)}
                  placeholder="store@example.com"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Address Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">3</span>
              Address Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={storeForm.address}
                  onChange={(e) => handleStoreChange('address', e.target.value)}
                  placeholder="Enter full address"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={storeForm.city}
                    onChange={(e) => handleStoreChange('city', e.target.value)}
                    placeholder="Enter city"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">State <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={storeForm.state}
                    onChange={(e) => handleStoreChange('state', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                  >
                    <option value="">Select state</option>
                    {indianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pincode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={storeForm.pincode}
                    onChange={(e) => handleStoreChange('pincode', e.target.value)}
                    placeholder="Enter pincode"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-slate-900 transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Status */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs">4</span>
              Status
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleStoreChange('status', storeForm.status === 'Active' ? 'Inactive' : 'Active')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${storeForm.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${storeForm.status === 'Active' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-semibold ${storeForm.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                {storeForm.status}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="w-full sm:w-auto px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-semibold transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-[#0A0F1F] text-white hover:bg-slate-800 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm"
            >
              Save Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStoreModal;

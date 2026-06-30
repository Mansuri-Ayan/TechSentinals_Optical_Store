import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/store';
import { getBillTemplateSettings, saveBillTemplateSettings, defaultSettings } from '../../utils/billSettings';
import {
  Sparkles, FileText, CheckCircle, RefreshCw, Upload, Eye, ShoppingCart, User, CreditCard
} from 'lucide-react';
import { toast } from 'react-toastify';

const COLOR_SWATCHES = [
  { name: 'Emerald', value: '#10B981', bg: 'bg-[#10B981]' },
  { name: 'Indigo', value: '#6366F1', bg: 'bg-[#6366F1]' },
  { name: 'Slate/Navy', value: '#0A0F1F', bg: 'bg-[#0A0F1F]' },
  { name: 'Blue', value: '#3B82F6', bg: 'bg-[#3B82F6]' },
  { name: 'Purple', value: '#8B5CF6', bg: 'bg-[#8B5CF6]' },
  { name: 'Rose', value: '#F43F5E', bg: 'bg-[#F43F5E]' },
];

export default function BillTemplate() {
  const { storeId: routeStoreId } = useParams();
  const { user } = useAuthStore();
  const storeId = routeStoreId || user?.store_id || 'default';

  const [settings, setSettings] = useState(defaultSettings);
  const [logoPreview, setLogoPreview] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);

  // Load configuration for this store
  useEffect(() => {
    const loaded = getBillTemplateSettings(storeId);
    setSettings(loaded);
    setLogoPreview(loaded.logo);
    setQrPreview(loaded.qrCode);
  }, [storeId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectColor = (color) => {
    setSettings((prev) => ({ ...prev, themeColor: color }));
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Image size must be smaller than 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setSettings((prev) => ({ ...prev, [field]: base64String }));
      if (field === 'logo') setLogoPreview(base64String);
      if (field === 'qrCode') setQrPreview(base64String);
      toast.success(`${field === 'logo' ? 'Logo' : 'QR Code'} uploaded successfully.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (field) => {
    setSettings((prev) => ({ ...prev, [field]: null }));
    if (field === 'logo') setLogoPreview(null);
    if (field === 'qrCode') setQrPreview(null);
  };

  const handleSave = () => {
    saveBillTemplateSettings(storeId, settings);
    toast.success('Bill template settings saved successfully.');
  };

  const handleReset = () => {
    if (window.confirm('Reset template to default settings? Any customized values will be lost.')) {
      setSettings(defaultSettings);
      setLogoPreview(defaultSettings.logo);
      setQrPreview(defaultSettings.qrCode);
      saveBillTemplateSettings(storeId, defaultSettings);
      toast.info('Template settings reset to default values.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in font-sans">
      
      {/* Title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight">
          Bill Template Settings
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
          Customize the layout, header details, colors, store logo, and payment QR code for printed bills and customer invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sparkles className="w-5 h-5 text-emerald-500" /> Template Customizer
          </h2>

          <div className="space-y-4">
            
            {/* Header & Subheader text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Store Brand Name</label>
                <input
                  type="text"
                  name="headerText"
                  value={settings.headerText}
                  onChange={handleChange}
                  placeholder="e.g. Optical Store"
                  className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Invoice Label</label>
                <input
                  type="text"
                  name="subHeaderText"
                  value={settings.subHeaderText}
                  onChange={handleChange}
                  placeholder="e.g. Tax Invoice / Receipt"
                  className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Store Address</label>
              <textarea
                rows={2}
                name="address"
                value={settings.address}
                onChange={handleChange}
                placeholder="Store address line..."
                className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Email Address</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={settings.contactEmail}
                  onChange={handleChange}
                  placeholder="store@email.com"
                  className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Phone Number</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={settings.contactPhone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">GST Number</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={settings.gstNumber}
                  onChange={handleChange}
                  placeholder="GST registration ID"
                  className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Logo and QR Uploaders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {/* Logo Upload */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-600 block uppercase">Store Logo</span>
                {logoPreview ? (
                  <div className="relative w-32 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white mx-auto flex items-center justify-center">
                    <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => handleRemoveImage('logo')}
                      className="absolute top-1 right-1 bg-red-650 hover:bg-red-700 text-white p-1 rounded-full text-[10px] leading-none transition-colors"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-20 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:bg-slate-50 cursor-pointer transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Upload Logo (Max 500KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* QR Upload */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-600 block uppercase">Payment QR Code</span>
                {qrPreview ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white mx-auto flex items-center justify-center">
                    <img src={qrPreview} alt="QR Preview" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => handleRemoveImage('qrCode')}
                      className="absolute top-1 right-1 bg-red-650 hover:bg-red-700 text-white p-1 rounded-full text-[10px] leading-none transition-colors"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-20 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:bg-slate-50 cursor-pointer transition-all">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-slate-500">Upload QR Code (Max 500KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'qrCode')}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-y border-slate-50">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="showPrescription"
                  checked={settings.showPrescription}
                  onChange={handleChange}
                  className="w-4.5 h-4.5 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-600 uppercase">Show Prescription Info</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="showGst"
                  checked={settings.showGst}
                  onChange={handleChange}
                  className="w-4.5 h-4.5 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-600 uppercase">Show GST Tax Details</span>
              </label>
            </div>

            {/* Theme Colors */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2 uppercase">Theme Brand Color</span>
              <div className="flex gap-2.5 flex-wrap">
                {COLOR_SWATCHES.map((swatch) => {
                  const isSelected = settings.themeColor === swatch.value;
                  return (
                    <button
                      key={swatch.name}
                      onClick={() => handleSelectColor(swatch.value)}
                      className={`w-9 h-9 rounded-full ${swatch.bg} relative transition-transform hover:scale-110 cursor-pointer ${
                        isSelected ? 'ring-4 ring-offset-2 ring-emerald-400' : ''
                      }`}
                      type="button"
                      title={swatch.name}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer text */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Invoice Footer Notes</label>
              <input
                type="text"
                name="footerText"
                value={settings.footerText}
                onChange={handleChange}
                placeholder="Footer message..."
                className="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleReset}
              className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              type="button"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-[#0A0F1F] text-white hover:bg-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              type="button"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TEMPLATE PREVIEW */}
        <div className="bg-slate-100 border border-slate-200/50 rounded-3xl p-4 sm:p-6 shadow-inner space-y-4">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1.5">
            <FileText className="w-4 h-4 text-slate-500" /> Live Receipt Preview
          </span>

          <div
            className="bg-white rounded-2xl border border-slate-250 p-5 sm:p-6 space-y-5 text-slate-800 shadow-xl max-w-md mx-auto font-sans"
            style={{ borderTopWidth: '5px', borderTopColor: settings.themeColor }}
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-h-10 mb-2 object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
                <h2 className="text-sm font-black text-slate-900 tracking-tight truncate leading-tight">
                  {settings.headerText}
                </h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                  {settings.subHeaderText}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block leading-normal">
                  INV-2026-0081
                </p>
                <p className="text-[9px] text-slate-400 font-bold mt-1.5">
                  Date: 30 Jun 2026
                </p>
              </div>
            </div>

            {/* Billing Summary */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-[10px]">
              <div>
                <h3 className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Customer Details
                </h3>
                <div className="font-semibold text-slate-500 space-y-0.5 leading-tight">
                  <p className="font-bold text-slate-900">Ayan Mansuri</p>
                  <p>Phone: 9988776655</p>
                  <p className="truncate max-w-[150px]">Address: {settings.address || '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 justify-end">
                  Payment Details
                </h3>
                <div className="font-semibold text-slate-500 space-y-0.5 leading-tight">
                  <p className="font-bold text-slate-900">Paid via: <span style={{ color: settings.themeColor }} className="font-black">UPI</span></p>
                  <p>Outstanding: ₹0</p>
                  <p>Status: <span className="inline-flex px-1 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[8px] leading-none">Paid</span></p>
                </div>
              </div>
            </div>

            {/* Prescription Specifications */}
            {settings.showPrescription ? (
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[10px] space-y-2">
                <h3 className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Eye className="w-3 h-3 text-purple-500" /> Lens & Prescription Specs
                </h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-semibold text-slate-500">
                  <div>Lens Type: <span className="text-slate-950 font-bold">Progressive (Blue Cut)</span></div>
                  <div>Frame Pref: <span className="text-slate-950 font-bold">Ray-Ban Wayfarer</span></div>
                  <div>Doctor Name: <span className="text-slate-950 font-bold">Dr. Sharma</span></div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-200/40">
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <p className="text-[7px] font-black text-blue-600 uppercase tracking-wider mb-0.5 flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500" /> OD (Right)
                    </p>
                    <div className="grid grid-cols-3 gap-0.5 text-[8px] font-bold text-slate-400">
                      <div>SPH: <span className="text-slate-800 font-black">-1.50</span></div>
                      <div>CYL: <span className="text-slate-800 font-black">-0.50</span></div>
                      <div>AXIS: <span className="text-slate-800 font-black">180</span></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <p className="text-[7px] font-black text-emerald-600 uppercase tracking-wider mb-0.5 flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" /> OS (Left)
                    </p>
                    <div className="grid grid-cols-3 gap-0.5 text-[8px] font-bold text-slate-400">
                      <div>SPH: <span className="text-slate-800 font-black">-1.75</span></div>
                      <div>CYL: <span className="text-slate-800 font-black">-0.25</span></div>
                      <div>AXIS: <span className="text-slate-800 font-black">90</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2 text-center text-[9px] font-bold text-slate-400">
                Prescription Details Hidden (Disabled)
              </div>
            )}

            {/* Particulars Table */}
            <div className="space-y-1.5">
              <h3 className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" /> Particulars
              </h3>
              <div className="border border-slate-100 rounded-xl overflow-hidden text-[10px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[8px] tracking-wider">
                      <th className="px-2 py-1">Description</th>
                      <th className="px-1 py-1 text-center">Qty</th>
                      <th className="px-2 py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5">
                        <p className="font-bold text-slate-900">Ray-Ban Wayfarer Classic</p>
                        <p className="text-[8px] text-slate-400">Model: RB2140 · Black Frame</p>
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono">1</td>
                      <td className="px-2 py-1.5 text-right font-mono">₹4,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-2 py-1.5">
                        <p className="font-bold text-slate-900">Crizal Prevencia Progressive Lenses</p>
                        <p className="text-[8px] text-slate-400">Coating: Blue-Cut Anti-Reflective</p>
                      </td>
                      <td className="px-1 py-1.5 text-center font-mono">1</td>
                      <td className="px-2 py-1.5 text-right font-mono">₹3,200</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations and QR Code layout */}
            <div className="flex gap-4 justify-between items-end border-t border-slate-100 pt-3">
              {/* Payment QR Code (optional) */}
              <div className="text-left">
                {qrPreview ? (
                  <div className="space-y-1">
                    <div className="w-16 h-16 border border-slate-200 bg-white rounded-lg p-0.5 flex items-center justify-center">
                      <img src={qrPreview} alt="QR Pay" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-wide block text-center">Scan to Pay</span>
                  </div>
                ) : (
                  <div className="text-[7px] font-bold text-slate-400 italic">No Payment QR</div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="flex flex-col gap-1.5 w-40 text-[10px] font-semibold">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">₹7,700</span>
                </div>
                {settings.showGst && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>GST (Tax)</span>
                    <span className="font-mono font-bold">₹0</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-800 font-extrabold border-t border-slate-200/50 pt-1 mt-0.5">
                  <span>Final Total</span>
                  <span className="font-mono font-black text-slate-950">₹7,700</span>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="text-center text-[9px] font-bold text-slate-400 tracking-wide border-t border-slate-50 pt-3 italic">
              {settings.footerText}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

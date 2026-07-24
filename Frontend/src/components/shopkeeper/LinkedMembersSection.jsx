import React, { useState, useEffect } from 'react';
import { User, Link as LinkIcon, Search, Plus, Trash2, X, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLinkedMembers, useCreateLink, useRemoveLink } from '../../hooks/useCustomerLinks';
import { getCustomersApi } from '../../api/customer/customer.api';
import { toast } from 'react-toastify';

const LinkedMembersSection = ({ customerId, currentCustomer }) => {
  const navigate = useNavigate();
  const { data: linkedMembers = [], isLoading } = useLinkedMembers(customerId);
  const { mutateAsync: createLink } = useCreateLink();
  const { mutateAsync: removeLink } = useRemoveLink();

  const [isLinking, setIsLinking] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'create'

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Create State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newGender, setNewGender] = useState('NOT_SPECIFIED');
  
  const [conflictCustomer, setConflictCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [unlinkConfirmId, setUnlinkConfirmId] = useState(null);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getCustomersApi({ search: searchTerm, limit: 5, global_search: true });
        // Filter out the current customer and already linked members
        const filtered = (results || []).filter(c => 
          c.id !== customerId && 
          !linkedMembers.some(lm => lm.id === c.id)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, customerId, linkedMembers]);

  const handleLinkExisting = async (targetCustomerId) => {
    setIsSubmitting(true);
    try {
      await createLink({ customerId, payload: { customer_id_2: targetCustomerId } });
      toast.success("Account linked successfully");
      setIsLinking(false);
      resetForms();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to link account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndLink = async (e) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newPhone.trim()) return;
    
    setIsSubmitting(true);
    setConflictCustomer(null);
    try {
      const new_customer = {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim() || null,
        phone: newPhone.trim(),
        email: newEmail.trim() || null,
        date_of_birth: newDob || null,
        gender: newGender,
      };
      
      await createLink({ customerId, payload: { new_customer } });
      toast.success("Customer created and linked");
      setIsLinking(false);
      resetForms();
    } catch (err) {
      if (err?.response?.status === 409) {
        setConflictCustomer(err.response.data.customer);
      } else {
        toast.error(err?.response?.data?.detail || "Failed to create and link customer");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async (linkedId) => {
    try {
      await removeLink({ customerId, linkedId });
      toast.success("Link removed");
      setUnlinkConfirmId(null);
    } catch (err) {
      toast.error("Failed to remove link");
    }
  };

  const resetForms = () => {
    setSearchTerm('');
    setSearchResults([]);
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setNewEmail('');
    setNewDob('');
    setNewGender('NOT_SPECIFIED');
    setConflictCustomer(null);
    setActiveTab('search');
  };

  return (
    <div className="mt-8 border-t border-slate-200 pt-8 animate-fade-in font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-500" />
            Linked Members
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">People linked to this customer's account</p>
        </div>
        {!isLinking && (
          <button
            onClick={() => setIsLinking(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Link Person
          </button>
        )}
      </div>

      {isLinking && (
        <div className="mb-8 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <button
                className={`text-xs font-bold px-2 py-1.5 border-b-2 transition-colors ${activeTab === 'search' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('search')}
              >
                Search Existing Customer
              </button>
              <button
                className={`text-xs font-bold px-2 py-1.5 border-b-2 transition-colors ${activeTab === 'create' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveTab('create')}
              >
                Create New & Link
              </button>
            </div>
            <button onClick={() => { setIsLinking(false); resetForms(); }} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 bg-white">
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Search className="w-4 h-4 text-slate-400" />}
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {searchResults.map(c => (
                      <div key={c.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{c.first_name} {c.last_name || ''}</p>
                            <p className="text-xs text-slate-500">{c.phone} &middot; {c.current_points || 0} pts</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLinkExisting(c.id)}
                          disabled={isSubmitting}
                          className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                          Link
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {searchTerm.trim() && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">No customers found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'create' && (
              <form onSubmit={handleCreateAndLink} className="space-y-5">
                {conflictCustomer ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center animate-in fade-in">
                    <p className="text-sm text-amber-800 font-medium mb-3">
                      This phone belongs to <strong>{conflictCustomer.first_name} {conflictCustomer.last_name || ''}</strong>. Link to their account instead?
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => handleLinkExisting(conflictCustomer.id)}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        Link Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setConflictCustomer(null)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">First Name *</label>
                        <input required type="text" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                        <input type="text" value={newLastName} onChange={e => setNewLastName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone *</label>
                        <input required type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button type="button" onClick={() => { setIsLinking(false); resetForms(); }} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {isSubmitting ? 'Creating...' : 'Create & Link'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : linkedMembers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <LinkIcon className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-1">No linked members yet.</p>
          <p className="text-xs text-slate-500">Link family members or friends to share billing accounts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedMembers.map(lm => (
            <div key={lm.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{lm.first_name} {lm.last_name || ''}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{lm.phone}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                      {lm.membership_tier}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-700">
                      {lm.current_points || 0} pts
                    </span>
                  </div>
                </div>
              </div>
              
              {unlinkConfirmId === lm.id ? (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in">
                  <p className="text-xs font-bold text-slate-800 mb-3">Remove link?</p>
                  <div className="flex gap-2 w-full">
                    <button onClick={() => setUnlinkConfirmId(null)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => handleUnlink(lm.id)} className="flex-1 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                      Yes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`../customers/${lm.id}`, { relative: 'path' })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </button>
                  <button
                    onClick={() => setUnlinkConfirmId(lm.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Unlink
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedMembersSection;

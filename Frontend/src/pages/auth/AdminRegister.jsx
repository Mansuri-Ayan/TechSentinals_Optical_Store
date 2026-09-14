import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, User, Phone, Mail, MapPin, Eye, EyeOff, Shield,
  ArrowLeft, CheckCircle2, RefreshCw, Loader2, KeyRound, Sparkles
} from 'lucide-react';
import LoginPageImg from '../../assets/LoginPage.png';
import {
  useRegisterAdminPublic,
  useSendAdminOtp,
  useVerifyAdminOtp,
  useCheckAdminOtpStatus,
} from '../../hooks/useSuperAdmin';

export default function AdminRegister() {
  const navigate = useNavigate();

  // Restore saved registration form data from sessionStorage if page is refreshed or user exits & returns
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('admin_register_formData');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification, 3: Completed
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(600);
  const otpInputRefs = useRef([]);

  const { registerAdminPublicAsync, isRegistering } = useRegisterAdminPublic();
  const { sendAdminOtpAsync, isSendingOtp } = useSendAdminOtp();
  const { verifyAdminOtpAsync, isVerifyingOtp } = useVerifyAdminOtp();
  const { checkAdminOtpStatusAsync } = useCheckAdminOtpStatus();

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: formData || {},
  });

  // Check Backend Active OTP Session on Mount to restore Step 2 if user refreshes or returns before OTP expires
  useEffect(() => {
    if (!formData?.email) return;

    let isMounted = true;
    checkAdminOtpStatusAsync({ email: formData.email })
      .then((res) => {
        if (!isMounted) return;
        if (res?.active) {
          setStep(2);
          setExpirySeconds(res.expires_in_seconds || 600);
          setCooldown(res.cooldown_seconds || 0);
        } else {
          sessionStorage.removeItem('admin_register_formData');
          setStep(1);
        }
      })
      .catch(() => {
        if (isMounted) {
          sessionStorage.removeItem('admin_register_formData');
          setStep(1);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown countdown timer (60s resend limit)
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Expiry countdown timer (10-minute expiry)
  useEffect(() => {
    let timer;
    if (step === 2 && expirySeconds > 0) {
      timer = setInterval(() => setExpirySeconds(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, expirySeconds]);

  // Handle Form Submission -> Send OTP (Preserves form data in sessionStorage)
  const onFormSubmit = async (data) => {
    try {
      setFormData(data);
      sessionStorage.setItem('admin_register_formData', JSON.stringify(data));
      const res = await sendAdminOtpAsync({ email: data.email });
      setStep(2);
      setCooldown(res?.cooldown_seconds || 60);
      setExpirySeconds(res?.expires_in_seconds || 600);
    } catch (err) {
      // Error toast handled in hook
    }
  };

  // Handle Resend OTP (Explicitly requests new OTP and invalidates previous OTP)
  const handleResendOtp = async () => {
    if (cooldown > 0 || !formData?.email) return;
    try {
      const res = await sendAdminOtpAsync({ email: formData.email, force_new: true });
      setCooldown(res?.cooldown_seconds || 60);
      setExpirySeconds(res?.expires_in_seconds || 600);
      setOtp(['', '', '', '', '', '']);
      if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
    } catch (err) {
      // Error toast handled in hook
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      if (otpInputRefs.current[nextIndex]) otpInputRefs.current[nextIndex].focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const digits = pastedData.split('');
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const focusIdx = Math.min(digits.length, 5);
    if (otpInputRefs.current[focusIdx]) otpInputRefs.current[focusIdx].focus();
  };

  // Handle Verify OTP & Complete Registration
  const handleVerifyAndRegister = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6 || !formData?.email) return;

    try {
      // 1. Verify OTP code & obtain verification token
      const verifyRes = await verifyAdminOtpAsync({
        email: formData.email,
        otp: fullOtp,
      });

      const verificationToken = verifyRes.verification_token;

      // 2. Complete Admin Registration with token
      const nameParts = (formData.full_name || '').trim().split(/\s+/);
      const owner_first_name = nameParts[0] || 'Admin';
      const owner_last_name = nameParts.slice(1).join(' ') || 'Owner';

      await registerAdminPublicAsync({
        ...formData,
        business_name: formData.store_name || formData.business_name || 'Optical Store',
        owner_first_name,
        owner_last_name,
        address: formData.address || 'Main Store Address',
        city: formData.city || 'Mumbai',
        state: formData.state || 'Maharashtra',
        pincode: formData.pincode || '400001',
        verification_token: verificationToken,
      });

      sessionStorage.removeItem('admin_register_formData');
      setStep(3);
    } catch (err) {
      // Error toast handled in hooks
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Left Side - Image (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src={LoginPageImg}
          alt="Optical Store"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div className="relative z-20 flex flex-col justify-center px-10 xl:px-16 text-white h-full">
          <h1 className="text-4xl xl:text-5xl font-extrabold mb-4 xl:mb-6 tracking-tight">
            Partner with ClearSight ERP
          </h1>
          <p className="text-lg xl:text-xl text-gray-200 max-w-md font-medium">
            Deploy store inventories, manage optician prescriptions, and automate family loyalty rewards.
          </p>
        </div>
      </div>

      {/* Right Side - Step Wizard */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto">
        <div className="max-w-xl w-full space-y-6 sm:space-y-8 my-auto">
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                1
              </span>
              <span className={`text-xs font-bold ${step === 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                Business Details
              </span>
            </div>
            <div className="h-0.5 flex-1 bg-slate-100 mx-3">
              <div className={`h-full bg-emerald-500 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                2
              </span>
              <span className={`text-xs font-bold ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                Email OTP
              </span>
            </div>
          </div>

          {/* STEP 1: BUSINESS & ADMIN DETAILS FORM */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register New Admin Account</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Fill in your store details. You will verify your email via OTP in the next step.
                </p>
              </div>

              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        {...register('full_name', { required: 'Full name is required' })}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                      />
                    </div>
                    {errors.full_name && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        {...register('phone', { required: 'Phone is required' })}
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Email Address (OTP will be sent here) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                      })}
                      placeholder="admin@clearsight.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Minimum 6 characters' }
                      })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                    First Branch Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Store Name */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Store Branch Name *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          {...register('store_name', { required: 'Store name is required' })}
                          placeholder="ClearSight Main Branch"
                          className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                        />
                      </div>
                      {errors.store_name && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.store_name.message}</p>
                      )}
                    </div>

                    {/* Store Code */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Store Code *
                      </label>
                      <input
                        type="text"
                        {...register('store_code', { required: 'Store code is required' })}
                        placeholder="MAIN-01"
                        className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                      />
                      {errors.store_code && (
                        <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.store_code.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Store Address */}
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Store Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        {...register('address')}
                        placeholder="123 Main Street, Suite 100"
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Verification Code...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Send OTP & Continue
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Already registered? </span>
                  <Link to="/login" className="text-xs font-bold text-emerald-600 hover:underline">
                    Sign In
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit Details
                </button>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Your Email</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  We've sent a 6-digit code to <span className="font-mono font-bold text-slate-800">{formData?.email}</span>
                </p>
              </div>

              {/* 6-Digit OTP Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Enter Verification Code:</span>
                  <span className={`font-mono ${expirySeconds <= 60 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                    Expires in: {formatTimer(expirySeconds)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputRefs.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono font-black text-xl bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                    />
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 font-medium text-center">
                  Copy-paste supported. Select code from your email.
                </p>

                {/* Actions */}
                <div className="space-y-3 pt-3">
                  <button
                    type="button"
                    onClick={handleVerifyAndRegister}
                    disabled={otp.join('').length !== 6 || isVerifyingOtp || isRegistering}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {(isVerifyingOtp || isRegistering) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying & Creating Account...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Verify Code & Create Admin
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || isSendingOtp}
                      className="font-bold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
                    </button>

                    <span className="text-slate-400 font-semibold">Valid for 10 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 3 && (
            <div className="text-center py-8 space-y-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">Admin Account Created!</h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Your store branch <span className="font-bold text-slate-800">{formData?.store_name}</span> has been set up successfully.
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

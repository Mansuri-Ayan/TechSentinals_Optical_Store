import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SuperAdminLogin() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn } = useAuth();

  const onSubmit = (data) => {
    login({
      ...data,
      role: 'superadmin'
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/60 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4 border border-emerald-200/30">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Administration</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to System Portal</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all ${errors.email ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200'}`}
                  placeholder="super@visionary.in"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Password is required' })}
                  className={`w-full pl-10 pr-10 py-3 bg-slate-50 border text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all ${errors.password ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-200'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 font-semibold">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-500/20 active:bg-emerald-700 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

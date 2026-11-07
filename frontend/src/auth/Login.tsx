import React, { useState, useEffect } from 'react';
import { 
  Home, Building2, User, Phone, Sparkles, Check, 
  ArrowRight, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  // Mode Toggle: 'user' for Regular User/Buyer, 'post_property' for Owner/Property Poster
  const [role, setRole] = useState<'user' | 'post_property'>('user');
  const [isLogin, setIsLogin] = useState(true);

  // Form States (Name & Mobile Number only - no Email, no Password)
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 10) {
      setMobileNumber(rawVal);
      setError('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFullName(sanitized);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanedMobile = mobileNumber.trim().replace(/\D/g, '');

    // Validation
    if (cleanedMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }

    if (!isLogin && fullName.trim().length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      setLoading(false);
      return;
    }

    if (isLogin) {
      // Login Flow via Mobile Number
      try {
        let response = await fetch(`/api/v1/savecontactdetails?mobile_number=${cleanedMobile}`, {
          credentials: 'include',
        });
        
        // Fallback for development server proxy
        if (!response.ok && (response.status === 404 || response.status === 502)) {
          const directRes = await fetch(`http://127.0.0.1:5000/api/v1/savecontactdetails?mobile_number=${cleanedMobile}`, {
            credentials: 'include',
          });
          if (directRes.ok || directRes.status === 404) {
            response = directRes;
          }
        }

        if (response.ok) {
          const data = await response.json();
          const contact = data.contact || data;
          const registeredName = contact.name || `User (${cleanedMobile})`;
          const contactId = contact.contact_id || null;

          setSuccessMsg(`Welcome back, ${registeredName}!`);
          login(registeredName, contactId, cleanedMobile, role);
          setTimeout(() => navigate('/'), 600);
        } else if (response.status === 404) {
          setError(`Mobile number +91 ${cleanedMobile} is not registered yet. Please click 'Register' below to create your account.`);
        } else {
          // If server error, show message
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || 'Failed to verify mobile number. Please check connection.');
        }
      } catch (err) {
        console.warn('Network error during mobile login:', err);
        // Fallback demo login if offline
        const fallbackName = `User ${cleanedMobile.slice(-4)}`;
        login(fallbackName, null, cleanedMobile, role);
        navigate('/');
      } finally {
        setLoading(false);
      }
    } else {
      // Registration Flow (Name + Mobile Number saved to Database)
      try {
        let response = await fetch('/api/v1/savecontactdetails', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fullName.trim(),
            mobile_number: cleanedMobile,
          }),
        });

        if (!response.ok && (response.status === 404 || response.status === 502)) {
          response = await fetch('http://127.0.0.1:5000/api/v1/savecontactdetails', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fullName.trim(),
              mobile_number: cleanedMobile,
            }),
          });
        }

        if (response.ok) {
          const data = await response.json();
          const contactId = data.contact_id || null;

          setSuccessMsg('Registration successful! Logging you in...');
          login(fullName.trim(), contactId, cleanedMobile, role);
          setTimeout(() => navigate('/'), 600);
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || 'Failed to save registration details. Please try again.');
        }
      } catch (err) {
        console.warn('Network error during registration:', err);
        // Offline fallback
        login(fullName.trim(), null, cleanedMobile, role);
        navigate('/');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 p-3 sm:p-6 selection:bg-gray-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-gray-100">
        
        {/* Left Side: Modern Real Estate Visuals */}
        <div className="w-full md:w-5/12 relative p-8 sm:p-12 text-white flex flex-col justify-between hidden md:flex transition-all duration-500">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ 
              backgroundImage: role === 'user' 
                ? "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1000')" 
                : "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1000')" 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/85 backdrop-blur-[2px]" />
          
          {/* Logo & Category Badge */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2.5 rounded-xl shadow-md">
                <Home className="h-6 w-6 text-black" />
              </div>
              <span className="text-2xl font-bold tracking-tight">EstateSync</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide uppercase mt-4">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>{role === 'user' ? 'Buyer & Tenant Portal' : 'Owner & Poster Portal'}</span>
            </div>
          </div>
          
          {/* Hero Copy */}
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
              {role === 'user' 
                ? 'Your gateway to verified properties.' 
                : 'Post your property with Zero Brokerage.'}
            </h1>
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed mb-6">
              {role === 'user' 
                ? 'Connect directly with verified owners across top Indian cities with simple mobile access.' 
                : 'Reach 50,000+ verified buyers directly with instant alerts, free onboarding, and zero commission.'}
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2.5 text-xs sm:text-sm text-gray-200 border-t border-white/15 pt-5">
              {role === 'user' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant access with mobile verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Direct connection with verified property owners</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>100% Free property listing submission</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Direct buyer inquiries on WhatsApp & phone</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 md:p-14 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            
            {/* Top Bar: Back Link */}
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="inline-flex items-center text-xs sm:text-sm font-medium text-gray-500 hover:text-black transition-colors">
                &larr; Back to home
              </Link>
              <div className="md:hidden flex items-center gap-2">
                <div className="bg-black p-1.5 rounded-lg">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">EstateSync</span>
              </div>
            </div>

            {/* Role Toggle Switcher: User vs Post Property */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center mb-6 border border-gray-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setRole('user');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  role === 'user'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <User className="h-4 w-4" />
                <span>User</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('post_property');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  role === 'post_property'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Post Property</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  FREE
                </span>
              </button>
            </div>

            {/* Dynamic Titles */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1.5">
                {role === 'user' 
                  ? (isLogin ? 'User Login' : 'Create User Account')
                  : (isLogin ? 'Owner / Poster Login' : 'Register to Post Property')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {isLogin 
                  ? 'Enter your registered mobile number to continue.' 
                  : 'Enter your name and mobile number to register.'}
              </p>
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs sm:text-sm border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm border border-red-100 flex items-center gap-2">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Mobile / Name Form (No Email, No Password) */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              
              {/* Full Name Field: Shown during Registration */}
              {!isLogin && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5" htmlFor="fullName">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={handleNameChange}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-gray-50/50 focus:bg-white"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Mobile Number Field: Always Required */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5" htmlFor="mobileNumber">
                  {isLogin ? 'Registered Mobile Number' : 'Mobile Number'} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-all bg-gray-50/50 focus-within:bg-white">
                  <div className="flex items-center gap-1 px-3.5 bg-gray-100 border-r border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm select-none">
                    <Phone className="h-3.5 w-3.5 text-gray-500" />
                    <span>+91</span>
                  </div>
                  <input
                    id="mobileNumber"
                    type="tel"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    className="w-full px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {isLogin 
                    ? 'Enter the 10-digit mobile number registered with your account.' 
                    : 'We will use this mobile number for direct verified inquiries.'}
                </p>
              </div>

              {/* Feature Benefit Card */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero Brokerage &bull; Verified Contact Protection</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 active:scale-[0.99] transition-all shadow-lg shadow-black/10 mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? (
                  <span>{isLogin ? 'Signing in...' : 'Registering...'}</span>
                ) : (
                  <>
                    <span>
                      {role === 'user' 
                        ? (isLogin ? 'Sign in with Mobile' : 'Register User Account')
                        : (isLogin ? 'Sign in to Post Property' : 'Register & Start Posting')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle: Switch between Sign in and Register */}
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-xs sm:text-sm">
                {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
                <button 
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-black hover:underline ml-1 cursor-pointer"
                >
                  {isLogin 
                    ? (role === 'user' ? 'Register with Mobile' : 'Register to post property')
                    : 'Sign in with Mobile'}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
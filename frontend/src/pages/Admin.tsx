import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Lock, Eye, EyeOff, Building2, ArrowRight, 
  ArrowLeft, CheckCircle2, AlertCircle, ChevronDown, 
  KeyRound, ShieldCheck, Sparkles, User 
} from 'lucide-react';

interface RoleItem {
  RoleId: number | string;
  RoleType: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Mode: false = Sign In, true = Create Account
  const [isRegister, setIsRegister] = useState(false);

  // Dynamic Master Roles fetched from /api/v1/roltypemaster
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // 3 Primary Form States: Username, Role, Password
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | number>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status and Feedback States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch Roles from Backend API (/api/v1/roltypemaster)
  useEffect(() => {
    let isMounted = true;

    const fetchRoles = async () => {
      setIsLoadingRoles(true);
      try {
        let res = await fetch('/api/v1/roltypemaster');
        if (!res.ok && (res.status === 404 || res.status === 502)) {
          res = await fetch('http://127.0.0.1:5000/api/v1/roltypemaster');
        }

        if (res.ok) {
          const data = await res.json();
          const list: RoleItem[] = data.role_types || [];
          if (isMounted) {
            setRoles(list);
            if (list.length > 0) {
              setSelectedRole(list[0].RoleId);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch roles from /api/v1/roltypemaster:', err);
      } finally {
        if (isMounted) {
          setIsLoadingRoles(false);
        }
      }
    };

    fetchRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    // Validation
    if (!username.trim()) {
      setError('Username is required.');
      setLoading(false);
      return;
    }

    if (!selectedRole) {
      setError('Please select an administrative role.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const currentRoleObj = roles.find((r) => String(r.RoleId) === String(selectedRole));
    const roleLabel = currentRoleObj ? currentRoleObj.RoleType : selectedRole;

    if (isRegister) {
      // 1. Create Admin Account via POST /api/v1/saveadmincontactdetails
      try {
        const payload = {
          username: username.trim(),
          password: password.trim(),
          role: Number(selectedRole),
        };

        let res = await fetch('/api/v1/saveadmincontactdetails', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok && (res.status === 404 || res.status === 502)) {
          res = await fetch('http://127.0.0.1:5000/api/v1/saveadmincontactdetails', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccessMsg(data.message || `Administrator account '${username.trim()}' with role '${roleLabel}' created successfully! You can now sign in.`);
          setIsRegister(false);
          setPassword('');
        } else {
          setError(data.error || 'Failed to create admin account. Please try again.');
        }
      } catch (err) {
        console.error('API Error during admin registration:', err);
        setError('Unable to connect to the backend server. Please verify backend is running.');
      } finally {
        setLoading(false);
      }
    } else {
      // 2. Admin Login via GET /api/v1/saveadmincontactdetails
      try {
        const queryParams = new URLSearchParams({
          username: username.trim(),
          password: password.trim(),
        });

        let res = await fetch(`/api/v1/saveadmincontactdetails?${queryParams.toString()}`, {
          credentials: 'include',
        });

        if (!res.ok && (res.status === 404 || res.status === 502)) {
          res = await fetch(`http://127.0.0.1:5000/api/v1/saveadmincontactdetails?${queryParams.toString()}`, {
            credentials: 'include',
          });
        }

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          const adminInfo = data.admin;

          // Check if selected role matches account role in DB
          if (adminInfo && selectedRole && String(adminInfo.role_id) !== String(selectedRole)) {
            setError(`Role mismatch: This account has role '${adminInfo.role_type}', please select '${adminInfo.role_type}' to sign in.`);
            setLoading(false);
            return;
          }

          const adminName = adminInfo?.username || username.trim();
          const roleTypeName = String(adminInfo?.role_type || roleLabel || '').trim();
          setSuccessMsg(`Authentication successful! Welcome, ${adminName} (${roleTypeName}).`);

          // Update authentication context
          login(adminName, adminInfo?.admin_id || null, null, 'user');

          // Role-based routing: Superadministrator -> /superadministrator, Property Manager -> /propertymanager, Listing Auditor -> /listingdashboard
          const normalizedRole = roleTypeName.toLowerCase().replace(/[\s_-]+/g, '');
          const isSuperAdmin = 
            normalizedRole.includes('superadministrator') || 
            normalizedRole.includes('superadmin') || 
            (normalizedRole.includes('super') && normalizedRole.includes('admin'));
          const isPropertyManager = 
            normalizedRole.includes('propertymanager') || 
            (normalizedRole.includes('property') && normalizedRole.includes('manager'));

          let destination = '/listingdashboard';
          if (isSuperAdmin) {
            destination = '/superadministrator';
          } else if (isPropertyManager) {
            destination = '/propertymanager';
          }

          setTimeout(() => {
            navigate(destination);
          }, 800);
        } else {
          setError(data.error || 'Invalid username or password.');
        }
      } catch (err) {
        console.error('API Error during admin authentication:', err);
        setError('Unable to connect to the backend server. Please verify backend is running.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 flex items-center justify-center p-3 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white font-sans">
      
      {/* Main Split-Screen Container */}
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col md:flex-row min-h-[640px] bg-white shadow-2xl border border-gray-200/80">
        
        {/* Mobile Top Header Banner with Real Estate Photo (Shown only on small screens) */}
        <div className="relative h-44 sm:h-52 w-full md:hidden overflow-hidden text-white flex flex-col justify-between p-6">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=1200')" 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/70" />
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-white/15 backdrop-blur-md p-2 rounded-xl border border-white/20">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">EstateSync</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/30 text-[11px] font-semibold text-blue-200 uppercase tracking-wider backdrop-blur-md">
              <ShieldCheck className="h-3 w-3 text-blue-300" />
              Admin Portal
            </span>
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-white leading-tight">
              Enterprise Real Estate Command
            </h2>
            <p className="text-xs text-gray-300">
              Role-based management & master records
            </p>
          </div>
        </div>

        {/* Left Side: Professional Luxury Real Estate Visuals (Desktop & Tablet) */}
        <div className="w-full md:w-5/12 relative p-8 sm:p-10 lg:p-12 text-white flex-col justify-between hidden md:flex transition-all duration-500 overflow-hidden">
          
          {/* High-Resolution Luxury Real Estate Architecture Photo */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105 hover:scale-100"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=85&w=1200')" 
            }}
          />
          
          {/* Subtle Balanced Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/70" />
          
          {/* Top Brand & Enterprise Badge */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="bg-white/15 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shadow-lg group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-white block leading-tight">
                  EstateSync
                </span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold tracking-wide uppercase mt-6 backdrop-blur-md shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Enterprise Level Management</span>
            </div>
          </div>
          
          {/* Hero Copy & Frosted Feature Card */}
          <div className="relative z-10">
            {/* Frosted Glassmorphism Feature List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 space-y-2.5 shadow-xl">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-100 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Real Estate Access Management</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-100 font-medium">
                <Building2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Live Property & Ownership Master Records</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-100 font-medium">
                <KeyRound className="h-4 w-4 text-amber-300 shrink-0" />
                <span>Direct Access to Database</span>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/15 text-[11px] font-medium text-gray-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-400" /> Zero-Trust Security
              </span>
              <span>&bull;</span>
              <span>Real-Time Sync</span>
              <span>&bull;</span>
              <span>Audit Logged</span>
            </div>
          </div>
        </div>

        {/* Right Side: Professional Credentials Field & Form */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto">
            
            {/* Top Bar: Back Link */}
            <div className="flex items-center justify-between mb-6">
              <Link 
                to="/" 
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Public Site</span>
              </Link>
              
              <div className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span>Admin Login</span>
              </div>
            </div>

            {/* Header Badge, Title & Subtitle */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wide uppercase mb-2.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>{isRegister ? 'Admin Registration' : 'Restricted Console'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-1.5">
                {isRegister ? 'Create Admin Account' : 'Admin Console Login'}
              </h1>
              
              <p className="text-xs sm:text-sm text-gray-500">
                {isRegister 
                  ? 'Register new administrative credentials with assigned database role.' 
                  : 'Enter your credentials and administrative role to continue.'}
              </p>
            </div>

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Form: Exactly 3 Credentials Fields - Username, Role, Password */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Username Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5" htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter admin username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* 2. Administrative Role Dropdown (Dynamically fetched from /api/v1/roltypemaster) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700" htmlFor="role">
                    Administrative Role <span className="text-red-500">*</span>
                  </label>
                  {isLoadingRoles && (
                    <span className="text-[11px] font-semibold text-blue-600 animate-pulse">Loading roles...</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer appearance-none shadow-sm font-medium"
                    required
                  >
                    {roles.length === 0 ? (
                      <option value="" disabled className="text-gray-400">
                        {isLoadingRoles ? 'Fetching roles from database...' : 'No roles available'}
                      </option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.RoleId} value={r.RoleId} className="text-gray-900 py-1">
                          {r.RoleType}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* 3. Password Field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5" htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter security key (min 6 characters)"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50/70 text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/15 mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? (
                  <span>{isRegister ? 'Registering...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{isRegister ? 'Create Admin Account' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Between Login and Create Account */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                {isRegister 
                  ? 'Already registered as an administrator?' 
                  : 'Not registered yet as an administrator?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 underline ml-1 cursor-pointer transition-colors"
                >
                  {isRegister ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            </div>

            {/* Security Notice Footnote */}
            <div className="mt-5 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-gray-400" />
              <span>Authorized personnel only &bull; Access audited & logged</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


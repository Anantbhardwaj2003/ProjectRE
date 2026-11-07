import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  User, Phone, ShieldCheck, CheckCircle2, Building2, 
  ArrowLeft, Sparkles 
} from 'lucide-react';

interface ContactData {
  contact_id?: number;
  name: string;
  mobile_number: string;
}

export default function Profile() {
  const { user, contactId, contactMobile, isLoadingAuth } = useAuth();
  
  const [profileName, setProfileName] = useState<string>(user || '');
  const [profileMobile, setProfileMobile] = useState<string>(contactMobile || '');
  const [loading, setLoading] = useState<boolean>(true);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !contactMobile && !profileName) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    let isMounted = true;

    const fetchContactDetails = async () => {
      setLoading(true);
      try {
        let endpoint = '/api/v1/savecontactdetails';
        if (contactId) {
          endpoint = `/api/v1/savecontactdetails?contact_id=${contactId}`;
        } else if (contactMobile) {
          endpoint = `/api/v1/savecontactdetails?mobile_number=${encodeURIComponent(contactMobile)}`;
        }

        let res = await fetch(endpoint);
        if (!res.ok && (res.status === 404 || res.status === 502)) {
          res = await fetch(`http://127.0.0.1:5000${endpoint}`);
        }

        if (res.ok) {
          const data = await res.json();
          const contact: ContactData = data.contact || data;

          if (isMounted) {
            if (contact && contact.name) {
              setProfileName(contact.name);
            }
            if (contact && contact.mobile_number) {
              setProfileMobile(contact.mobile_number);
            } else if (data.contacts && Array.isArray(data.contacts)) {
              // If returned as contacts list, match by current user or mobile
              const matched = data.contacts.find(
                (c: ContactData) => c.name === user || c.mobile_number === contactMobile
              ) || data.contacts[0];
              if (matched) {
                if (matched.name) setProfileName(matched.name);
                if (matched.mobile_number) setProfileMobile(matched.mobile_number);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch contact details from API:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchContactDetails();

    return () => {
      isMounted = false;
    };
  }, [contactId, contactMobile, user]);

  // Generate initials for avatar
  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'U';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const displayName = profileName || user || 'Verified User';
  const displayMobile = profileMobile || contactMobile || 'Not provided';

  return (
    <div className="min-h-screen bg-gray-50/70 font-sans text-gray-900 selection:bg-gray-200">
      {/* Dark Hero Header Banner */}
      <div className="relative bg-gradient-to-b from-[#0a1120] via-slate-900 to-slate-900 pb-20 sm:pb-24 text-white">
        <Header />
        
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:pt-8 pb-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to explore properties</span>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Verified Contact Profile</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Account Information
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-300">
                Registered contact details for direct owner connections and property postings.
              </p>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 transition-all cursor-pointer"
            >
              <Building2 className="h-4 w-4" />
              <span>Browse Properties</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Profile Card Container */}
      <main className="-mt-12 sm:-mt-14 pb-8 sm:pb-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 border border-gray-100">
            
            {/* Profile Avatar Header Bar */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#0a1120] text-white font-bold text-lg sm:text-xl shadow-md border border-slate-700/60 ring-2 ring-white tracking-wider">
                    {loading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white shadow-sm" title="Verified Member">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                      {loading ? 'Loading...' : displayName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active &bull; Verified
                    </span>
                    <span className="text-[11px] text-gray-400">Direct Inquiries Enabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Data Display (Full Name & Mobile Number Only) */}
            <div className="p-4 sm:p-5">
              <div className="mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Registered Details
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Synced directly from your EstateSync contact record.
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                  <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name Card */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5 sm:p-4 transition-all hover:bg-white hover:border-gray-300 hover:shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Full Name
                      </span>
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 tracking-tight break-words">
                      {displayName}
                    </div>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Primary Contact Name
                    </span>
                  </div>

                  {/* Mobile Number Card */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5 sm:p-4 transition-all hover:bg-white hover:border-gray-300 hover:shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Mobile Number
                      </span>
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-gray-900 tracking-tight font-mono">
                      +91 {displayMobile}
                    </div>
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Verified for WhatsApp & Calls
                    </span>
                  </div>
                </div>
              )}

              {/* Verified Trust & Privacy Note */}
              <div className="mt-3.5 rounded-xl bg-slate-50 border border-slate-200/80 p-3 sm:p-3.5 flex items-start gap-3">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900">
                    Zero Brokerage Verified Profile
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                    Your contact information is authenticated directly from the EstateSync database. Verified property owners and buyers can reach you without commission or middlemen.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

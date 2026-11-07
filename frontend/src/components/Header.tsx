import { useState, useEffect, useRef } from 'react';
import { 
  Building2, Bell, User, LogOut, CheckCircle2, 
  MapPin, RefreshCw, X, ShieldCheck, Home as HomeIcon 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostPropertyModal from './PostPropertyModal';

interface HeaderProps {
  onPostPropertyClick?: () => void;
}

interface AcceptedProperty {
  id?: number;
  IndividualPropertyId?: number;
  property_id?: number;
  PropertyId?: number;
  contact_id?: number;
  Propertyname?: string;
  propertyname?: string;
  property_name?: string;
  Propertytype?: number;
  property_type_name?: string;
  Ownershiptype?: number;
  ownership_type_name?: string;
  Propertyaddress?: string;
  propertyaddress?: string;
  Status?: string;
  status?: string;
  contact_name?: string;
  contact_mobile?: string;
}

export default function Header({ onPostPropertyClick }: HeaderProps = {}) {
  const { user, role, contactId, contactMobile, logout } = useAuth();
  const navigate = useNavigate();
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  // Notification Bell States
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [acceptedListings, setAcceptedListings] = useState<AcceptedProperty[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePostClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (onPostPropertyClick) {
      onPostPropertyClick();
    } else {
      setInternalModalOpen(true);
    }
  };

  // Fetch applications accepted by Listing Auditor using CompletedApplicationListingAuditor
  const fetchAcceptedListings = async () => {
    if (!user) {
      setAcceptedListings([]);
      return;
    }

    setIsLoadingListings(true);
    try {
      const params = new URLSearchParams({ status: 'accepted' });
      if (contactId) params.append('contact_id', String(contactId));
      if (contactMobile) params.append('mobile_number', contactMobile);
      if (user) params.append('name', user);

      const endpoint = `/api/v1/completedapplicationlistingauditor?${params.toString()}`;
      const options = {
        credentials: 'include' as RequestCredentials,
        headers: { 'Accept': 'application/json' },
      };

      let res = await fetch(endpoint, options);
      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch(`http://127.0.0.1:5000${endpoint}`, options);
      }

      if (res.ok) {
        const data = await res.json();
        const rawItems = data.accepted_listings || data.completed_listings || data.listings || [];

        // Strictly show only applications that are accepted by Listing Auditor
        // Map all case variants from Postgres row dictionaries
        const onlyAccepted: AcceptedProperty[] = rawItems
          .filter((item: any) => {
            const s = (item.Status || item.status || '').toString().toLowerCase().trim();
            return s === 'accepted_by_listingauditor' || s === 'accepted_by_listingaudiotr' || s === 'accepted' || s === 'completed';
          })
          .map((item: any) => ({
            id: item.id || item.IndividualPropertyId || item.individualpropertyid || item.PropertyId,
            contact_id: item.contact_id,
            Propertyname: item.Propertyname || item.propertyname || item.property_name || 'Property Listing',
            property_type_name: item.property_type_name || item.PropertyType || item.property_type || 'Residential',
            ownership_type_name: item.ownership_type_name || item.OwnerTypeName || item.ownershiptype || '',
            Propertyaddress: item.Propertyaddress || item.propertyaddress || '',
            Status: item.Status || item.status || 'Accepted_By_ListingAuditor',
            contact_name: item.contact_name || item.name || '',
            contact_mobile: item.contact_mobile || item.mobile_number || '',
          }));

        setAcceptedListings(onlyAccepted);
      }
    } catch (err) {
      console.warn('Failed to fetch accepted listings for owner bell notification:', err);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // Fetch whenever logged-in user details change
  useEffect(() => {
    if (user) {
      fetchAcceptedListings();
    } else {
      setAcceptedListings([]);
    }
  }, [user, contactId, contactMobile]);

  // Click outside to close bell popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsBellOpen(false);
      }
    };

    if (isBellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBellOpen]);

  return (
    <header className="relative z-50 w-full border-b border-white/10 bg-transparent">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-white" />
          <span className="text-xl font-bold tracking-tight text-white">EstateSync</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Buyers</Link>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Tenants</a>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Owners</a>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Projects</a>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Notification Bell Dropdown (Powered by CompletedApplicationListingAuditor) */}
          <div className="relative" ref={bellRef}>
            <button 
              type="button"
              onClick={() => {
                const nextState = !isBellOpen;
                setIsBellOpen(nextState);
                if (nextState && user) {
                  fetchAcceptedListings();
                }
              }}
              title={user ? "View listings accepted by Listing Auditor" : "Notifications"}
              className="relative flex items-center gap-2 rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-5 w-5" />
              {user && acceptedListings.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-gray-950 animate-pulse">
                  {acceptedListings.length}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown (Opaque solid bg-gray-900, high z-index to prevent overlapping) */}
            {isBellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl p-4 z-[9999] text-left ring-1 ring-white/10">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Accepted Listings</h3>
                      <p className="text-[11px] text-gray-400">Approved by Listing Auditor</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {user && (
                      <button
                        type="button"
                        onClick={() => fetchAcceptedListings()}
                        disabled={isLoadingListings}
                        className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoadingListings ? 'animate-spin text-emerald-400' : ''}`} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBellOpen(false)}
                      className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-800 transition-colors"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Popover Content */}
                {!user ? (
                  <div className="py-6 text-center flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-2">
                      <User className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Owner Sign In Required</p>
                    <p className="text-xs text-gray-400 mb-4 max-w-[240px]">
                      Please log in to view the applications accepted by the Listing Auditor.
                    </p>
                    <Link
                      to="/login"
                      onClick={() => setIsBellOpen(false)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                    >
                      Sign In to EstateSync
                    </Link>
                  </div>
                ) : isLoadingListings ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                    <span className="text-xs">Fetching accepted applications...</span>
                  </div>
                ) : acceptedListings.length === 0 ? (
                  <div className="py-6 text-center flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-800/70 flex items-center justify-center text-gray-400 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-200">No Accepted Listings Yet</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
                      Once your submitted property is reviewed and accepted by the Listing Auditor, it will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-y-auto space-y-2.5 mt-3 pr-1 scrollbar-thin scrollbar-thumb-gray-700">
                      {acceptedListings.map((item, idx) => (
                        <div 
                          key={item.id || item.IndividualPropertyId || idx} 
                          className="p-3 rounded-xl bg-gray-800/70 border border-gray-700/60 hover:border-emerald-500/40 hover:bg-gray-800/90 transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                                <HomeIcon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate">
                                  {item.Propertyname || item.propertyname || item.property_name || 'Property Listing'}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {item.property_type_name && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-200">
                                      {item.property_type_name}
                                    </span>
                                  )}
                                  {item.ownership_type_name && (
                                    <span className="text-[10px] text-gray-400">
                                      • {item.ownership_type_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              ACCEPTED
                            </span>
                          </div>

                          {item.Propertyaddress && (
                            <div className="flex items-start gap-1.5 text-xs text-gray-300 pl-0.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-relaxed text-gray-300" title={item.Propertyaddress}>
                                {item.Propertyaddress}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-gray-700/40 text-[11px]">
                            <span className="text-emerald-400 font-medium flex items-center gap-1 text-[10px]">
                              <ShieldCheck className="h-3 w-3" />
                              ACCEPTED_BY_LISTINGAUDITOR
                            </span>
                            {item.contact_mobile && (
                              <span className="text-gray-400 text-[10px] font-mono">
                                {item.contact_mobile}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{acceptedListings.length} {acceptedListings.length === 1 ? 'listing' : 'listings'} verified</span>
                      <span className="text-emerald-400 font-medium">Ready on EstateSync</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {user ? (
            <>
              <span className="text-xs sm:text-sm font-medium text-gray-200">
                Welcome, {user}
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>
              <Link to="/login" className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <User className="h-5 w-5" />
                <span>Login</span>
              </Link>
            </>
          )}
          
          {/* Hide Post Property button if logged in as 'user'; show if 'post_property' or unauthenticated */}
          {role !== 'user' && (
            <button 
              type="button"
              onClick={handlePostClick}
              className="rounded-md bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              Post Property
            </button>
          )}
        </div>
      </div>

      {/* Post Property Modal Form (Internal Fallback) */}
      {!onPostPropertyClick && (
        <PostPropertyModal 
          isOpen={internalModalOpen} 
          onClose={() => setInternalModalOpen(false)} 
        />
      )}
    </header>
  );
}

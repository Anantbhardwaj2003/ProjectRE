import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { 
  Clock, CheckCircle2, XCircle, ShieldCheck, Building2, 
  AlertCircle, Filter, RefreshCw, Phone, User, 
  MapPin, FileText, Search, X, Layers,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

export interface PropertyListing {
  id?: number;
  IndividualPropertyId?: number;
  property_id?: number;
  PropertyId?: number;
  contact_id?: number;
  Propertyname?: string;
  propertyname?: string;
  property_name?: string;
  Propertytype?: number;
  propertytype?: number;
  property_type_name?: string;
  Ownershiptype?: number;
  ownershiptype?: number;
  ownership_type_name?: string;
  Propertyaddress?: string;
  propertyaddress?: string;
  Ownershipproof?: string;
  ownershipproof?: string;
  Status?: string;
  status?: string;
  contact_name?: string;
  contact_mobile?: string;
  [key: string]: any;
}

type TabType = 'pending' | 'accepted' | 'rejected' | 'all';

export default function ListingDashboard() {
  const { user, isLoadingAuth } = useAuth();

  // Active view tab: 'pending' | 'accepted' | 'rejected' | 'all'
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Listings data stores
  const [pendingListings, setPendingListings] = useState<PropertyListing[]>([]);
  const [acceptedListings, setAcceptedListings] = useState<PropertyListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<PropertyListing[]>([]);
  const [allListings, setAllListings] = useState<PropertyListing[]>([]);

  // Summary counts
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 whenever active tab or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Row action and async state
  const [rowActions, setRowActions] = useState<Record<string | number, string>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Status helper checks
  const isAccepted = (statusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    return s === 'accepted_by_listingauditor' || s === 'accepted' || s === 'completed' || s === 'uploadimagesbyuser';
  };

  const isRejected = (statusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    return s === 'rejected_by_listingauditor' || s === 'rejected';
  };

  const isPending = (statusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    return s === 'submitted' || s === 'pending' || (!isAccepted(s) && !isRejected(s));
  };

  // Helper to safely fetch from either relative proxy or direct port 5000
  const fetchWithFallback = async (endpoint: string) => {
    const options = {
      headers: {
        'Accept': 'application/json',
      },
    };
    try {
      let res = await fetch(endpoint, options);
      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch(`http://127.0.0.1:5000${endpoint}`, options);
      }
      if (res.ok) {
        return await res.json().catch(() => null);
      }
    } catch {
      try {
        let res = await fetch(`http://127.0.0.1:5000${endpoint}`, options);
        if (res.ok) {
          return await res.json().catch(() => null);
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Fetch Pending applications from PendingApplicationListingAuditor
      const pendingData = await fetchWithFallback('/api/v1/pendingapplicationlistingauditor');

      // 2. Fetch Completed applications from CompletedApplicationListingAuditor
      let completedData = await fetchWithFallback('/api/v1/completedapplicationlistingauditor');

      // Fallback if completedapplicationlistingauditor has not yet been reloaded
      if (!completedData) {
        completedData = await fetchWithFallback('/api/v1/listingauditorstatusapproved?status=all') ||
                        await fetchWithFallback('/api/v1/listingauditorstatusapproved');
      }

      // Process pending listings (Submitted)
      const pendings: PropertyListing[] = (
        pendingData?.pending_listings || 
        pendingData?.listings || 
        []
      ).filter((item: PropertyListing) => isPending(item.Status || item.status));

      // Process completed listings (Accepted_By_ListingAuditor or Rejected_By_ListingAuditor)
      const allCompleted: PropertyListing[] = (
        completedData?.completed_listings || 
        completedData?.listings || 
        []
      );

      const accepteds: PropertyListing[] = (
        completedData?.accepted_listings || 
        allCompleted.filter((item: PropertyListing) => isAccepted(item.Status || item.status))
      );

      const rejecteds: PropertyListing[] = (
        completedData?.rejected_listings || 
        allCompleted.filter((item: PropertyListing) => isRejected(item.Status || item.status))
      );

      // Build unified master list for "All Applications" tab
      const masterList: PropertyListing[] = [];
      const seenKeys = new Set<string>();

      const addListings = (items?: PropertyListing[]) => {
        if (!Array.isArray(items)) return;
        for (const item of items) {
          if (!item) continue;
          // Build unique key including address so multiple properties by the same owner are not deduplicated
          const k = String(
            item.id ||
            item.IndividualPropertyId ||
            item.property_id ||
            item.PropertyId ||
            `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${item.Propertyaddress || item.propertyaddress || ''}`
          );
          if (!seenKeys.has(k)) {
            seenKeys.add(k);
            masterList.push(item);
          }
        }
      };

      addListings(pendings);
      addListings(accepteds);
      addListings(rejecteds);

      setPendingListings(pendings);
      setAcceptedListings(accepteds);
      setRejectedListings(rejecteds);
      setAllListings(masterList);

      // Counts for metric cards and tab badges
      setPendingCount(
        typeof pendingData?.total_pending === 'number'
          ? pendingData.total_pending
          : typeof pendingData?.pending_count === 'number'
          ? pendingData.pending_count
          : pendings.length
      );

      setCompletedCount(
        typeof completedData?.accepted_count === 'number'
          ? completedData.accepted_count
          : accepteds.length
      );

      setRejectedCount(
        typeof completedData?.rejected_count === 'number'
          ? completedData.rejected_count
          : rejecteds.length
      );

      setTotalCount(masterList.length);

    } catch (err) {
      console.warn('API error fetching dashboard listings:', err);
      setApiError('Unable to connect to backend server. Please verify backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isLoadingAuth) {
      fetchDashboardData();
    }
  }, [user, isLoadingAuth]);

  // Handle action dropdown change (calls POST /api/v1/listingauditorstatusapproved)
  const handleActionChange = async (item: PropertyListing, index: number, selectedAction: string) => {
    if (!selectedAction) return;

    const rowKey = item.id || item.IndividualPropertyId || item.property_id || `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${item.Propertyaddress || item.propertyaddress || ''}_${index}`;
    setRowActions((prev) => ({ ...prev, [rowKey]: selectedAction }));
    setUpdatingRowId(rowKey);
    setActionFeedback(null);

    const propName = item.Propertyname || item.propertyname || item.property_name || 'Property';

    const payload = {
      id: item.id || item.IndividualPropertyId || item.property_id || item.PropertyId,
      contact_id: item.contact_id,
      Propertyname: item.Propertyname || item.propertyname || item.property_name,
      action: selectedAction,
    };

    try {
      let res = await fetch('/api/v1/listingauditorstatusapproved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch('http://127.0.0.1:5000/api/v1/listingauditorstatusapproved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const newStatus = data.status || (selectedAction === 'Completed' ? 'Accepted_By_ListingAuditor' : 'Rejected_By_ListingAuditor');
        setActionFeedback({
          message: `Listing "${propName}" status successfully updated to: ${newStatus}`,
          type: 'success',
        });

        // Refresh dashboard data to immediately update all queues and counts
        setTimeout(() => {
          fetchDashboardData();
        }, 400);
      } else {
        setActionFeedback({
          message: data.error || `Failed to update status for "${propName}".`,
          type: 'error',
        });
        setRowActions((prev) => {
          const next = { ...prev };
          delete next[rowKey];
          return next;
        });
      }
    } catch (err) {
      console.error('Error connecting to /api/v1/listingauditorstatusapproved:', err);
      setActionFeedback({
        message: 'Please Refresh the Page.',
        type: 'error',
      });
      setRowActions((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
    } finally {
      setUpdatingRowId(null);
    }
  };

  // Determine active dataset based on current tab
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingListings;
      case 'accepted':
        return acceptedListings;
      case 'rejected':
        return rejectedListings;
      case 'all':
      default:
        return allListings;
    }
  }, [activeTab, pendingListings, acceptedListings, rejectedListings, allListings]);

  // Filter listings by search query
  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeDataset;

    return activeDataset.filter((item) => {
      const propName = (item.Propertyname || item.propertyname || item.property_name || '').toLowerCase();
      const contactName = (item.contact_name || '').toLowerCase();
      const contactMobile = (item.contact_mobile || '').toLowerCase();
      const address = (item.Propertyaddress || item.propertyaddress || '').toLowerCase();
      const typeName = (item.property_type_name || '').toLowerCase();
      const statusStr = (item.Status || item.status || '').toLowerCase();
      return (
        propName.includes(q) ||
        contactName.includes(q) ||
        contactMobile.includes(q) ||
        address.includes(q) ||
        typeName.includes(q) ||
        statusStr.includes(q)
      );
    });
  }, [activeDataset, searchQuery]);

  // Pagination calculations (10 items per page)
  const totalItems = filteredListings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedListings = useMemo(() => {
    return filteredListings.slice(startIndex, endIndex);
  }, [filteredListings, startIndex, endIndex]);

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50/70 font-sans text-gray-900 selection:bg-gray-200">
      
      {/* Executive Dark Header Banner */}
      <div className="relative bg-gradient-to-b from-[#0a1120] via-slate-900 to-slate-900 pb-10 sm:pb-12 text-white shadow-md">
        <Header />
        
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide uppercase mb-2 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                <span>Admin Console &bull; EstateSync</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Listing Auditor Dashboard
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-300">
                Welcome back, <span className="font-semibold text-white">{user}</span>. Overview of real estate listing verification pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Placed cleanly below banner without negative overlap */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Exactly the TWO Primary Metric Cards Requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8">
          
          {/* Card 1: Number of Pending Lists */}
          <div 
            onClick={() => setActiveTab('pending')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'pending' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-amber-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 mb-2">
                  <Clock className="h-3 w-3 text-amber-600" />
                  Pending Audit
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Number of Pending Lists
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Properties submitted awaiting administrative verification
                </p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-200/60 text-amber-600 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? (
                  <span className="inline-block animate-pulse text-gray-400">...</span>
                ) : (
                  pendingCount
                )}
              </span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                {pendingCount > 0 ? 'Action required' : 'Queue clear'}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Requires document & pricing verification
              </span>
              <span className="font-semibold text-amber-800">
                High Priority
              </span>
            </div>
          </div>

          {/* Card 2: Number of Completed Lists */}
          <div 
            onClick={() => setActiveTab('accepted')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'accepted' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-emerald-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Live & Verified
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Number of Completed Lists
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Approved listings published on public search
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-200/60 text-emerald-600 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? (
                  <span className="inline-block animate-pulse text-gray-400">...</span>
                ) : (
                  completedCount
                )}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Active on portal
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Publicly searchable by buyers & tenants
              </span>
              <span className="font-semibold text-emerald-800">
                100% Verified
              </span>
            </div>
          </div>

        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-xl border border-gray-100 ring-1 ring-gray-900/5">
          
          {/* Header section with clean spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                Listings Overview
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Summary of property submissions across pending review and verified live listings.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg border border-gray-200/60">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  Showing: {activeTab === 'pending' ? 'Pending Audit' : activeTab === 'accepted' ? 'Accepted / Completed' : activeTab === 'rejected' ? 'Rejected' : 'All Applications'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between border shadow-sm transition-all ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span className="font-medium">{actionFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-gray-400 hover:text-gray-600 ml-2 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {apiError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{apiError}</span>
              </div>
              <button
                type="button"
                onClick={fetchDashboardData}
                className="underline font-bold text-red-800 hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tab Filter Bar & Search Box */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Tab 1: Pending */}
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Pending Review</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCount}
                </span>
              </button>

              {/* Tab 2: Accepted */}
              <button
                type="button"
                onClick={() => setActiveTab('accepted')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'accepted'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Accepted Listings</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'accepted' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {completedCount}
                </span>
              </button>

              {/* Tab 3: Rejected */}
              <button
                type="button"
                onClick={() => setActiveTab('rejected')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'rejected'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Rejected Listings</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'rejected' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  {rejectedCount}
                </span>
              </button>

              {/* Tab 4: All Applications */}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All Applications</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'all' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {totalCount || (pendingCount + completedCount + rejectedCount)}
                </span>
              </button>

            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties, contacts..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all"
              />
            </div>

          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-14 text-center text-gray-400">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto text-blue-600 mb-2.5" />
              <p className="text-xs font-medium text-gray-500">Retrieving listings from database...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !apiError && filteredListings.length === 0 && (
            <div className="py-14 px-4 rounded-xl border border-dashed border-gray-200 text-center bg-gray-50/50">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                {activeTab === 'pending' ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : activeTab === 'accepted' ? (
                  <Building2 className="h-6 w-6 text-emerald-600" />
                ) : activeTab === 'rejected' ? (
                  <XCircle className="h-6 w-6 text-rose-600" />
                ) : (
                  <Layers className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <h4 className="text-sm font-bold text-gray-900">
                {searchQuery ? 'No matching listings found' : (
                  activeTab === 'pending' ? 'No Pending Applications' :
                  activeTab === 'accepted' ? 'No Accepted Listings Yet' :
                  activeTab === 'rejected' ? 'No Rejected Listings' :
                  'No Applications in Database'
                )}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No applications matched "${searchQuery}". Clear your search query to view all.`
                  : activeTab === 'pending'
                  ? 'All individual property submissions have been audited. New submissions with status "Submitted" will appear here automatically.'
                  : activeTab === 'accepted'
                  ? 'When the Admin marks applications as Completed, they will be listed here with status "Accepted_By_ListingAuditor".'
                  : activeTab === 'rejected'
                  ? 'Applications rejected by the admin will be recorded and shown here.'
                  : 'No property records are currently available.'}
              </p>
            </div>
          )}

          {/* Property Applications Table */}
          {!isLoading && filteredListings.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th scope="col" className="px-4 py-3">Property</th>
                      <th scope="col" className="px-4 py-3">Property Type</th>
                      <th scope="col" className="px-4 py-3">Owner / Contact</th>
                      <th scope="col" className="px-4 py-3">Ownership</th>
                      <th scope="col" className="px-4 py-3">Address</th>
                      <th scope="col" className="px-4 py-3">Documents</th>
                      <th scope="col" className="px-4 py-3 text-center">Status</th>
                      <th scope="col" className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {paginatedListings.map((item, index) => {
                    const rowKey = item.id || item.IndividualPropertyId || item.property_id || `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${item.Propertyaddress || item.propertyaddress || ''}_${index}`;
                    const propName = item.Propertyname || item.propertyname || item.property_name || 'Untitled Property';
                    const propType = item.property_type_name || (item.Propertytype || item.propertytype ? `Type #${item.Propertytype || item.propertytype}` : 'General');
                    const ownerName = item.contact_name || `Contact #${item.contact_id || 'N/A'}`;
                    const ownerMobile = item.contact_mobile || 'Not available';
                    const ownershipType = item.ownership_type_name || (item.Ownershiptype || item.ownershiptype ? `Type #${item.Ownershiptype || item.ownershiptype}` : 'Standard');
                    const address = item.Propertyaddress || item.propertyaddress || 'Address not specified';
                    const proof = item.Ownershipproof || item.ownershipproof || null;
                    const rawStatus = item.Status || item.status || 'Submitted';
                    const isRowAccepted = isAccepted(rawStatus);
                    const isRowRejected = isRejected(rawStatus);
                    const isRowPending = isPending(rawStatus);
                    const isUpdating = updatingRowId === rowKey;

                    return (
                      <tr key={rowKey} className="hover:bg-gray-50/70 transition-colors">
                        
                        {/* Property Column */}
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              isRowAccepted ? 'bg-emerald-50 text-emerald-600' :
                              isRowRejected ? 'bg-rose-50 text-rose-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold">{propName}</span>
                          </div>
                        </td>

                        {/* Property Type Column */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                            {propType}
                          </span>
                        </td>

                        {/* Contact / Owner Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            <User className="h-3 w-3 text-gray-400" />
                            <span>{ownerName}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{ownerMobile}</span>
                          </div>
                        </td>

                        {/* Ownership Column */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-gray-700">
                            {ownershipType}
                          </span>
                        </td>

                        {/* Address Column */}
                        <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={address}>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{address}</span>
                          </div>
                        </td>

                        {/* Documents Column */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {proof ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              <FileText className="h-3 w-3" />
                              <span className="max-w-[120px] truncate">{proof}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px]">No proof file</span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {rawStatus?.toLowerCase() === 'uploadimagesbyuser' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-blue-600" />
                              <span>UploadImagesByUser</span>
                            </span>
                          ) : isRowAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Accepted_By_ListingAuditor</span>
                            </span>
                          ) : isRowRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>Rejected_By_ListingAuditor</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="h-2.5 w-2.5 text-amber-600" />
                              <span>{rawStatus}</span>
                            </span>
                          )}
                        </td>

                        {/* Action Column connected to /api/v1/listingauditorstatusapproved */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            
                            {/* If pending: show Primary Action selector */}
                            {isRowPending ? (
                              <select
                                value={rowActions[rowKey] || ''}
                                disabled={isUpdating}
                                onChange={(e) => handleActionChange(item, index, e.target.value)}
                                className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  rowActions[rowKey] === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : rowActions[rowKey] === 'Rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <option value="" disabled>Select Action</option>
                                <option value="Completed" className="text-emerald-700 font-semibold">Completed</option>
                                <option value="Rejected" className="text-rose-700 font-semibold">Rejected</option>
                              </select>
                            ) : isRowAccepted ? (
                              /* If Accepted: Show Completed badge only */
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              /* If Rejected: Show Rejected badge only */
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                            )}

                            {isUpdating && (
                              <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Toolbar (Page size: 10) */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-gray-100 text-xs">
                {/* Entry range text */}
                <div className="text-gray-500 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to{' '}
                  <span className="font-bold text-gray-900">{endIndex}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalItems}</span> applications
                  <span className="ml-1 text-gray-400">({itemsPerPage} per page)</span>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {/* First Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={validCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={validCurrentPage === 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {getPageNumbers(validCurrentPage, totalPages).map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(p);
                      const isActive = pageNum === validCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={validCurrentPage === totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={validCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        </div>

      </main>
    </div>
  );
}

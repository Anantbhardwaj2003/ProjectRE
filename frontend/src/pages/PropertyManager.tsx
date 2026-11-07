import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { 
  Clock, CheckCircle2, XCircle, Building2, 
  AlertCircle, Filter, RefreshCw, Phone, User, 
  MapPin, FileText, Search, X, Briefcase, 
  Layers, Check, Camera, TrainFront, Shield, HeartPulse, ShoppingBag, ExternalLink,
  Eye
} from 'lucide-react';

export interface PropertyListing {
  id?: number;
  ImageId?: number;
  indprop_id?: number;
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
  ownership_proof?: string;
  Status?: string;
  status?: string;
  contact_name?: string;
  contact_mobile?: string;
  // 5 angle images from public.PropertyUploadImage
  FrontExteriorAngle?: string;
  LivingRoomMainHall?: string;
  MasterBedroomAngle?: string;
  KitchenDiningSpace?: string;
  BalconyWashroomAngle?: string;
  // 4 landmarks
  NearestMetroStation?: string;
  NearestPoliceStation?: string;
  NearestHospital?: string;
  NearestShoppingMarket?: string;
  [key: string]: any;
}

type TabType = 'pending' | 'accepted' | 'rejected' | 'all';

export default function PropertyManager() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

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

  // Row action and async state
  const [rowActions, setRowActions] = useState<Record<string | number, string>>({});
  const [updatingRowId, setUpdatingRowId] = useState<string | number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Comprehensive Property & Media Details Modal
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  
  // Lightbox for full-resolution photo preview
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);

  // Status helper checks
  const isAccepted = (statusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    return (
      s === 'accepted_by_propertymanager' ||
      s === 'accepted_by_listingauditor' ||
      s === 'accepted' ||
      s === 'completed'
    );
  };

  const isRejected = (statusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    return (
      s === 'rejected_by_propertymanager' ||
      s === 'rejected_by_listingauditor' ||
      s === 'rejected'
    );
  };

  // Helper to test if deed is a file document
  const isProofFile = (proof?: string | null) => {
    if (!proof) return false;
    const p = proof.trim().toLowerCase();
    return (
      p.startsWith('http://') ||
      p.startsWith('https://') ||
      p.startsWith('/static/') ||
      p.startsWith('static/') ||
      p.startsWith('/uploads/') ||
      p.startsWith('uploads/') ||
      /\.(pdf|jpg|jpeg|png|webp|doc|docx|txt)$/i.test(p)
    );
  };

  // Helper to format image URL pointing to backend static endpoint
  const getFullImageUrl = (path?: string, contactId?: number, indpropId?: number) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (cleanPath.startsWith('/static/') || cleanPath.startsWith('/uploads/')) {
      return `http://127.0.0.1:5000${cleanPath}`;
    }
    if (contactId && indpropId) {
      return `http://127.0.0.1:5000/static/uploads/${contactId}/${indpropId}/${cleanPath.replace(/^\//, '')}`;
    }
    return `http://127.0.0.1:5000/static/uploads/${cleanPath.replace(/^\//, '')}`;
  };

  // Helper to format deed document URL
  const getDeedUrl = (proof?: string | null, contactId?: number, indpropId?: number) => {
    if (!proof) return '';
    if (proof.startsWith('http://') || proof.startsWith('https://')) return proof;
    const clean = proof.startsWith('/') ? proof : `/${proof}`;
    if (clean.startsWith('/static/') || clean.startsWith('/uploads/')) {
      return `http://127.0.0.1:5000${clean}`;
    }
    if (contactId && indpropId) {
      return `http://127.0.0.1:5000/static/uploads/${contactId}/${indpropId}/${clean.replace(/^\//, '')}`;
    }
    return `http://127.0.0.1:5000/static/uploads/${clean.replace(/^\//, '')}`;
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

  // Normalize property items from any endpoint into consistent PropertyListing model
  const normalizePropertyItem = (item: any, idx: number): PropertyListing => {
    const front = item.FrontExteriorAngle || item.frontexteriorangle || item.front_exterior_angle || '';
    const living = item.LivingRoomMainHall || item.livingroommainhall || item.living_room_main_hall || '';
    const bed = item.MasterBedroomAngle || item.masterbedroomangle || item.master_bedroom_angle || '';
    const kitchen = item.KitchenDiningSpace || item.kitchendiningspace || item.kitchen_dining_space || '';
    const balcony = item.BalconyWashroomAngle || item.balconywashroomangle || item.balcony_washroom_angle || '';

    const metro = item.NearestMetroStation || item.nearestmetrostation || item.nearest_metro_station || '';
    const police = item.NearestPoliceStation || item.nearestpolicestation || item.nearest_police_station || '';
    const hospital = item.NearestHospital || item.nearesthospital || item.nearest_hospital || '';
    const market = item.NearestShoppingMarket || item.nearestshoppingmarket || item.nearest_shopping_market || '';

    const propId = item.indprop_id ?? item.ind_prop_id ?? item.IndividualPropertyId ?? item.individualpropertyid ?? item.property_id ?? item.id;
    const cId = item.contact_id ?? item.contactid;

    return {
      id: propId || item.ImageId || item.imageid || idx + 1,
      ImageId: item.ImageId || item.imageid,
      indprop_id: propId,
      IndividualPropertyId: propId,
      property_id: propId,
      contact_id: cId,
      Propertyname: item.Propertyname || item.propertyname || item.property_name || `Property #${propId || idx + 1}`,
      property_type_name: item.property_type_name || item.PropertyType || item.propertytype || (item.Propertytype ? `Type #${item.Propertytype}` : 'Residential'),
      ownership_type_name: item.ownership_type_name || item.OwnerTypeName || item.ownershiptype || (item.Ownershiptype ? `Type #${item.Ownershiptype}` : 'Standard'),
      Propertyaddress: item.Propertyaddress || item.propertyaddress || item.property_address || item.address || 'Address on record',
      Status: item.Status || item.status || 'UploadImagesByUser',
      contact_name: item.contact_name || item.contactname || item.name || `Owner (ID: ${cId})`,
      contact_mobile: item.contact_mobile || item.contactmobile || item.mobile_number || item.mobile || 'N/A',
      Ownershipproof: item.Ownershipproof || item.ownershipproof || item.ownership_proof || item.OwnershipProof || null,
      FrontExteriorAngle: front,
      LivingRoomMainHall: living,
      MasterBedroomAngle: bed,
      KitchenDiningSpace: kitchen,
      BalconyWashroomAngle: balcony,
      NearestMetroStation: metro,
      NearestPoliceStation: police,
      NearestHospital: hospital,
      NearestShoppingMarket: market,
    };
  };

  // Fetch listings for Property Manager
  // Pending lists use /api/v1/propertyimageupload (PropertyImageUpload API)
  // Completed lists use /api/v1/propertymanagercompleted (PropertyManagerCompleted API)
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Fetch Pending applications from PropertyImageUpload API (/api/v1/propertyimageupload)
      const uploadImageData = await fetchWithFallback('/api/v1/propertyimageupload');

      // 2. Fetch Completed applications from PropertyManagerCompleted API (/api/v1/propertymanagercompleted)
      const completedData = await fetchWithFallback('/api/v1/propertymanagercompleted');

      // Process pending listings directly from PropertyImageUpload API (status: UploadImagesByUser)
      const rawUploadItems: any[] = (
        uploadImageData?.pending_listings || 
        uploadImageData?.property_images || 
        uploadImageData?.listings || 
        []
      );
      const pendings: PropertyListing[] = rawUploadItems.map((item: any, idx: number) => normalizePropertyItem(item, idx));

      // Process accepted listings (status: Accepted_By_PropertyManager)
      const rawAcceptedItems: any[] = (
        completedData?.accepted_listings || 
        completedData?.completed_listings || 
        []
      );
      const accepteds: PropertyListing[] = rawAcceptedItems.map((item: any, idx: number) => normalizePropertyItem(item, idx));

      // Process rejected listings (status: Rejected_By_PropertyManager)
      const rawRejectedItems: any[] = (
        completedData?.rejected_listings || 
        []
      );
      const rejecteds: PropertyListing[] = rawRejectedItems.map((item: any, idx: number) => normalizePropertyItem(item, idx));

      // Combine master list with deduplication
      const allMap = new Map<string, PropertyListing>();

      const makeKey = (item: PropertyListing, idx: number) =>
        String(
          item.indprop_id ||
          item.id || 
          item.IndividualPropertyId || 
          item.property_id || 
          `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${idx}`
        );

      pendings.forEach((item, idx) => allMap.set(makeKey(item, idx), item));
      accepteds.forEach((item, idx) => allMap.set(makeKey(item, idx), item));
      rejecteds.forEach((item, idx) => allMap.set(makeKey(item, idx), item));

      const masterList = Array.from(allMap.values());

      setPendingListings(pendings);
      setAcceptedListings(accepteds);
      setRejectedListings(rejecteds);
      setAllListings(masterList);

      // Counts for metric cards and tab badges
      setPendingCount(
        typeof uploadImageData?.total_pending === 'number'
          ? uploadImageData.total_pending
          : typeof uploadImageData?.count === 'number'
          ? uploadImageData.count
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
      console.warn('API error fetching Property Manager listings:', err);
      setApiError('Unable to connect to backend server. Please verify backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle action dropdown change (posts to /api/v1/propertymanagercompleted)
  const handleActionChange = async (item: PropertyListing, index: number, selectedAction: string) => {
    if (!selectedAction) return;

    const rowKey = item.indprop_id || item.id || item.IndividualPropertyId || item.property_id || `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${item.Propertyaddress || item.propertyaddress || ''}_${index}`;
    setRowActions((prev) => ({ ...prev, [rowKey]: selectedAction }));
    setUpdatingRowId(rowKey);
    setActionFeedback(null);

    const propName = item.Propertyname || item.propertyname || item.property_name || 'Property';
    const targetStatus = selectedAction === 'Completed' ? 'Accepted_By_PropertyManager' : 'Rejected_By_PropertyManager';

    const payload = {
      id: item.indprop_id || item.id || item.IndividualPropertyId || item.property_id || item.PropertyId,
      indprop_id: item.indprop_id || item.id || item.IndividualPropertyId,
      contact_id: item.contact_id,
      Propertyname: item.Propertyname || item.propertyname || item.property_name,
      action: selectedAction,
      status: targetStatus,
    };

    try {
      let res = await fetch('/api/v1/propertymanagercompleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch('http://127.0.0.1:5000/api/v1/propertymanagercompleted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const newStatus = data.status || targetStatus;
        setActionFeedback({
          message: `Property "${propName}" status successfully updated to: ${newStatus}`,
          type: 'success',
        });

        // If modal is open for this property, update its status immediately
        if (selectedProperty && (selectedProperty.indprop_id === item.indprop_id || selectedProperty.id === item.id)) {
          setSelectedProperty((prev) => prev ? { ...prev, Status: newStatus } : null);
        }

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
      console.error('Error connecting to /api/v1/propertymanagercompleted:', err);
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

  // Active listings for current tab
  const currentTabListings = useMemo(() => {
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
    if (!searchQuery.trim()) return currentTabListings;
    const q = searchQuery.toLowerCase().trim();

    return currentTabListings.filter((item) => {
      const name = (item.Propertyname || item.propertyname || item.property_name || '').toLowerCase();
      const addr = (item.Propertyaddress || item.propertyaddress || '').toLowerCase();
      const owner = (item.contact_name || '').toLowerCase();
      const mobile = (item.contact_mobile || '').toLowerCase();
      const type = (item.property_type_name || '').toLowerCase();
      const ownership = (item.ownership_type_name || '').toLowerCase();
      const status = (item.Status || item.status || '').toLowerCase();
      const metro = (item.NearestMetroStation || '').toLowerCase();

      return (
        name.includes(q) ||
        addr.includes(q) ||
        owner.includes(q) ||
        mobile.includes(q) ||
        type.includes(q) ||
        ownership.includes(q) ||
        status.includes(q) ||
        metro.includes(q)
      );
    });
  }, [currentTabListings, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Executive Dark Header Banner for Property Manager */}
      <div className="relative bg-gradient-to-b from-[#0f172a] via-slate-900 to-slate-900 pb-10 sm:pb-12 text-white shadow-md">
        <Header />
        
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide uppercase mb-2 backdrop-blur-md">
                <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                <span>Property Manager Console &bull; EstateSync</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <span>Property Manager Dashboard</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-300">
                Welcome back, <span className="font-semibold text-white">{user}</span>. Review uploaded photos, property landmarks, and deed verification pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-8">
          
          {/* Card 1: Pending Properties to Manage (From PropertyImageUpload API) */}
          <div 
            onClick={() => setActiveTab('pending')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'pending' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-amber-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 mb-2">
                  <Camera className="h-3 w-3 text-amber-600" />
                  Media Review Queue
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Uploaded Photo Submissions
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Properties with 5 angle photos & landmarks ready for manager review
                </p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-200/60 text-amber-600 group-hover:scale-105 transition-transform">
                <Camera className="h-5 w-5" />
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
                {pendingCount > 0 ? 'Requires Inspection' : 'Queue clear'}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                Inspect 5 angle photos, deed & surroundings
              </span>
              <span className="font-semibold text-amber-800">
                Action Required
              </span>
            </div>
          </div>

          {/* Card 2: Managed & Verified Properties */}
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
                  Active In Portfolio
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Active Managed Properties
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verified listings active on EstateSync for tenants and buyers
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-200/60 text-emerald-600 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
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
                Live on Portal
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Live and accessible for tenant requests
              </span>
              <span className="font-semibold text-emerald-800">
                100% Operational
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
                Managed Properties Overview
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg border border-gray-200/60">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  Showing: {activeTab === 'pending' ? 'Pending Media Review' : activeTab === 'accepted' ? 'Active / Completed' : activeTab === 'rejected' ? 'Rejected' : 'All Listings'}
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
              
              {/* Tab 1: Pending Media Review */}
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
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
                <span>Active Properties</span>
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
                <span>Rejected</span>
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
                    ? 'bg-gray-900 text-white shadow-sm shadow-gray-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>All Listings</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'all' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-800'
                }`}>
                  {totalCount}
                </span>
              </button>

            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties, contacts..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Fetching listings from PropertyImageUpload API...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Camera className="h-6 w-6 text-gray-400" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">No property listings found</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                {searchQuery
                  ? `No results match your search "${searchQuery}". Try a different keyword.`
                  : `There are currently no listings in the "${activeTab}" category.`}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200/80">
              <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                <thead className="bg-gray-50/90 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Property</th>
                    <th scope="col" className="px-4 py-3">Property Type</th>
                    <th scope="col" className="px-4 py-3">Owner / Contact</th>
                    <th scope="col" className="px-4 py-3">Ownership</th>
                    <th scope="col" className="px-4 py-3">Address</th>
                    <th scope="col" className="px-4 py-3 text-center">Media / Deed</th>
                    <th scope="col" className="px-4 py-3 text-center">Status</th>
                    <th scope="col" className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredListings.map((item, index) => {
                    const rowKey = item.ImageId || item.indprop_id || item.id || item.IndividualPropertyId || item.property_id || `${item.contact_id || 'c'}_${item.Propertyname || item.propertyname || ''}_${item.Propertyaddress || item.propertyaddress || ''}_${index}`;
                    const propName = item.Propertyname || item.propertyname || item.property_name || 'Untitled Property';
                    const propType = item.property_type_name || (item.Propertytype || item.propertytype ? `Type #${item.Propertytype || item.propertytype}` : 'General');
                    const ownerName = item.contact_name || `Contact #${item.contact_id || 'N/A'}`;
                    const ownerMobile = item.contact_mobile || 'Not available';
                    const ownershipType = item.ownership_type_name || (item.Ownershiptype || item.ownershiptype ? `Type #${item.Ownershiptype || item.ownershiptype}` : 'Standard');
                    const address = item.Propertyaddress || item.propertyaddress || 'Address not specified';
                    const rawStatus = item.Status || item.status || 'Submitted';
                    const isRowAccepted = isAccepted(rawStatus);
                    const isRowRejected = isRejected(rawStatus);
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
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedProperty(item)}
                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left"
                                title="Click to view all property details"
                              >
                                {propName}
                              </button>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono mt-0.5">
                                {item.indprop_id && <span>Prop ID: #{item.indprop_id}</span>}
                                {item.contact_id && <span>&bull; Contact #{item.contact_id}</span>}
                              </div>
                            </div>
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
                            <a href={`tel:${ownerMobile}`} className="font-mono hover:text-blue-600">{ownerMobile}</a>
                          </div>
                        </td>

                        {/* Ownership Type */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-gray-700">
                            {ownershipType}
                          </span>
                        </td>

                        {/* Address Column */}
                        <td className="px-4 py-3 max-w-xs text-gray-600">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed" title={address}>
                              {address}
                            </span>
                          </div>
                        </td>

                        {/* Media & Deed Column: Only Deed Ref button */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedProperty(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
                            title="Click Deed Ref to view uploaded photos, landmarks & property details"
                          >
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Deed Ref</span>
                          </button>
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {rawStatus?.toLowerCase() === 'uploadimagesbyuser' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-blue-600" />
                              <span>UploadImagesByUser</span>
                            </span>
                          ) : rawStatus?.toLowerCase() === 'accepted_by_propertymanager' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Accepted_By_PropertyManager</span>
                            </span>
                          ) : rawStatus?.toLowerCase() === 'rejected_by_propertymanager' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>Rejected_By_PropertyManager</span>
                            </span>
                          ) : isRowAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>{rawStatus}</span>
                            </span>
                          ) : isRowRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>{rawStatus}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="h-2.5 w-2.5 text-amber-600" />
                              <span>{rawStatus}</span>
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            {rawStatus?.toLowerCase() === 'uploadimagesbyuser' ? (
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Accepted_By_PropertyManager</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                <span>Rejected_By_PropertyManager</span>
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
          )}

        </div>

      </main>

      {/* ========================================================================= */}
      {/* Comprehensive Property & Media Details Modal (5 Angles, Deed, Info)       */}
      {/* ========================================================================= */}
      {selectedProperty && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-5xl rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {selectedProperty.Propertyname || 'Property Listing'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Particular Property Details, 5 Angle Photos & Ownership Proof Inspection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Close inspection"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
              
              {/* Row 1: Property Metadata & Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Card A: Owner Details */}
                <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-blue-400" />
                      Owner & Contact Info
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Full Name:</span>
                      <span className="text-white font-semibold">{selectedProperty.contact_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Phone Number:</span>
                      <a 
                        href={`tel:${selectedProperty.contact_mobile}`}
                        className="text-blue-400 font-mono font-medium hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{selectedProperty.contact_mobile || 'N/A'}</span>
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Pipeline Status:</span>
                      <span className="text-amber-400 font-semibold">{selectedProperty.Status || 'UploadImagesByUser'}</span>
                    </div>
                  </div>
                </div>

                {/* Card B: Property Specifications */}
                <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                      Property Specifications
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Property Type:</span>
                      <span className="text-white font-medium">{selectedProperty.property_type_name || 'Residential'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Ownership Type:</span>
                      <span className="text-white font-medium">{selectedProperty.ownership_type_name || 'Standard'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 pt-1 border-t border-gray-700/40">
                      <span className="text-gray-400 shrink-0">Address:</span>
                      <span className="text-gray-200 font-medium text-right line-clamp-2" title={selectedProperty.Propertyaddress}>
                        {selectedProperty.Propertyaddress || 'Address on record'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Ownership Deed / Proof Reference */}
              <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    Ownership Deed / Document Proof
                  </span>
                </div>

                {selectedProperty.Ownershipproof ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gray-900/80 border border-gray-700/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-400 block">Deed Record / Reference:</span>
                        <span className="text-sm font-semibold text-white break-all">
                          {selectedProperty.Ownershipproof}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Open File if it is a document file */}
                      {isProofFile(selectedProperty.Ownershipproof) && (
                        <a
                          href={getDeedUrl(selectedProperty.Ownershipproof, selectedProperty.contact_id, selectedProperty.indprop_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
                          title="Open Deed Document in New Tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Open Document</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-400 italic flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-gray-500" />
                    <span>No separate ownership deed document was provided for this property submission.</span>
                  </div>
                )}
              </div>

              {/* Row 3: 5 Verified Angle Photos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-blue-400" />
                    <span>5 Angle Photos &bull; Uploaded For Property #{selectedProperty.indprop_id || selectedProperty.id}</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {[
                    { 
                      label: 'Front / Exterior Angle', 
                      url: selectedProperty.FrontExteriorAngle || selectedProperty.frontexteriorangle || selectedProperty.front_exterior_angle, 
                      desc: 'Property facade and front boundary view' 
                    },
                    { 
                      label: 'Living Room / Main Hall', 
                      url: selectedProperty.LivingRoomMainHall || selectedProperty.livingroommainhall || selectedProperty.living_room_main_hall, 
                      desc: 'Central living area and main entry hall' 
                    },
                    { 
                      label: 'Master Bedroom Angle', 
                      url: selectedProperty.MasterBedroomAngle || selectedProperty.masterbedroomangle || selectedProperty.master_bedroom_angle, 
                      desc: 'Primary bedroom layout and flooring' 
                    },
                    { 
                      label: 'Kitchen / Dining Space', 
                      url: selectedProperty.KitchenDiningSpace || selectedProperty.kitchendiningspace || selectedProperty.kitchen_dining_space, 
                      desc: 'Cooking counter, fittings and dining space' 
                    },
                    { 
                      label: 'Balcony / Washroom Angle', 
                      url: selectedProperty.BalconyWashroomAngle || selectedProperty.balconywashroomangle || selectedProperty.balcony_washroom_angle, 
                      desc: 'Balcony outlook or attached washroom condition' 
                    },
                  ].map((angle, idx) => (
                    <div key={idx} className="rounded-2xl border border-gray-800 bg-gray-800/50 p-2.5 flex flex-col justify-between">
                      <div 
                        className="aspect-video rounded-xl overflow-hidden bg-black/60 relative group border border-gray-700/60 mb-2 cursor-pointer"
                        onClick={() => angle.url && setLightboxImage({ url: getFullImageUrl(angle.url, selectedProperty.contact_id, selectedProperty.indprop_id), label: angle.label })}
                      >
                        {angle.url ? (
                          <>
                            <img 
                              src={getFullImageUrl(angle.url, selectedProperty.contact_id, selectedProperty.indprop_id)} 
                              alt={angle.label} 
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                const fallbackUrl = `http://127.0.0.1:5000${angle.url?.startsWith('/') ? '' : '/'}${angle.url}`;
                                if (e.currentTarget.src !== fallbackUrl) {
                                  e.currentTarget.src = fallbackUrl;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                                <Eye className="h-3.5 w-3.5 text-blue-400" />
                                <span>Click to Enlarge</span>
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 text-xs italic gap-1">
                            <Camera className="h-6 w-6 text-gray-600" />
                            <span>No photo uploaded</span>
                          </div>
                        )}
                        
                        {angle.url && (
                          <a
                            href={getFullImageUrl(angle.url, selectedProperty.contact_id, selectedProperty.indprop_id)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-[10px] flex items-center gap-1 transition-colors"
                            title="Open full resolution in new tab"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Full Tab</span>
                          </a>
                        )}
                      </div>

                      <div className="px-1">
                        <span className="text-xs font-semibold text-gray-200 block truncate">
                          {angle.label}
                        </span>
                        <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                          {angle.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 4: Landmarks Section */}
              {Boolean(
                selectedProperty.NearestMetroStation || selectedProperty.nearestmetrostation || selectedProperty.nearest_metro_station ||
                selectedProperty.NearestPoliceStation || selectedProperty.nearestpolicestation || selectedProperty.nearest_police_station ||
                selectedProperty.NearestHospital || selectedProperty.nearesthospital || selectedProperty.nearest_hospital ||
                selectedProperty.NearestShoppingMarket || selectedProperty.nearestshoppingmarket || selectedProperty.nearest_shopping_market
              ) && (
                <div className="pt-4 border-t border-gray-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Surrounding Landmarks & Infrastructure</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {(selectedProperty.NearestMetroStation || selectedProperty.nearestmetrostation || selectedProperty.nearest_metro_station) && (
                      <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-800 flex items-center gap-2.5">
                        <TrainFront className="h-4 w-4 text-blue-400 shrink-0" />
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Metro Station</span>
                          <span className="text-white font-medium">{selectedProperty.NearestMetroStation || selectedProperty.nearestmetrostation || selectedProperty.nearest_metro_station}</span>
                        </div>
                      </div>
                    )}
                    {(selectedProperty.NearestPoliceStation || selectedProperty.nearestpolicestation || selectedProperty.nearest_police_station) && (
                      <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-800 flex items-center gap-2.5">
                        <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Police Station</span>
                          <span className="text-white font-medium">{selectedProperty.NearestPoliceStation || selectedProperty.nearestpolicestation || selectedProperty.nearest_police_station}</span>
                        </div>
                      </div>
                    )}
                    {(selectedProperty.NearestHospital || selectedProperty.nearesthospital || selectedProperty.nearest_hospital) && (
                      <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-800 flex items-center gap-2.5">
                        <HeartPulse className="h-4 w-4 text-rose-400 shrink-0" />
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Hospital</span>
                          <span className="text-white font-medium">{selectedProperty.NearestHospital || selectedProperty.nearesthospital || selectedProperty.nearest_hospital}</span>
                        </div>
                      </div>
                    )}
                    {(selectedProperty.NearestShoppingMarket || selectedProperty.nearestshoppingmarket || selectedProperty.nearest_shopping_market) && (
                      <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-800 flex items-center gap-2.5">
                        <ShoppingBag className="h-4 w-4 text-purple-400 shrink-0" />
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Shopping Market</span>
                          <span className="text-white font-medium">{selectedProperty.NearestShoppingMarket || selectedProperty.nearestshoppingmarket || selectedProperty.nearest_shopping_market}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-gray-400">
                Viewing property record under <span className="text-white font-semibold">{selectedProperty.contact_name}</span> (+91 {selectedProperty.contact_mobile})
              </div>

              <div className="flex items-center gap-2">
                {selectedProperty.Status?.toLowerCase() === 'uploadimagesbyuser' && (
                  <>
                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={async () => {
                        await handleActionChange(selectedProperty, 0, 'Completed');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-900/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Accept / Mark Completed</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={async () => {
                        await handleActionChange(selectedProperty, 0, 'Rejected');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md hover:shadow-rose-900/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject Property</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Lightbox Modal for Enlarge Image Preview                                  */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 text-white">
              <span className="font-semibold text-sm">{lightboxImage.label}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-800 max-h-[80vh] flex items-center justify-center bg-black">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.label} 
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

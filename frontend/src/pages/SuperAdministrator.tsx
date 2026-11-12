import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header';
import { 
  Clock, CheckCircle2, XCircle, Building2, 
  AlertCircle, Filter, RefreshCw, Phone, User, 
  MapPin, FileText, Search, X, 
  Layers, Check, Camera, TrainFront, Shield, HeartPulse, ShoppingBag, ExternalLink,
  Eye, Crown, ShieldCheck, Sparkles, CheckCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
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
  AdminStatus?: string;
  admin_status?: string;
  Reason?: string;
  reason?: string;
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

type TabType = 'all' | 'pending' | 'manager_accepted' | 'auditor_accepted' | 'rejected';

export default function SuperAdministrator() {
  const { user, isLoadingAuth } = useAuth();

  // Active view tab: 'all' | 'pending' | 'manager_accepted' | 'auditor_accepted' | 'rejected'
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Listings data stores
  const [allListings, setAllListings] = useState<PropertyListing[]>([]);
  const [pendingListings, setPendingListings] = useState<PropertyListing[]>([]);
  const [managerAcceptedListings, setManagerAcceptedListings] = useState<PropertyListing[]>([]);
  const [auditorAcceptedListings, setAuditorAcceptedListings] = useState<PropertyListing[]>([]);
  const [rejectedListings, setRejectedListings] = useState<PropertyListing[]>([]);

  // Summary counts
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [managerAcceptedCount, setManagerAcceptedCount] = useState<number>(0);
  const [auditorAcceptedCount, setAuditorAcceptedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);

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

  // Reason inputs & pending action states for inline action confirmation
  const [pendingActionRowKey, setPendingActionRowKey] = useState<string | number | null>(null);
  const [pendingActionValue, setPendingActionValue] = useState<string>('');
  const [reasonInputs, setReasonInputs] = useState<Record<string | number, string>>({});

  // Modal pending action & reason state
  const [modalPendingAction, setModalPendingAction] = useState<string | null>(null);
  const [modalReason, setModalReason] = useState<string>('');

  // Comprehensive Property & Media Details Modal
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  
  // Lightbox for full-resolution photo preview
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);

  // Copied state for deed reference
  const [copiedProof, setCopiedProof] = useState<boolean>(false);

  // Status helper checks (supports both pipeline Status and SuperAdmin AdminStatus: Whitelisted, AdminProcess, Rejected)
  const isManagerAccepted = (statusStr?: string, adminStatusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    const a = (adminStatusStr || '').trim().toLowerCase();
    return s === 'accepted_by_propertymanager' || s === 'completed' || s === 'whitelisted' || a === 'whitelisted';
  };

  const isAuditorAccepted = (statusStr?: string, adminStatusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    const a = (adminStatusStr || '').trim().toLowerCase();
    return s === 'accepted_by_listingauditor' || s === 'accepted_by_listingaudiotr' || s === 'accepted' || s === 'adminprocess' || a === 'adminprocess';
  };

  const isPendingReview = (statusStr?: string, adminStatusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    const a = (adminStatusStr || '').trim().toLowerCase();
    if (a === 'whitelisted' || a === 'adminprocess' || a === 'rejected') return false;
    return s === 'uploadimagesbyuser' || s === 'submitted' || s === 'pending';
  };

  const isRejectedStatus = (statusStr?: string, adminStatusStr?: string) => {
    const s = (statusStr || '').trim().toLowerCase();
    const a = (adminStatusStr || '').trim().toLowerCase();
    return (
      s === 'rejected_by_propertymanager' ||
      s === 'rejected_by_listingauditor' ||
      s === 'rejected' ||
      a === 'rejected'
    );
  };

  // Canonical deduplication key generator for properties across all pipelines
  const getPropertyDedupeKey = (item: PropertyListing): string => {
    const rawAddr = (item.Propertyaddress || item.propertyaddress || item.property_address || item.address || '').trim().toLowerCase();
    const cleanAddr = rawAddr.replace(/[^a-z0-9]/g, '');

    const rawName = (item.Propertyname || item.propertyname || item.property_name || '').trim().toLowerCase();
    const cleanName = rawName.replace(/[^a-z0-9]/g, '');

    const cId = item.contact_id || item.contactid;
    const propId = item.indprop_id ?? item.ind_prop_id ?? item.IndividualPropertyId ?? item.individualpropertyid ?? item.property_id;

    // 1. Primary: Match by normalized physical property address (eliminates duplicates across endpoints & repeated test submissions)
    if (cleanAddr.length > 5) {
      return `addr_${cleanAddr}`;
    }

    // 2. Secondary: Match by database property primary key (indprop_id)
    if (propId && Number(propId) > 0) {
      return `prop_${propId}`;
    }

    // 3. Fallback: Match by owner contact + property name
    if (cId && cleanName.length > 2) {
      return `c_${cId}_name_${cleanName}`;
    }

    // 4. Fallback to generic id
    if (item.id && Number(item.id) > 0) {
      return `id_${item.id}`;
    }

    return `key_${cleanAddr || cleanName || 'item'}`;
  };

  // Helper to test if deed is a file document
  const isProofFile = (proof?: string | null) => {
    if (!proof) return false;
    const p = proof.trim().toLowerCase();
    if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying superadmin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

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

    let rawStatus = (item.Status || item.status || 'Submitted').trim();
    if (rawStatus.toLowerCase() === 'adminprocess') {
      rawStatus = 'Accepted_By_ListingAuditor';
    } else if (rawStatus.toLowerCase() === 'whitelisted') {
      rawStatus = 'Accepted_By_PropertyManager';
    }

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
      Status: rawStatus,
      AdminStatus: item.AdminStatus || item.adminstatus || item.admin_status || null,
      Reason: item.Reason || item.reason || null,
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

  // Fetch full system overview for Super Administrator
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Fetch from PropertyImageUpload API (UploadImagesByUser)
      const uploadImageData = await fetchWithFallback('/api/v1/propertyimageupload');

      // 2. Fetch from PropertyManagerCompleted API (Accepted_By_PropertyManager & Rejected_By_PropertyManager)
      const managerCompletedData = await fetchWithFallback('/api/v1/propertymanagercompleted');

      // 3. Fetch from Auditor completed applications (Accepted_By_ListingAuditor)
      const auditorCompletedData = await fetchWithFallback('/api/v1/completedapplicationlistingauditor');

      // 4. Fetch initial submitted applications from Listing Auditor pending endpoint
      const auditorPendingData = await fetchWithFallback('/api/v1/pendingapplicationlistingauditor?status=all');

      // 5. Fetch executive decisions from SuperAdminFinalAction API
      const superadminActionData = await fetchWithFallback('/api/v1/superadminfinalaction');

      // Aggregate all items
      const rawUploadItems: any[] = (
        uploadImageData?.pending_listings || 
        uploadImageData?.property_images || 
        uploadImageData?.listings || 
        []
      );

      const rawManagerItems: any[] = (
        managerCompletedData?.listings || 
        managerCompletedData?.completed_listings || 
        managerCompletedData?.accepted_listings || 
        []
      );

      const rawAuditorItems: any[] = (
        auditorCompletedData?.completed_listings || 
        auditorCompletedData?.accepted_listings || 
        auditorCompletedData?.listings || 
        []
      );

      const rawPendingAuditorItems: any[] = (
        auditorPendingData?.pending_listings || 
        auditorPendingData?.listings || 
        []
      );

      const rawSuperadminItems: any[] = (
        superadminActionData?.final_actions || 
        superadminActionData?.actions || 
        []
      );

      // Extract only the single most recent executive action per property to prevent duplicates
      const latestSuperadminActionMap = new Map<string, any>();
      rawSuperadminItems.forEach((act) => {
        const itemNorm = normalizePropertyItem(act, 0);
        const pKey = getPropertyDedupeKey(itemNorm);
        if (!latestSuperadminActionMap.has(pKey)) {
          latestSuperadminActionMap.set(pKey, act);
        }
      });
      const deduplicatedSuperadminItems = Array.from(latestSuperadminActionMap.values());

      const combinedRaw = [
        ...rawUploadItems,
        ...rawManagerItems,
        ...rawAuditorItems,
        ...rawPendingAuditorItems,
        ...deduplicatedSuperadminItems
      ];

      // Status rank helper: prefer final lifecycle statuses over initial submitted
      const getStatusRank = (s?: string): number => {
        if (!s) return 0;
        const low = s.toLowerCase();
        if (low.includes('accepted') || low.includes('rejected') || low.includes('completed')) return 3;
        if (low === 'uploadimagesbyuser') return 2;
        if (low === 'submitted' || low === 'pending') return 1;
        return 1;
      };

      // Map and deduplicate by unique property identity
      const propertyMap = new Map<string, PropertyListing>();

      combinedRaw.forEach((raw, idx) => {
        const item = normalizePropertyItem(raw, idx);
        const uniqueKey = getPropertyDedupeKey(item);

        const existing = propertyMap.get(uniqueKey);
        if (!existing) {
          propertyMap.set(uniqueKey, item);
        } else {
          const existingRank = getStatusRank(existing.Status);
          const itemRank = getStatusRank(item.Status);
          const resolvedStatus = itemRank >= existingRank ? item.Status : existing.Status;

          const bestPropId = Math.max(Number(existing.indprop_id || 0), Number(item.indprop_id || 0)) || existing.indprop_id || item.indprop_id;
          const bestImageId = Math.max(Number(existing.ImageId || 0), Number(item.ImageId || 0)) || existing.ImageId || item.ImageId;

          // Always preserve latest AdminStatus & custom Reason
          const resolvedAdminStatus = item.AdminStatus || existing.AdminStatus || null;
          const resolvedReason = item.Reason || existing.Reason || null;

          propertyMap.set(uniqueKey, {
            ...existing,
            ...item,
            id: bestPropId || existing.id || item.id,
            indprop_id: bestPropId,
            IndividualPropertyId: bestPropId,
            property_id: bestPropId,
            ImageId: bestImageId,
            contact_id: item.contact_id || existing.contact_id,
            Propertyname: existing.Propertyname || item.Propertyname,
            Propertyaddress: existing.Propertyaddress || item.Propertyaddress,
            Status: resolvedStatus,
            AdminStatus: resolvedAdminStatus,
            Reason: resolvedReason,
            FrontExteriorAngle: item.FrontExteriorAngle || existing.FrontExteriorAngle,
            LivingRoomMainHall: item.LivingRoomMainHall || existing.LivingRoomMainHall,
            MasterBedroomAngle: item.MasterBedroomAngle || existing.MasterBedroomAngle,
            KitchenDiningSpace: item.KitchenDiningSpace || existing.KitchenDiningSpace,
            BalconyWashroomAngle: item.BalconyWashroomAngle || existing.BalconyWashroomAngle,
            NearestMetroStation: item.NearestMetroStation || existing.NearestMetroStation,
            NearestPoliceStation: item.NearestPoliceStation || existing.NearestPoliceStation,
            NearestHospital: item.NearestHospital || existing.NearestHospital,
            NearestShoppingMarket: item.NearestShoppingMarket || existing.NearestShoppingMarket,
          });
        }
      });

      const masterList = Array.from(propertyMap.values());

      // Filter into categorized listings (taking into account both pipeline Status and AdminStatus)
      const pendings = masterList.filter(item => isPendingReview(item.Status, item.AdminStatus));
      const managerAccepteds = masterList.filter(item => isManagerAccepted(item.Status, item.AdminStatus));
      const auditorAccepteds = masterList.filter(item => isAuditorAccepted(item.Status, item.AdminStatus));
      const rejecteds = masterList.filter(item => isRejectedStatus(item.Status, item.AdminStatus));

      setAllListings(masterList);
      setPendingListings(pendings);
      setManagerAcceptedListings(managerAccepteds);
      setAuditorAcceptedListings(auditorAccepteds);
      setRejectedListings(rejecteds);

      setTotalCount(masterList.length);
      setPendingCount(pendings.length);
      setManagerAcceptedCount(managerAccepteds.length);
      setAuditorAcceptedCount(auditorAccepteds.length);
      setRejectedCount(rejecteds.length);

    } catch (err) {
      console.warn('API error fetching Super Administrator overview:', err);
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

  // Superadmin executive action change handler with custom reason
  const handleActionChange = async (
    item: PropertyListing, 
    _index: number, 
    selectedAction: string,
    customReason?: string
  ) => {
    if (!selectedAction) return;

    const rowKey = getPropertyDedupeKey(item);
    setRowActions((prev) => ({ ...prev, [rowKey]: selectedAction }));
    setUpdatingRowId(rowKey);
    setActionFeedback(null);

    const propName = item.Propertyname || item.propertyname || item.property_name || 'Property';

    let targetStatus = '';
    let adminStatusRecord = '';
    let defaultReason = '';

    if (selectedAction === 'Whitelisted' || selectedAction === 'Manager_Approve') {
      adminStatusRecord = 'Whitelisted';
      targetStatus = 'Accepted_By_PropertyManager';
      defaultReason = 'Approved, Whitelisted, and verified for live portal.';
    } else if (selectedAction === 'AdminProcess' || selectedAction === 'Auditor_Approve') {
      adminStatusRecord = 'AdminProcess';
      targetStatus = 'Accepted_By_ListingAuditor';
      defaultReason = 'Deed verified and promoted to AdminProcess.';
    } else if (selectedAction === 'Rejected' || selectedAction === 'Reject') {
      adminStatusRecord = 'Rejected';
      targetStatus = 'Rejected_By_PropertyManager';
      defaultReason = 'Listing non-compliant / flagged and rejected.';
    } else {
      adminStatusRecord = selectedAction;
      targetStatus = selectedAction;
      defaultReason = 'Superadmin executive action recorded.';
    }

    const finalReason = (customReason && customReason.trim()) ? customReason.trim() : defaultReason;

    const payload = {
      indprop_id: item.indprop_id || item.id || item.IndividualPropertyId || item.property_id || item.PropertyId,
      id: item.indprop_id || item.id || item.IndividualPropertyId || item.property_id || item.PropertyId,
      contact_id: item.contact_id,
      ImageId: item.ImageId || null,
      AdminStatus: adminStatusRecord,
      action: adminStatusRecord,
      Reason: finalReason,
      Propertyname: item.Propertyname || item.propertyname || item.property_name,
      status: targetStatus,
    };

    try {
      // 1. Primary call to SuperAdminFinalAction API
      let res = await fetch('/api/v1/superadminfinalaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch('http://127.0.0.1:5000/api/v1/superadminfinalaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Alias route fallback
      if (!res.ok && res.status === 404) {
        res = await fetch('/api/v1/superadminaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Fallback to legacy endpoints if new superadmin action endpoint returned an unexpected error
      if (!res.ok && res.status === 404) {
        const legacyEndpoint = (selectedAction === 'AdminProcess' || selectedAction === 'Auditor_Approve')
          ? '/api/v1/listingauditorstatusapproved'
          : '/api/v1/propertymanagercompleted';
        res = await fetch(legacyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            action: (selectedAction === 'Rejected' || selectedAction === 'Reject') ? 'Rejected' : 'Completed',
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const recordedAdminStatus = data.AdminStatus || adminStatusRecord;
        const newStatus = data.pipeline_status || data.status || targetStatus;
        const actionRef = data.ActionId || data.action_id ? ` (Action #${data.ActionId || data.action_id})` : '';
        setActionFeedback({
          message: `Executive Action Logged: Property "${propName}" is now ${recordedAdminStatus}${actionRef}`,
          type: 'success',
        });

        // Store selected action
        setRowActions((prev) => ({ ...prev, [rowKey]: recordedAdminStatus }));

        // Update modal state if open
        if (selectedProperty && (getPropertyDedupeKey(selectedProperty) === rowKey || selectedProperty.indprop_id === item.indprop_id || selectedProperty.id === item.id)) {
          setSelectedProperty((prev) => prev ? { ...prev, Status: newStatus, AdminStatus: recordedAdminStatus, Reason: finalReason } : null);
        }

        setTimeout(() => {
          fetchDashboardData();
        }, 400);
      } else {
        setActionFeedback({
          message: data.error || `Failed to record executive action for "${propName}".`,
          type: 'error',
        });
        setRowActions((prev) => {
          const next = { ...prev };
          delete next[rowKey];
          return next;
        });
      }
    } catch (err) {
      console.error('Superadmin action error:', err);
      setActionFeedback({
        message: 'Action completed locally. Please refresh if needed.',
        type: 'success',
      });
      // Local state optimistic update
      setAllListings(prev => prev.map(p => {
        if (getPropertyDedupeKey(p) === rowKey || (p.indprop_id && p.indprop_id === item.indprop_id) || (p.id && p.id === item.id)) {
          return { ...p, Status: targetStatus, AdminStatus: adminStatusRecord, Reason: finalReason };
        }
        return p;
      }));
    } finally {
      setUpdatingRowId(null);
    }
  };

  // When an admin selects an option in the table dropdown, open the reason input field
  const handleSelectAction = (_item: PropertyListing, rowKey: string | number, selectedAction: string) => {
    if (!selectedAction) return;
    setPendingActionRowKey(rowKey);
    setPendingActionValue(selectedAction);

    const defaultReason = 
      selectedAction === 'Whitelisted' ? 'Approved, Whitelisted, and verified for live portal.' :
      selectedAction === 'AdminProcess' ? 'Deed verified and promoted to AdminProcess.' :
      selectedAction === 'Rejected' ? 'Listing non-compliant / flagged and rejected.' : '';

    setReasonInputs((prev) => ({
      ...prev,
      [rowKey]: prev[rowKey] || defaultReason,
    }));
  };

  // Active listings for current tab
  const currentTabListings = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingListings;
      case 'manager_accepted':
        return managerAcceptedListings;
      case 'auditor_accepted':
        return auditorAcceptedListings;
      case 'rejected':
        return rejectedListings;
      case 'all':
      default:
        return allListings;
    }
  }, [activeTab, pendingListings, managerAcceptedListings, auditorAcceptedListings, rejectedListings, allListings]);

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
      const adminStatus = (item.AdminStatus || item.adminstatus || '').toLowerCase();
      const metro = (item.NearestMetroStation || '').toLowerCase();

      return (
        name.includes(q) ||
        addr.includes(q) ||
        owner.includes(q) ||
        mobile.includes(q) ||
        type.includes(q) ||
        ownership.includes(q) ||
        status.includes(q) ||
        adminStatus.includes(q) ||
        metro.includes(q)
      );
    });
  }, [currentTabListings, searchQuery]);

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
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying superadmin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Executive Dark Header Banner for Super Administrator */}
      <div className="relative bg-gradient-to-b from-[#0f172a] via-slate-900 to-slate-900 pb-10 sm:pb-12 text-white shadow-md">
        <Header />
        
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold tracking-wide uppercase mb-2 backdrop-blur-md">
                <Crown className="h-3.5 w-3.5 text-purple-400" />
                <span>Super Administrator Command &bull; EstateSync</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <span>Super Administrator Dashboard</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-300">
                Welcome back, <span className="font-semibold text-white">{user}</span>. Enterprise oversight, audit logs, listing governance, and master pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Metric Cards (Matching PropertyManager look) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          
          {/* Card 1: Master System Holdings */}
          <div 
            onClick={() => setActiveTab('all')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'all' ? 'ring-2 ring-purple-500 border-purple-300' : 'border-purple-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 mb-2">
                  <Layers className="h-3 w-3 text-purple-600" />
                  System Master
                </span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Total Properties
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  All platform listings across all lifecycles
                </p>
              </div>
              <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-200/60 text-purple-600 group-hover:scale-105 transition-transform">
                <Crown className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? <span className="inline-block animate-pulse text-gray-400">...</span> : totalCount}
              </span>
              <span className="text-xs font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                100% Platform Scope
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-600" />
                Enterprise catalog
              </span>
              <span className="font-semibold text-purple-800">
                Live Overview
              </span>
            </div>
          </div>

          {/* Card 2: Pending Applications & Uploads */}
          <div 
            onClick={() => setActiveTab('pending')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'pending' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-amber-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 mb-2">
                  <Camera className="h-3 w-3 text-amber-600" />
                  Pending Pipeline
                </span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Review & Upload Queue
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Awaiting auditor review or manager media
                </p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-200/60 text-amber-600 group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? <span className="inline-block animate-pulse text-gray-400">...</span> : pendingCount}
              </span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                {pendingCount > 0 ? 'Requires Action' : 'Clear'}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                Submitted & media uploads
              </span>
              <span className="font-semibold text-amber-800">
                Actionable
              </span>
            </div>
          </div>

          {/* Card 3: Live Active Properties */}
          <div 
            onClick={() => setActiveTab('manager_accepted')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'manager_accepted' ? 'ring-2 ring-emerald-500 border-emerald-300' : 'border-emerald-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Active In Portfolio
                </span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Manager Verified
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  100% verified & operational for buyers
                </p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-200/60 text-emerald-600 group-hover:scale-105 transition-transform">
                <Building2 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? <span className="inline-block animate-pulse text-gray-400">...</span> : managerAcceptedCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Live on Portal
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-600" />
                Audited & inspected
              </span>
              <span className="font-semibold text-emerald-800">
                Operational
              </span>
            </div>
          </div>

          {/* Card 4: Auditor Approved (Stage 1 Passed) */}
          <div 
            onClick={() => setActiveTab('auditor_accepted')}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              activeTab === 'auditor_accepted' ? 'ring-2 ring-blue-500 border-blue-300' : 'border-blue-200/80'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 mb-2">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  Deed Approved
                </span>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Auditor Approved
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Ownership deed verified by Listing Auditor
                </p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-200/60 text-blue-600 group-hover:scale-105 transition-transform">
                <Shield className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? <span className="inline-block animate-pulse text-gray-400">...</span> : auditorAcceptedCount}
              </span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                Stage 1 Passed
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-blue-600" />
                Ready for angle photos
              </span>
              <span className="font-semibold text-blue-800">
                Verified Deed
              </span>
            </div>
          </div>

        </div>

        {/* Main Card Container */}
        <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-xl border border-gray-100 ring-1 ring-gray-900/5">
          
          {/* Header section with clean spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Enterprise Listings Overview</span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800">
                  Superadmin View
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100/80 px-2.5 py-1 rounded-lg border border-gray-200/60">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  Showing: {
                    activeTab === 'all' ? 'All Platform Listings' :
                    activeTab === 'pending' ? 'Pending Reviews & Media' :
                    activeTab === 'manager_accepted' ? 'Manager Verified (Live)' :
                    activeTab === 'auditor_accepted' ? 'Auditor Approved' :
                    'Declined / Rejected'
                  }
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
              
              {/* Tab 1: All Listings */}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
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

              {/* Tab 2: Pending Review */}
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

              {/* Tab 3: Manager Verified (Active) */}
              <button
                type="button"
                onClick={() => setActiveTab('manager_accepted')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manager_accepted'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Active Properties</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'manager_accepted' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {managerAcceptedCount}
                </span>
              </button>

              {/* Tab 4: Auditor Approved */}
              <button
                type="button"
                onClick={() => setActiveTab('auditor_accepted')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'auditor_accepted'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Auditor Approved</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'auditor_accepted' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
                }`}>
                  {auditorAcceptedCount}
                </span>
              </button>

              {/* Tab 5: Rejected */}
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
                <span>Declined</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                  activeTab === 'rejected' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  {rejectedCount}
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
                placeholder="Search properties, contacts, city..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm"
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
              <RefreshCw className="h-7 w-7 animate-spin text-purple-600" />
              <p className="text-xs font-medium">Aggregating system properties across all pipelines...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Crown className="h-6 w-6 text-gray-400" />
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
                  className="mt-3 text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <>
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
                    <th scope="col" className="px-4 py-3 text-center">AdminStatus</th>
                    <th scope="col" className="px-4 py-3 text-left">Reason</th>
                    <th scope="col" className="px-4 py-3 text-center">Superadmin Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedListings.map((item, index) => {
                    const address = item.Propertyaddress || item.propertyaddress || 'Address not specified';
                    const rowKey = getPropertyDedupeKey(item);
                    const propName = item.Propertyname || item.propertyname || item.property_name || 'Untitled Property';
                    const propType = item.property_type_name || (item.Propertytype || item.propertytype ? `Type #${item.Propertytype || item.propertytype}` : 'General');
                    const ownerName = item.contact_name || `Contact #${item.contact_id || 'N/A'}`;
                    const ownerMobile = item.contact_mobile || 'Not available';
                    const ownershipType = item.ownership_type_name || (item.Ownershiptype || item.ownershiptype ? `Type #${item.Ownershiptype || item.ownershiptype}` : 'Standard');
                    const rawStatus = (item.Status || item.status || 'Submitted').trim();
                    const isMgrAccepted = isManagerAccepted(rawStatus, item.AdminStatus);
                    const isAudAccepted = isAuditorAccepted(rawStatus, item.AdminStatus);
                    const isRej = isRejectedStatus(rawStatus, item.AdminStatus);
                    const isUpdating = updatingRowId === rowKey;

                    if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying superadmin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return (
                      <tr key={rowKey} className="hover:bg-gray-50/70 transition-colors">
                        
                        {/* Property Column */}
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              isMgrAccepted ? 'bg-emerald-50 text-emerald-600' :
                              isAudAccepted ? 'bg-blue-50 text-blue-600' :
                              isRej ? 'bg-rose-50 text-rose-600' :
                              'bg-purple-50 text-purple-600'
                            }`}>
                              <Building2 className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => setSelectedProperty(item)}
                                className="font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer text-left"
                                title="Click to view all property details"
                              >
                                {propName}
                              </button>
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
                            <a href={`tel:${ownerMobile}`} className="font-mono hover:text-purple-600">{ownerMobile}</a>
                          </div>
                        </td>

                        {/* Ownership Type */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-gray-700">
                            {ownershipType}
                          </span>
                        </td>

                        {/* Address Column - Full Address Display without Truncation */}
                        <td className="px-4 py-3 min-w-[200px] max-w-sm text-gray-700">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed whitespace-normal break-words text-xs">
                              {address}
                            </span>
                          </div>
                        </td>

                        {/* Media & Deed Column: Deed Ref button */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedProperty(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
                            title="Click Deed Ref to view uploaded photos, landmarks & property details"
                          >
                            <FileText className="h-3.5 w-3.5 text-purple-600" />
                            <span>Deed Ref</span>
                          </button>
                        </td>

                        {/* Status Column - Pipeline Status Untouched */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {rawStatus.toLowerCase() === 'uploadimagesbyuser' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              <Camera className="h-2.5 w-2.5 text-amber-600" />
                              <span>UploadImagesByUser</span>
                            </span>
                          ) : isMgrAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Accepted_By_PropertyManager</span>
                            </span>
                          ) : isAudAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                              <ShieldCheck className="h-2.5 w-2.5 text-blue-600" />
                              <span>Accepted_By_ListingAuditor</span>
                            </span>
                          ) : isRej ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>{rawStatus}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                              <Clock className="h-2.5 w-2.5 text-slate-600" />
                              <span>{rawStatus}</span>
                            </span>
                          )}
                        </td>

                        {/* AdminStatus Column - Dedicated Superadmin Status Badge */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {item.AdminStatus === 'Whitelisted' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                              <span>Whitelisted</span>
                            </span>
                          ) : item.AdminStatus === 'AdminProcess' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                              <ShieldCheck className="h-2.5 w-2.5 text-blue-600" />
                              <span>AdminProcess</span>
                            </span>
                          ) : item.AdminStatus === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shadow-sm">
                              <XCircle className="h-2.5 w-2.5 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                              — Not Set —
                            </span>
                          )}
                        </td>

                        {/* Reason Column - Dedicated Column for Superadmin Action Reason */}
                        <td className="px-4 py-3 min-w-[200px] max-w-sm text-left">
                          {item.Reason ? (
                            <div className={`p-2 rounded-xl text-xs leading-relaxed whitespace-normal break-words border shadow-xs ${
                              item.AdminStatus === 'Whitelisted'
                                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                                : item.AdminStatus === 'AdminProcess'
                                ? 'bg-blue-50/70 border-blue-200/80 text-blue-950'
                                : item.AdminStatus === 'Rejected'
                                ? 'bg-rose-50/70 border-rose-200/80 text-rose-950'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}>
                              <span className="font-medium">{item.Reason}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                              — No Reason Stated —
                            </span>
                          )}
                        </td>

                        {/* Superadmin Action Column - Select Option Opens Custom Reason Field */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center justify-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <select
                                value={
                                  pendingActionRowKey === rowKey 
                                    ? pendingActionValue
                                    : (rowActions[rowKey] || 
                                       (item.AdminStatus === 'Whitelisted' ? 'Whitelisted' :
                                        item.AdminStatus === 'AdminProcess' ? 'AdminProcess' :
                                        item.AdminStatus === 'Rejected' ? 'Rejected' : ''))
                                }
                                disabled={isUpdating}
                                onChange={(e) => handleSelectAction(item, rowKey, e.target.value)}
                                className={`text-xs font-semibold border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  (pendingActionRowKey === rowKey ? pendingActionValue : (rowActions[rowKey] || item.AdminStatus)) === 'Whitelisted'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : (pendingActionRowKey === rowKey ? pendingActionValue : (rowActions[rowKey] || item.AdminStatus)) === 'AdminProcess'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : (pendingActionRowKey === rowKey ? pendingActionValue : (rowActions[rowKey] || item.AdminStatus)) === 'Rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <option value="" disabled>Executive Action</option>
                                <option value="Whitelisted" className="text-emerald-700 font-semibold">
                                  ✓ Full Verify & Make Live
                                </option>
                                <option value="AdminProcess" className="text-blue-700 font-semibold">
                                  🛡️ Mark Auditor Approved
                                </option>
                                <option value="Rejected" className="text-rose-700 font-semibold">
                                  ✕ Decline / Flag Listing
                                </option>
                              </select>

                              {isUpdating && (
                                <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                              )}
                            </div>

                            {/* Field for reason: Appears when admin selects any option */}
                            {pendingActionRowKey === rowKey && (
                              <div className="mt-2.5 p-3 bg-purple-50/95 border border-purple-200 rounded-xl shadow-lg text-left space-y-2 animate-in fade-in zoom-in-95 min-w-[260px] max-w-[320px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                    <span>Reason: {pendingActionValue}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingActionRowKey(null);
                                      setPendingActionValue('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded hover:bg-purple-100"
                                    title="Cancel"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>

                                <div>
                                  <textarea
                                    rows={2}
                                    value={reasonInputs[rowKey] ?? ''}
                                    onChange={(e) => setReasonInputs(prev => ({ ...prev, [rowKey]: e.target.value }))}
                                    placeholder="Write your custom reason here..."
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-sans text-gray-800 shadow-inner"
                                    autoFocus
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingActionRowKey(null);
                                      setPendingActionValue('');
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={async () => {
                                      const customReason = reasonInputs[rowKey] || '';
                                      await handleActionChange(item, index, pendingActionValue, customReason);
                                      setPendingActionRowKey(null);
                                      setPendingActionValue('');
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    <span>Save & Apply</span>
                                  </button>
                                </div>
                              </div>
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
                  <span className="font-bold text-gray-900">{totalItems}</span> properties
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
                        if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying superadmin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return (
                          <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(p);
                      const isActive = pageNum === validCurrentPage;
                      if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-300">Verifying superadmin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
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
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {selectedProperty.Propertyname || 'Property Listing'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Superadmin Inspection
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Executive Review: Particular Property Details, 5 Angle Photos & Ownership Proof
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
                      <User className="h-3.5 w-3.5 text-purple-400" />
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
                        className="text-purple-400 font-mono font-medium hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{selectedProperty.contact_mobile || 'N/A'}</span>
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Pipeline Status:</span>
                      <span className="text-amber-400 font-semibold">{selectedProperty.Status || 'Submitted'}</span>
                    </div>
                    {selectedProperty.AdminStatus && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Superadmin Status:</span>
                        <span className={`font-semibold ${
                          selectedProperty.AdminStatus === 'Whitelisted' ? 'text-emerald-400' :
                          selectedProperty.AdminStatus === 'AdminProcess' ? 'text-blue-400' :
                          selectedProperty.AdminStatus === 'Rejected' ? 'text-rose-400' : 'text-purple-400'
                        }`}>
                          {selectedProperty.AdminStatus}
                        </span>
                      </div>
                    )}
                    {selectedProperty.Reason && (
                      <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-700/50">
                        <span className="text-gray-400 shrink-0">Admin Reason:</span>
                        <span className="text-gray-300 text-right font-medium italic">
                          "{selectedProperty.Reason}"
                        </span>
                      </div>
                    )}
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
                      <span className="text-gray-200 font-medium text-right whitespace-normal break-words leading-relaxed">
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
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    Ownership Deed / Document Proof
                  </span>
                </div>

                {selectedProperty.Ownershipproof ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-gray-900/80 border border-gray-700/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 shrink-0">
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
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProperty.Ownershipproof) {
                            navigator.clipboard.writeText(selectedProperty.Ownershipproof);
                            setCopiedProof(true);
                            setTimeout(() => setCopiedProof(false), 2000);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium border border-gray-700 transition-colors cursor-pointer"
                        title="Copy Deed Reference to Clipboard"
                      >
                        {copiedProof ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                            <span>Copy Ref</span>
                          </>
                        )}
                      </button>

                      {/* Open File if it is a document file */}
                      {isProofFile(selectedProperty.Ownershipproof) && (
                        <a
                          href={getDeedUrl(selectedProperty.Ownershipproof, selectedProperty.contact_id, selectedProperty.indprop_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors shadow-sm"
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
                    <Camera className="h-3.5 w-3.5 text-purple-400" />
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
                                <Eye className="h-3.5 w-3.5 text-purple-400" />
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

            {/* Modal Footer with Actions & Reason Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex flex-col gap-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-gray-400">
                  Superadmin Inspection &bull; Owner: <span className="text-white font-semibold">{selectedProperty.contact_name}</span> ({selectedProperty.contact_mobile})
                </div>

                {!modalPendingAction && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={() => {
                        setModalPendingAction('Whitelisted');
                        setModalReason('Approved, Whitelisted, and verified for live portal.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-900/50 transition-all cursor-pointer disabled:opacity-50"
                      title="Full Verify & Make Live (Saved as Whitelisted)"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>✓ Full Verify & Make Live</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={() => {
                        setModalPendingAction('AdminProcess');
                        setModalReason('Deed verified and promoted to AdminProcess.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-blue-900/50 transition-all cursor-pointer disabled:opacity-50"
                      title="Mark Auditor Approved (Saved as AdminProcess)"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>🛡️ Mark Auditor Approved</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={() => {
                        setModalPendingAction('Rejected');
                        setModalReason('Listing non-compliant / flagged and rejected.');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md hover:shadow-rose-900/50 transition-all cursor-pointer disabled:opacity-50"
                      title="Decline / Flag Listing (Saved as Rejected)"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>✕ Decline / Flag Listing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProperty(null);
                        setModalPendingAction(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Field for reason inside modal when option is selected */}
              {modalPendingAction && (
                <div className="w-full p-3.5 bg-gray-800/95 border border-purple-500/40 rounded-2xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                    <span>Write reason for {modalPendingAction}:</span>
                    <button 
                      type="button" 
                      onClick={() => setModalPendingAction(null)} 
                      className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    placeholder="Write your custom reason here on your own..."
                    className="w-full text-xs p-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-sans"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalPendingAction(null)}
                      className="px-3.5 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updatingRowId !== null}
                      onClick={async () => {
                        await handleActionChange(selectedProperty, 0, modalPendingAction, modalReason);
                        setModalPendingAction(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md hover:shadow-purple-900/50 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Save & Apply</span>
                    </button>
                  </div>
                </div>
              )}
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

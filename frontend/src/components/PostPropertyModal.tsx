import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, User, Phone, CheckCircle2, ArrowRight, ShieldCheck, 
  Sparkles, Check, AlertCircle, Building, MapPin, FileText, 
  ArrowLeft, Save, Home 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PostPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PropertyTypeItem {
  PropertyId: number;
  PropertyType: string;
}

interface OwnershipTypeItem {
  OwnerTypeId: number;
  OwnerTypeName: string;
}

export default function PostPropertyModal({ isOpen, onClose }: PostPropertyModalProps) {
  const { user, contactId: authContactId, contactMobile } = useAuth();

  // Step Management: 1 = Contact Info, 2 = Property Details, 3 = Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Contact Details State
  const [contactId, setContactId] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [contactErrors, setContactErrors] = useState<{ fullName?: string; mobileNumber?: string }>({});

  // Dynamic Master Dropdown Data from APIs
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeItem[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipTypeItem[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  // Step 2: Property Details State
  const [propertyName, setPropertyName] = useState('');
  const [selectedPropertyTypeId, setSelectedPropertyTypeId] = useState<number | string>('');
  const [selectedOwnershipTypeId, setSelectedOwnershipTypeId] = useState<number | string>('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [ownershipProof, setOwnershipProof] = useState('');
  const [propertyErrors, setPropertyErrors] = useState<{ propertyName?: string; propertyAddress?: string }>({});

  // Shared States
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side mounting for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard accessibility & body scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fetch Dynamic Dropdowns from Backend APIs
  useEffect(() => {
    if (!isOpen) return;

    const fetchMasters = async () => {
      setIsLoadingMasters(true);
      try {
        // 1. Fetch Property Types
        let propRes = await fetch('/api/v1/populatepropertytype');
        if (!propRes.ok && (propRes.status === 404 || propRes.status === 502)) {
          propRes = await fetch('http://127.0.0.1:5000/api/v1/populatepropertytype');
        }
        if (propRes.ok) {
          const propData = await propRes.json();
          const pList: PropertyTypeItem[] = propData.property_types || [];
          setPropertyTypes(pList);
          if (pList.length > 0 && !selectedPropertyTypeId) {
            setSelectedPropertyTypeId(pList[0].PropertyId);
          }
        }

        // 2. Fetch Ownership Types
        let ownerRes = await fetch('/api/v1/populateownershiptype');
        if (!ownerRes.ok && (ownerRes.status === 404 || ownerRes.status === 502)) {
          ownerRes = await fetch('http://127.0.0.1:5000/api/v1/populateownershiptype');
        }
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          const oList: OwnershipTypeItem[] = ownerData.ownership_types || [];
          setOwnershipTypes(oList);
          if (oList.length > 0 && !selectedOwnershipTypeId) {
            setSelectedOwnershipTypeId(oList[0].OwnerTypeId);
          }
        }
      } catch (err) {
        console.error('Failed to load property/ownership master types:', err);
      } finally {
        setIsLoadingMasters(false);
      }
    };

    fetchMasters();
  }, [isOpen]);

  // Load registered contact details if available from AuthContext
  useEffect(() => {
    if (!isOpen) return;

    if (authContactId) {
      setContactId(authContactId);
      if (user) setFullName(user);
      if (contactMobile) setMobileNumber(contactMobile);
      setStep(2);
    } else {
      if (user && !fullName) setFullName(user);
      if (contactMobile && !mobileNumber) setMobileNumber(contactMobile);
    }
  }, [isOpen, authContactId, user, contactMobile]);

  if (!isOpen || !mounted) return null;

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: { fullName?: string; mobileNumber?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
      newErrors.fullName = 'Special characters and numbers are not allowed';
    }

    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Please enter your mobile number';
    } else if (cleanedMobile.length !== 10) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    setContactErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: { propertyName?: string; propertyAddress?: string } = {};

    if (!propertyName.trim()) {
      newErrors.propertyName = 'Property name is required';
    } else if (propertyName.trim().length < 3) {
      newErrors.propertyName = 'Property name should be at least 3 characters';
    }

    if (!propertyAddress.trim()) {
      newErrors.propertyAddress = 'Property address is required';
    }

    setPropertyErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 1: Submit Contact Details API
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateStep1()) return;

    setIsSubmitting(true);

    const payload = {
      name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
    };

    try {
      let response = await fetch('/api/v1/savecontactdetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && (response.status === 404 || response.status === 502)) {
        response = await fetch('http://127.0.0.1:5000/api/v1/savecontactdetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        if (result.contact_id) {
          setContactId(result.contact_id);
        }
        setStep(2);
      } else {
        setApiError(result.error || result.message || 'Failed to save contact details.');
      }
    } catch (err) {
      try {
        const fallbackRes = await fetch('http://127.0.0.1:5000/api/v1/savecontactdetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const fallbackResult = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok) {
          if (fallbackResult.contact_id) {
            setContactId(fallbackResult.contact_id);
          }
          setStep(2);
          return;
        } else {
          setApiError(fallbackResult.error || fallbackResult.message || 'Failed to save contact details.');
          return;
        }
      } catch (fallbackErr) {
        console.error('Error connecting to backend API:', err);
        setApiError('Unable to connect to the server. Please verify the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit Individual Property Details API
  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateStep2()) return;

    setIsSubmitting(true);

    const payload = {
      contact_id: contactId || 1,
      Propertyname: propertyName.trim(),
      Propertytype: selectedPropertyTypeId ? Number(selectedPropertyTypeId) : null,
      Ownershiptype: selectedOwnershipTypeId ? Number(selectedOwnershipTypeId) : null,
      Propertyaddress: propertyAddress.trim(),
      Ownershipproof: ownershipProof.trim(),
      Status: 'Submitted',
    };

    try {
      let response = await fetch('/api/v1/saveindividualpropertydetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok && (response.status === 404 || response.status === 502)) {
        response = await fetch('http://127.0.0.1:5000/api/v1/saveindividualpropertydetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setStep(3); // Success Screen
      } else {
        setApiError(result.error || result.message || 'Failed to save property details.');
      }
    } catch (err) {
      try {
        const fallbackRes = await fetch('http://127.0.0.1:5000/api/v1/saveindividualpropertydetails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const fallbackResult = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok) {
          setStep(3);
          return;
        } else {
          setApiError(fallbackResult.error || fallbackResult.message || 'Failed to save property details.');
          return;
        }
      } catch (fallbackErr) {
        console.error('Error connecting to save property details API:', err);
        setApiError('Unable to connect to the server. Please verify the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      if (authContactId) {
        setStep(2);
        setContactId(authContactId);
        setFullName(user || '');
        setMobileNumber(contactMobile || '');
      } else {
        setStep(1);
        setContactId(null);
        setFullName('');
        setMobileNumber('');
      }
      setPropertyName('');
      if (propertyTypes.length > 0) {
        setSelectedPropertyTypeId(propertyTypes[0].PropertyId);
      }
      if (ownershipTypes.length > 0) {
        setSelectedOwnershipTypeId(ownershipTypes[0].OwnerTypeId);
      }
      setPropertyAddress('');
      setOwnershipProof('');
      setContactErrors({});
      setPropertyErrors({});
      setApiError(null);
    }, 250);
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (rawVal.length <= 10) {
      setMobileNumber(rawVal);
      if (contactErrors.mobileNumber) {
        setContactErrors((prev) => ({ ...prev, mobileNumber: undefined }));
      }
    }
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape' || e.key === 'Enter') {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedVal = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFullName(sanitizedVal);
    if (contactErrors.fullName) {
      setContactErrors((prev) => ({ ...prev, fullName: undefined }));
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape' || e.key === 'Enter') {
      return;
    }
    if (!/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Resolved Names for Step 3 Summary
  const resolvedPropertyTypeName = propertyTypes.find(
    (p) => p.PropertyId === Number(selectedPropertyTypeId)
  )?.PropertyType || 'N/A';

  const resolvedOwnershipTypeName = ownershipTypes.find(
    (o) => o.OwnerTypeId === Number(selectedOwnershipTypeId)
  )?.OwnerTypeName || 'N/A';

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md transition-opacity duration-300"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-property-title"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900 transition-all duration-300 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white sm:text-gray-400 sm:bg-gray-100 sm:hover:bg-gray-200 sm:hover:text-gray-900 transition-colors focus:outline-none"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* STEP 1: CONTACT INFORMATION */}
        {step === 1 && (
          <>
            {/* Header Banner */}
            <div className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white p-6 sm:p-7 shrink-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-2.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Step 1 of 2 &bull; Contact Info</span>
                </div>

                <h2 id="post-property-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Post Your Property
                </h2>
                
                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 leading-relaxed">
                  Connect directly with verified buyers and tenants with zero brokerage.
                </p>

                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10 text-xs font-medium text-gray-200">
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Zero Brokerage
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Verified Buyers
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1 Form */}
            <div className="p-6 sm:p-7 overflow-y-auto bg-white">
              <form onSubmit={handleContactSubmit} className="space-y-4 sm:space-y-5" noValidate>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={fullName}
                      onChange={handleNameChange}
                      onKeyDown={handleNameKeyDown}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        contactErrors.fullName
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:border-gray-900 focus:ring-gray-900/10'
                      }`}
                      autoComplete="name"
                      required
                    />
                  </div>
                  {contactErrors.fullName && (
                    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                      <span>{contactErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Mobile Number */}
                <div>
                  <label htmlFor="mobileNumber" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all bg-gray-50 focus-within:bg-white">
                    <div className="flex items-center gap-1 px-3 bg-gray-100 border-r border-gray-200 text-gray-700 font-medium text-sm select-none">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={mobileNumber}
                      onChange={handleMobileChange}
                      onKeyDown={handleMobileKeyDown}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="w-full px-3.5 py-3 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {contactErrors.mobileNumber ? (
                    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                      <span>{contactErrors.mobileNumber}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-gray-500">
                      We'll send genuine buyer inquiries & listing updates to this number.
                    </p>
                  )}
                </div>

                {/* Trust Guarantee */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>100% Privacy Guaranteed &bull; No Spam &bull; Verified Inquiries</span>
                </div>

                {/* API Error Message */}
                {apiError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs sm:text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span>{apiError}</span>
                  </div>
                )}

                {/* Next Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-black active:scale-[0.99] px-5 py-3.5 text-sm sm:text-base font-semibold text-white shadow-lg shadow-gray-900/20 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Saving & Proceeding...</span>
                    </>
                  ) : (
                    <>
                      <span>Next and Register for post property</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}

        {/* STEP 2: INDIVIDUAL PROPERTY DETAILS */}
        {step === 2 && (
          <>
            {/* Header Banner */}
            <div className="relative bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-white p-6 sm:p-7 shrink-0 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-2.5">
                  <Building className="h-3.5 w-3.5" />
                  <span>Step 2 of 2 &bull; Property Details</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Individual Property Details
                </h2>
                
                <p className="text-xs sm:text-sm text-gray-300 mt-1.5 leading-relaxed">
                  Registered for <span className="text-white font-medium">{fullName}</span> (+91 {mobileNumber})
                </p>
              </div>
            </div>

            {/* Step 2 Form */}
            <div className="p-6 sm:p-7 overflow-y-auto bg-white">
              <form onSubmit={handlePropertySubmit} className="space-y-4" noValidate>
                {/* Field 1: Property Name */}
                <div>
                  <label htmlFor="propertyName" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Home className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      id="propertyName"
                      name="propertyName"
                      value={propertyName}
                      onChange={(e) => {
                        setPropertyName(e.target.value);
                        if (propertyErrors.propertyName) {
                          setPropertyErrors((prev) => ({ ...prev, propertyName: undefined }));
                        }
                      }}
                      placeholder="e.g. Modern 3 BHK Luxury Apartment"
                      className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        propertyErrors.propertyName
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:border-gray-900 focus:ring-gray-900/10'
                      }`}
                      required
                    />
                  </div>
                  {propertyErrors.propertyName && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      {propertyErrors.propertyName}
                    </p>
                  )}
                </div>

                {/* Row: Dynamic Property Type & Dynamic Ownership Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Field 2: Dynamic Property Type */}
                  <div>
                    <label htmlFor="propertyType" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Property Type {isLoadingMasters && <span className="text-xs text-gray-400 font-normal">(Loading...)</span>}
                    </label>
                    <select
                      id="propertyType"
                      name="propertyType"
                      value={selectedPropertyTypeId}
                      onChange={(e) => setSelectedPropertyTypeId(e.target.value ? Number(e.target.value) : '')}
                      disabled={isLoadingMasters}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {propertyTypes.length === 0 ? (
                        <option value="">{isLoadingMasters ? 'Loading types...' : 'Select Property Type'}</option>
                      ) : (
                        propertyTypes.map((item) => (
                          <option key={item.PropertyId} value={item.PropertyId}>
                            {item.PropertyType}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Field 3: Dynamic Ownership Type */}
                  <div>
                    <label htmlFor="ownershipType" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                      Ownership Type {isLoadingMasters && <span className="text-xs text-gray-400 font-normal">(Loading...)</span>}
                    </label>
                    <select
                      id="ownershipType"
                      name="ownershipType"
                      value={selectedOwnershipTypeId}
                      onChange={(e) => setSelectedOwnershipTypeId(e.target.value ? Number(e.target.value) : '')}
                      disabled={isLoadingMasters}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {ownershipTypes.length === 0 ? (
                        <option value="">{isLoadingMasters ? 'Loading types...' : 'Select Ownership Type'}</option>
                      ) : (
                        ownershipTypes.map((item) => (
                          <option key={item.OwnerTypeId} value={item.OwnerTypeId}>
                            {item.OwnerTypeName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Field 4: Property Address */}
                <div>
                  <label htmlFor="propertyAddress" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Property Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3.5 pointer-events-none text-gray-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <textarea
                      id="propertyAddress"
                      name="propertyAddress"
                      rows={2}
                      value={propertyAddress}
                      onChange={(e) => {
                        setPropertyAddress(e.target.value);
                        if (propertyErrors.propertyAddress) {
                          setPropertyErrors((prev) => ({ ...prev, propertyAddress: undefined }));
                        }
                      }}
                      placeholder="e.g. Flat 402, Palm Heights, Sector 62, Noida, Uttar Pradesh"
                      className={`w-full pl-11 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all resize-none ${
                        propertyErrors.propertyAddress
                          ? 'border-red-400 focus:ring-red-200'
                          : 'border-gray-200 focus:border-gray-900 focus:ring-gray-900/10'
                      }`}
                      required
                    />
                  </div>
                  {propertyErrors.propertyAddress && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      {propertyErrors.propertyAddress}
                    </p>
                  )}
                </div>

                {/* Field 5: Ownership Proof */}
                <div>
                  <label htmlFor="ownershipProof" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                    Ownership Proof Reference <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      id="ownershipProof"
                      name="ownershipProof"
                      value={ownershipProof}
                      onChange={(e) => setOwnershipProof(e.target.value)}
                      placeholder="e.g. Sale Deed No. / Title Deed / Registry Ref"
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm sm:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* API Error Message */}
                {apiError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs sm:text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <span>{apiError}</span>
                  </div>
                )}

                {/* Buttons Row */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApiError(null);
                      setStep(1);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-black active:scale-[0.99] px-5 py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-gray-900/20 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Saving Property...</span>
                      </>
                    ) : (
                      <>
                        <span>Save Property Details</span>
                        <Save className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div className="p-8 sm:p-10 text-center bg-white overflow-y-auto">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5 shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Property Details Saved!
            </h3>
            
            <p className="text-sm sm:text-base text-gray-600 max-w-sm mx-auto mb-6 leading-relaxed">
              Thank you, <span className="font-semibold text-gray-900">{fullName}</span>! Your property <span className="font-semibold text-gray-900">"{propertyName}"</span> has been registered successfully.
            </p>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-left text-xs sm:text-sm text-gray-700 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Property Type:</span>
                <span className="font-semibold text-gray-900">{resolvedPropertyTypeName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Ownership:</span>
                <span className="font-semibold text-gray-900">{resolvedOwnershipTypeName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Contact Number:</span>
                <span className="font-semibold text-gray-900">+91 {mobileNumber}</span>
              </div>
              <div className="flex items-start justify-between py-1">
                <span className="text-gray-500 shrink-0 mr-2">Address:</span>
                <span className="font-medium text-gray-900 text-right">{propertyAddress}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-gray-900 hover:bg-black text-white px-5 py-3.5 text-sm sm:text-base font-semibold shadow-md transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

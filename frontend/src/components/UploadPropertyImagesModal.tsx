import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Camera, UploadCloud, CheckCircle2, AlertCircle, 
  Trash2, Building2, TrainFront, Shield, 
  HeartPulse, ShoppingBag, Check, RefreshCw, AlertTriangle, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface PropertyMediaTarget {
  id?: number;
  IndividualPropertyId?: number;
  indprop_id?: number;
  PropertyId?: number;
  contact_id?: number;
  Propertyname?: string;
  propertyname?: string;
  property_name?: string;
  Propertyaddress?: string;
  propertyaddress?: string;
  property_type_name?: string;
  ownership_type_name?: string;
}

interface UploadPropertyImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyMediaTarget | null;
  onSuccess?: () => void;
}

type AngleKey = 
  | 'FrontExteriorAngle' 
  | 'LivingRoomMainHall' 
  | 'MasterBedroomAngle' 
  | 'KitchenDiningSpace' 
  | 'BalconyWashroomAngle';

interface AngleSlot {
  id: number;
  key: AngleKey;
  angleName: string;
  angleDescription: string;
  file: File | null;
  previewUrl: string | null;
  sizeKb: number | null;
  error: string | null;
}

const INITIAL_ANGLES: { id: number; key: AngleKey; angleName: string; angleDescription: string }[] = [
  { id: 1, key: 'FrontExteriorAngle', angleName: 'Front / Exterior Angle', angleDescription: 'Clear building front or facade view' },
  { id: 2, key: 'LivingRoomMainHall', angleName: 'Living Room / Main Hall', angleDescription: 'Interior view of primary living space' },
  { id: 3, key: 'MasterBedroomAngle', angleName: 'Master Bedroom Angle', angleDescription: 'Spacious view of primary bedroom' },
  { id: 4, key: 'KitchenDiningSpace', angleName: 'Kitchen / Dining Space', angleDescription: 'Kitchen layout, counters & dining space' },
  { id: 5, key: 'BalconyWashroomAngle', angleName: 'Balcony / Washroom Angle', angleDescription: 'Balcony view or modern washroom' },
];

const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500 KB limit (512,000 bytes)
const MAX_LANDMARK_LENGTH = 100; // 100 characters max limit

export default function UploadPropertyImagesModal({
  isOpen,
  onClose,
  property,
  onSuccess
}: UploadPropertyImagesModalProps) {
  const { contactId: authContactId } = useAuth();
  const [mounted, setMounted] = useState(false);

  // 5 Mandatory Angle Slots
  const [angleSlots, setAngleSlots] = useState<AngleSlot[]>(() =>
    INITIAL_ANGLES.map(a => ({
      ...a,
      file: null,
      previewUrl: null,
      sizeKb: null,
      error: null
    }))
  );

  // 4 Surrounding Landmark Fields (Strictly no special characters, max 100 characters)
  const [nearestMetro, setNearestMetro] = useState('');
  const [nearestPolice, setNearestPolice] = useState('');
  const [nearestHospital, setNearestHospital] = useState('');
  const [nearestMarket, setNearestMarket] = useState('');

  // Form states
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedRecordInfo, setSavedRecordInfo] = useState<any>(null);

  // Hidden input refs for triggering file selector per angle
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset or initialize when modal opens/closes or property changes
  useEffect(() => {
    if (isOpen) {
      setSubmitAttempted(false);
      setIsSuccess(false);
      setIsSubmitting(false);
      setServerError(null);
      setSavedRecordInfo(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, property]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      angleSlots.forEach(slot => {
        if (slot.previewUrl) {
          URL.revokeObjectURL(slot.previewUrl);
        }
      });
    };
  }, []);

  const handleModalClose = () => {
    setServerError(null);
    onClose();
  };

  /**
   * Landmark input sanitizer:
   * 1. Strips all special characters (only allows alphanumeric A-Z, a-z, 0-9 and whitespace).
   * 2. Enforces maximum 100 characters limit.
   */
  const sanitizeLandmark = (value: string): string => {
    const withoutSpecialChars = value.replace(/[^a-zA-Z0-9\s]/g, '');
    return withoutSpecialChars.slice(0, MAX_LANDMARK_LENGTH);
  };

  /**
   * Block typing of special characters directly at keydown for immediate user feedback
   */
  const handleLandmarkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation and edit shortcut keys
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Only allow alphanumeric keys and space
    if (!/^[a-zA-Z0-9 ]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Process selected file for an angle slot with strict 500 KB limit validation
  const handleFileChange = (slotId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    validateAndAssignFile(slotId, file);
    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRefs.current[slotId]) {
      fileInputRefs.current[slotId]!.value = '';
    }
  };

  const validateAndAssignFile = (slotId: number, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const sizeInKb = Math.round(file.size / 1024);

    // Format validation
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAngleSlots(prev =>
        prev.map(slot =>
          slot.id === slotId
            ? { 
                ...slot, 
                file: null,
                previewUrl: null,
                sizeKb: null,
                error: 'Invalid file format. Only JPG, PNG, and WEBP images are supported.' 
              }
            : slot
        )
      );
      return;
    }

    // 500 KB strict file size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAngleSlots(prev =>
        prev.map(slot =>
          slot.id === slotId
            ? {
                ...slot,
                file: null,
                previewUrl: null,
                sizeKb: null,
                error: `Image exceeds 500 KB limit (${sizeInKb} KB). Maximum allowed size is 500 KB per photo.`
              }
            : slot
        )
      );
      return;
    }

    // Clean up old preview if exists
    const currentSlot = angleSlots.find(s => s.id === slotId);
    if (currentSlot?.previewUrl) {
      URL.revokeObjectURL(currentSlot.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setAngleSlots(prev =>
      prev.map(slot =>
        slot.id === slotId
          ? {
              ...slot,
              file,
              previewUrl,
              sizeKb: sizeInKb,
              error: null
            }
          : slot
      )
    );
  };

  const handleRemovePhoto = (slotId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSlot = angleSlots.find(s => s.id === slotId);
    if (currentSlot?.previewUrl) {
      URL.revokeObjectURL(currentSlot.previewUrl);
    }

    setAngleSlots(prev =>
      prev.map(slot =>
        slot.id === slotId
          ? {
              ...slot,
              file: null,
              previewUrl: null,
              sizeKb: null,
              error: null
            }
          : slot
      )
    );

    if (fileInputRefs.current[slotId]) {
      fileInputRefs.current[slotId]!.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (slotId: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndAssignFile(slotId, file);
    }
  };

  // Calculation of uploaded photos
  const uploadedCount = angleSlots.filter(s => s.file !== null && !s.error).length;
  const isAllPhotosUploaded = uploadedCount === 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setServerError(null);

    // Strict validation: All 5 angle photos must be uploaded and under 500 KB
    if (!isAllPhotosUploaded) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData according to public.PropertyUploadImage schema
      const formData = new FormData();

      // contact_id
      const effectiveContactId = property?.contact_id || authContactId;
      if (effectiveContactId) {
        formData.append('contact_id', String(effectiveContactId));
      }

      // indprop_id (foreign key referencing public.IndividualPropertyDetails)
      const indpropId = 
        property?.indprop_id ?? 
        property?.IndividualPropertyId ?? 
        property?.id ?? 
        property?.PropertyId;
      if (indpropId !== undefined && indpropId !== null && String(indpropId).trim() !== '') {
        formData.append('indprop_id', String(indpropId));
        formData.append('property_id', String(indpropId));
        formData.append('IndividualPropertyId', String(indpropId));
      }
      const propName = property?.Propertyname || property?.propertyname || property?.property_name;
      if (propName) {
        formData.append('Propertyname', propName);
      }

      // 5 Mandatory Angle Photos
      for (const slot of angleSlots) {
        if (!slot.file) {
          throw new Error(`Missing mandatory photo for ${slot.angleName}`);
        }
        formData.append(slot.key, slot.file);
      }

      // 4 Surrounding Landmark Fields (sanitized, alphanumeric and max 100 characters)
      const sanitizedMetro = sanitizeLandmark(nearestMetro).trim();
      const sanitizedPolice = sanitizeLandmark(nearestPolice).trim();
      const sanitizedHospital = sanitizeLandmark(nearestHospital).trim();
      const sanitizedMarket = sanitizeLandmark(nearestMarket).trim();

      if (sanitizedMetro) formData.append('NearestMetroStation', sanitizedMetro);
      if (sanitizedPolice) formData.append('NearestPoliceStation', sanitizedPolice);
      if (sanitizedHospital) formData.append('NearestHospital', sanitizedHospital);
      if (sanitizedMarket) formData.append('NearestShoppingMarket', sanitizedMarket);

      const endpoint = '/api/v1/propertyimageupload';
      const options: RequestInit = {
        method: 'POST',
        body: formData,
        credentials: 'include',
      };

      let res = await fetch(endpoint, options);
      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch(`http://127.0.0.1:5000${endpoint}`, options);
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload property images and landmarks to database.');
      }

      setSavedRecordInfo(data);
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error submitting property images:', err);
      setServerError(err.message || 'An unexpected error occurred while saving property images.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const propTitle = property?.Propertyname || property?.propertyname || property?.property_name || 'Property Listing';
  const propAddress = property?.Propertyaddress || property?.propertyaddress || 'Verified Address';

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/80 bg-gray-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Upload Property Images & Landmarks</h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Accepted Listing
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <span className="font-medium text-gray-300 truncate max-w-[200px] sm:max-w-xs">{propTitle}</span>
                <span>•</span>
                <span className="truncate max-w-[220px] text-gray-400">{propAddress}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-7 scrollbar-thin scrollbar-thumb-gray-800">
          {isSuccess ? (
            /* Success Feedback View */
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">Media & Landmarks Uploaded Successfully!</h4>
              <p className="text-sm text-gray-300 max-w-md mb-4 leading-relaxed">
                All 5 angle photos (strictly under 500KB each) and surrounding landmark stations have been verified and saved to database for <span className="text-emerald-400 font-semibold">{propTitle}</span>.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {savedRecordInfo?.indprop_id && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-medium">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Property ID: #{savedRecordInfo.indprop_id}</span>
                  </div>
                )}
                {savedRecordInfo?.image_id && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>PropertyUploadImage Record ID: #{savedRecordInfo.image_id}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Status: <strong className="font-mono text-white">UploadImagesByUser</strong></span>
                </div>
              </div>

              {/* Uploaded Summary Grid */}
              <div className="w-full max-w-xl p-4 rounded-2xl bg-gray-800/60 border border-gray-700/60 text-left mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-700">
                  <span className="font-semibold text-white">5 Verified Angle Photos Saved</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Ready for Buyers</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {angleSlots.map((slot) => (
                    <div key={slot.id} className="relative aspect-video rounded-lg overflow-hidden border border-gray-700 bg-gray-900 group">
                      {slot.previewUrl && (
                        <img src={slot.previewUrl} alt={slot.angleName} className="h-full w-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[9px] text-white p-1 text-center font-semibold">
                        {slot.sizeKb} KB
                      </div>
                    </div>
                  ))}
                </div>

                {(nearestMetro || nearestPolice || nearestHospital || nearestMarket) && (
                  <div className="pt-2 border-t border-gray-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {nearestMetro && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <TrainFront className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="text-gray-400">Metro:</span>
                        <span className="font-medium text-white truncate">{nearestMetro}</span>
                      </div>
                    )}
                    {nearestPolice && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-gray-400">Police:</span>
                        <span className="font-medium text-white truncate">{nearestPolice}</span>
                      </div>
                    )}
                    {nearestHospital && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span className="text-gray-400">Hospital:</span>
                        <span className="font-medium text-white truncate">{nearestHospital}</span>
                      </div>
                    )}
                    {nearestMarket && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <ShoppingBag className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className="text-gray-400">Market:</span>
                        <span className="font-medium text-white truncate">{nearestMarket}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold transition-all shadow-md cursor-pointer"
              >
                Done & Return to Listings
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Server Error Alert Banner */}
              {serverError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="flex-1 font-medium">{serverError}</span>
                  <button 
                    type="button" 
                    onClick={() => setServerError(null)}
                    className="text-rose-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* SECTION 1: 5 MANDATORY ANGLE PHOTOS */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        1. Mandatory Angle Photos (5 Angles Required)
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Mandatory
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Please upload 5 distinct angle photos. Maximum file size: <span className="text-emerald-400 font-semibold">500 KB per photo</span>.
                    </p>
                  </div>

                  {/* Progress Counter Pill */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs font-semibold">
                      <span className={isAllPhotosUploaded ? 'text-emerald-400' : 'text-amber-400'}>
                        {uploadedCount} / 5
                      </span>
                      <span className="text-gray-400 font-normal">uploaded</span>
                    </div>
                  </div>
                </div>

                {/* Validation Banner if user tried to submit without 5 photos */}
                {submitAttempted && !isAllPhotosUploaded && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>
                      Please upload all 5 photos to continue. You have currently uploaded {uploadedCount} of 5 required angles. All photos must be under 500 KB.
                    </span>
                  </div>
                )}

                {/* 5 Angles Responsive Grid: 1 col on mobile, 2 col on tablet, 3/5 col on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
                  {angleSlots.map((slot) => {
                    const hasFile = slot.file !== null && !slot.error;
                    const hasError = slot.error !== null;

                    return (
                      <div
                        key={slot.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(slot.id, e)}
                        className={`relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                          hasFile
                            ? 'bg-gray-800/80 border-emerald-500/50 shadow-md'
                            : hasError
                            ? 'bg-rose-950/20 border-rose-500/60'
                            : 'bg-gray-850 border-gray-750 hover:border-gray-600 bg-gray-800/40'
                        }`}
                      >
                        {/* Hidden Native File Input */}
                        <input
                          ref={(el) => { fileInputRefs.current[slot.id] = el; }}
                          type="file"
                          onChange={(e) => handleFileChange(slot.id, e)}
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          className="hidden"
                        />

                        {/* Card Top: Angle Label & Status */}
                        <div className="p-3 pb-2 flex items-center justify-between border-b border-gray-700/40">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                              Angle {slot.id} of 5
                            </span>
                            <h5 className="text-xs font-semibold text-white truncate leading-tight">
                              {slot.angleName}
                            </h5>
                          </div>

                          {hasFile ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                              <Check className="h-3 w-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 shrink-0">
                              Required
                            </span>
                          )}
                        </div>

                        {/* Card Middle: Preview or Drag-Drop Area */}
                        <div className="p-3">
                          {hasFile && slot.previewUrl ? (
                            <div className="space-y-2">
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-gray-700 group">
                                <img
                                  src={slot.previewUrl}
                                  alt={slot.angleName}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                                <button
                                  type="button"
                                  onClick={(e) => handleRemovePhoto(slot.id, e)}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
                                  title="Remove photo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                                <span className="truncate max-w-[130px] text-gray-300 font-mono text-[10px]">
                                  {slot.file?.name}
                                </span>
                                <span className="text-emerald-400 font-medium text-[10px]">
                                  {slot.sizeKb} KB (Max 500 KB)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRefs.current[slot.id]?.click()}
                              className="aspect-video rounded-xl border border-dashed border-gray-700 hover:border-emerald-500/60 bg-gray-900/60 hover:bg-gray-800/80 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer group"
                            >
                              <div className="h-9 w-9 rounded-full bg-gray-800 group-hover:bg-emerald-500/20 text-gray-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors mb-2">
                                <UploadCloud className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors">
                                Click or drag photo
                              </p>
                              <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
                                JPG, PNG, WEBP &bull; Max 500 KB
                              </p>
                            </div>
                          )}

                          {/* Slot Specific Error Message (e.g. Size Exceeded 500 KB) */}
                          {hasError && (
                            <div className="mt-2 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-start gap-1.5 text-[11px] text-rose-300 leading-tight">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>{slot.error}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom: Helper note or change button */}
                        <div className="px-3 pb-3 pt-0">
                          {hasFile ? (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[slot.id]?.click()}
                              className="w-full py-1 text-center text-[11px] font-semibold text-gray-300 hover:text-white bg-gray-700/40 hover:bg-gray-700/70 rounded-lg transition-colors cursor-pointer"
                            >
                              Replace Photo
                            </button>
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">
                              {slot.angleDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: SURROUNDING LANDMARKS (OPTIONAL, MAX 100 CHARS, NO SPECIAL CHARS) */}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        2. Surrounding Landmarks & Locality
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                        Optional
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {/* Nearest Metro Station */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <TrainFront className="h-3.5 w-3.5 text-blue-400" />
                        Nearest Metro Station
                      </span>
                      <span className={`text-[10px] font-mono ${nearestMetro.length >= 95 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {nearestMetro.length}/100
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={MAX_LANDMARK_LENGTH}
                        value={nearestMetro}
                        onKeyDown={handleLandmarkKeyDown}
                        onChange={(e) => setNearestMetro(sanitizeLandmark(e.target.value))}
                        placeholder="e.g. Sector 28 Metro Station 1 km"
                        className="w-full rounded-xl bg-gray-800/80 border border-gray-700/80 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nearest Police Station */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                        Nearest Police Station
                      </span>
                      <span className={`text-[10px] font-mono ${nearestPolice.length >= 95 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {nearestPolice.length}/100
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={MAX_LANDMARK_LENGTH}
                        value={nearestPolice}
                        onKeyDown={handleLandmarkKeyDown}
                        onChange={(e) => setNearestPolice(sanitizeLandmark(e.target.value))}
                        placeholder="e.g. Sector 16 Police Station 800 m"
                        className="w-full rounded-xl bg-gray-800/80 border border-gray-700/80 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nearest Hospital */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                        Nearest Hospital
                      </span>
                      <span className={`text-[10px] font-mono ${nearestHospital.length >= 95 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {nearestHospital.length}/100
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={MAX_LANDMARK_LENGTH}
                        value={nearestHospital}
                        onKeyDown={handleLandmarkKeyDown}
                        onChange={(e) => setNearestHospital(sanitizeLandmark(e.target.value))}
                        placeholder="e.g. Metro Heart Institute and Hospital 1 km"
                        className="w-full rounded-xl bg-gray-800/80 border border-gray-700/80 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nearest Shopping Market */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-purple-400" />
                        Nearest Shopping Market
                      </span>
                      <span className={`text-[10px] font-mono ${nearestMarket.length >= 95 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {nearestMarket.length}/100
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={MAX_LANDMARK_LENGTH}
                        value={nearestMarket}
                        onKeyDown={handleLandmarkKeyDown}
                        onChange={(e) => setNearestMarket(sanitizeLandmark(e.target.value))}
                        placeholder="e.g. Sector 15 Main Commercial Market 500 m"
                        className="w-full rounded-xl bg-gray-800/80 border border-gray-700/80 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-gray-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-700 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="w-full sm:w-auto flex items-center gap-3">
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {isAllPhotosUploaded
                      ? 'All 5 mandatory photos ready (< 500 KB each)'
                      : `${5 - uploadedCount} photos remaining`}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                      isAllPhotosUploaded
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 active:scale-95'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Uploading to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Save & Upload Property Media</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

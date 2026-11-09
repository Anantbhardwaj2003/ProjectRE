import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Maximize2, X, CheckCircle2, FileText, Shield, MapPin, Building, Download, Eye, MoveHorizontal, Camera, ExternalLink, TrainFront, HeartPulse, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadPropertyPdf } from '../utils/generatePdf';

const getFullImageUrl = (path?: string, contactId?: number, indpropId?: number): string => {
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

function MapUpdater({ properties }: { properties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    const validCoordinates = properties
      .map(p => p.coordinates)
      .filter((c): c is [number, number] => c !== undefined);

    if (validCoordinates.length > 0) {
      const bounds = L.latLngBounds(validCoordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [properties, map]);
  
  return null;
}

// Create a custom icon using a circular image pin and floating property name badge
const createCustomIcon = (imageUrl: string, propertyName: string) => {
  const escapedName = (propertyName || 'Property')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return L.divIcon({
    className: '', // Empty class removes leaflet's default icon sizing constraints that cause text squishing
    html: `<div style="
             position: relative;
             width: 50px;
             height: 60px;
             transform: translate(-50%, -100%);
             display: flex;
             justify-content: center;
           ">
             <!-- Property Name floating badge -->
             <div style="
               position: absolute;
               top: -26px;
               background-color: white;
               color: #0f172a;
               padding: 3px 8px;
               border-radius: 12px;
               font-weight: 700;
               font-size: 11px;
               box-shadow: 0 2px 5px rgba(0,0,0,0.22);
               white-space: nowrap;
               max-width: 150px;
               overflow: hidden;
               text-overflow: ellipsis;
               border: 1px solid #cbd5e1;
               z-index: 20;
               text-align: center;
             " title="${escapedName}">${escapedName}</div>
             
             <!-- Teardrop shape -->
             <div style="
               position: absolute;
               top: 0;
               left: 3px;
               width: 44px;
               height: 44px;
               background-color: white;
               border-radius: 50% 50% 50% 0;
               transform: rotate(-45deg);
               box-shadow: 0 4px 8px rgba(0,0,0,0.3);
             "></div>
             
             <!-- Image -->
             <img src="${imageUrl}" alt="${escapedName}" style="
               position: absolute;
               top: 4px;
               left: 7px;
               width: 36px;
               height: 36px;
               border-radius: 50%;
               object-fit: cover;
               z-index: 10;
               border: 2px solid white;
               background-color: #f1f5f9;
             " />
           </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface MapComponentProps {
  properties: Property[];
}

export default function MapComponent({ properties }: MapComponentProps) {
  const [enlargedProperty, setEnlargedProperty] = useState<Property | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [show360Gallery, setShow360Gallery] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; label: string } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleContactAgent = () => {
    if (user) {
      alert('Agent contacted successfully! They will reach out to you soon.');
    } else {
      navigate('/login');
    }
  };

  // Center on first valid property coordinate or Delhi NCR default
  const validPropWithCoords = properties.find(p => p.coordinates);
  const center: [number, number] = validPropWithCoords && validPropWithCoords.coordinates
    ? validPropWithCoords.coordinates
    : [28.4089, 77.3178]; 

  // Fallback verified amenities
  const defaultAmenities = ['Verified Title Deed', 'SuperAdmin Whitelisted', '5-Angle Photos Verified', 'Auditor Approved'];

  return (
    <div className="w-full h-full bg-gray-50 z-0 relative">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
      >
        <MapUpdater properties={properties} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {properties.map((property) => {
          if (!property.coordinates) return null;
          
          return (
            <Marker 
              key={property.id} 
              position={property.coordinates}
              icon={createCustomIcon(property.imageUrl, property.title || property.Propertyname || 'Property')}
            >
              <Popup className="property-popup">
                <div className="w-56 p-1 relative group">
                  <button
                    onClick={() => setEnlargedProperty(property)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-md text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white hover:text-black z-10"
                    title="Enlarge details"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <img 
                    src={property.imageUrl} 
                    alt={property.title} 
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                  <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{property.location}, {property.city}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-blue-600">{property.price}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{property.type}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Enlarged Modal Overlay */}
      {enlargedProperty && createPortal(
        <div className="fixed inset-0 z-[1000] bg-white/90 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md max-h-[98%] lg:max-h-[90%] overflow-y-auto overflow-x-hidden hide-scrollbar relative flex flex-col animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setEnlargedProperty(null)}
              className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-700 hover:text-gray-900 hover:bg-white shadow-sm z-10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="w-full h-48 sm:h-56 relative shrink-0">
              <img 
                src={enlargedProperty.imageUrl} 
                alt={enlargedProperty.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-lg">
                  {enlargedProperty.status}
                </span>
              </div>
            </div>

            <div className="w-full p-4 sm:p-5 flex flex-col">
              <p className="text-blue-600 font-bold text-xl mb-0.5">{enlargedProperty.price}</p>
              <h3 className="text-lg font-bold text-gray-900 mb-0.5">{enlargedProperty.title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm mb-4">{enlargedProperty.location}, {enlargedProperty.city}</p>
              
              {(enlargedProperty.areaSqFt || enlargedProperty.bhk || enlargedProperty.bathrooms) ? (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {enlargedProperty.areaSqFt ? (
                    <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Area</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.areaSqFt} <span className="text-[10px] sm:text-xs">sq.ft</span></p>
                    </div>
                  ) : null}
                  {enlargedProperty.bhk ? (
                    <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Beds</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.bhk} <span className="text-[10px] sm:text-xs">BHK</span></p>
                    </div>
                  ) : null}
                  {enlargedProperty.bathrooms ? (
                    <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Baths</p>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.bathrooms}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                  Top Amenities
                </h4>
                <ul className="grid grid-cols-2 gap-y-1.5 gap-x-2">
                  {(enlargedProperty.amenities || defaultAmenities).map((amenity, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-xs text-gray-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {user ? (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 text-xs uppercase tracking-wide flex items-center gap-2">
                    Premium Member Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="text-blue-700">Owner Name</span>
                      <span className="font-medium text-blue-900">{enlargedProperty.contact_name || enlargedProperty.agent || 'Owner on record'}</span>
                    </p>
                    <p className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="text-blue-700">Direct Contact</span>
                      <span className="font-medium text-blue-900">{enlargedProperty.contact_mobile || 'Contact on record'}</span>
                    </p>
                    <p className="flex justify-between items-center">
                      <span className="text-blue-700">Documents</span>
                      <span 
                        onClick={() => setShowDocument(true)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-blue-200 text-xs shadow-sm transition-all hover:border-blue-300"
                        title={enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof || 'Verified Title Deed'}
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[170px]">
                          {enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof || enlargedProperty.ownership_type_name || 'Verified Title Deed'}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">
                    Log in to see owner details and property documents.
                  </p>
                </div>
              )}

              <div className="mt-4 sm:mt-5 pt-4 border-t border-gray-50 flex gap-2">
                {user ? (
                  <>
                    <button 
                      onClick={() => setShow360Gallery(true)}
                      className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-xl py-2.5 sm:py-3 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" /> 360° Tour
                    </button>
                    <button 
                      onClick={handleContactAgent}
                      className="flex-1 bg-black text-white rounded-xl py-2.5 sm:py-3 text-sm font-semibold hover:bg-gray-800 transition-colors shadow-md"
                    >
                      Schedule Visit
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleContactAgent}
                    className="w-full bg-black text-white rounded-xl py-2.5 sm:py-3 text-sm font-semibold hover:bg-gray-800 transition-colors shadow-md"
                  >
                    Contact Agent to View Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detailed Document Modal */}
      {showDocument && enlargedProperty && createPortal(
        <div className="fixed inset-0 z-[2000] bg-gray-900/95 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95%] overflow-y-auto overflow-x-hidden hide-scrollbar relative animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Verified Property Report
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => downloadPropertyPdf(enlargedProperty)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                  title="Download Verified Property Report PDF"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button 
                  onClick={() => setShowDocument(false)}
                  className="p-2 bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row gap-6 mb-8">
                <div className="w-full lg:w-1/2 h-64 lg:h-80 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                  <img src={enlargedProperty.imageUrl} className="w-full h-full object-cover" alt={enlargedProperty.title} />
                </div>
                <div className="w-full lg:w-1/2 flex flex-col justify-center">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 w-max">
                    {enlargedProperty.status}
                  </span>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{enlargedProperty.title}</h3>
                  <p className="text-gray-500 flex items-center gap-2 mb-6">
                    <MapPin className="h-4 w-4" /> {enlargedProperty.location}, {enlargedProperty.city}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Price</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">{enlargedProperty.price}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Property Type</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{enlargedProperty.property_type_name || enlargedProperty.type || 'Residential'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ownership</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{enlargedProperty.ownership_type_name || 'Freehold'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">SuperAdmin Status</p>
                      <p className="text-base sm:text-lg font-bold text-emerald-600">{enlargedProperty.AdminStatus || 'Whitelisted'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {/* 1. Property Specifications (Original Data) */}
                <div>
                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" /> Property Specifications
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Listing ID</span>
                      <span className="font-semibold text-gray-900">#{enlargedProperty.indprop_id || enlargedProperty.id}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Property Name</span>
                      <span className="font-semibold text-gray-900 text-right truncate max-w-[200px]" title={enlargedProperty.Propertyname || enlargedProperty.title}>
                        {enlargedProperty.Propertyname || enlargedProperty.title}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Property Category</span>
                      <span className="font-semibold text-gray-900">{enlargedProperty.property_type_name || enlargedProperty.type || 'Residential'}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Ownership Tenure</span>
                      <span className="font-semibold text-gray-900">{enlargedProperty.ownership_type_name || 'Freehold / Verified Deed'}</span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Deed Proof Document</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-blue-600 truncate max-w-[190px]" title={enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof || 'Verified Title Deed'}>
                          {enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof || 'Verified Title Deed'}
                        </span>
                        {(enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof) && (
                          <a
                            href={getFullImageUrl(enlargedProperty.Ownershipproof || enlargedProperty.ownershipproof, enlargedProperty.contact_id, enlargedProperty.indprop_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
                            title="Open deed document"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Physical Address</span>
                      <span className="font-semibold text-gray-900 text-right truncate max-w-[200px]" title={enlargedProperty.Propertyaddress || enlargedProperty.location}>
                        {enlargedProperty.Propertyaddress || enlargedProperty.location}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">SuperAdmin Decision</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {enlargedProperty.AdminStatus || 'Whitelisted'}
                      </span>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Audit Trail Reason</span>
                      <span className="font-medium text-gray-700 text-right text-xs max-w-[200px] truncate" title={enlargedProperty.Reason}>
                        {enlargedProperty.Reason || 'Fully Verified & Whitelisted by Super Administrator'}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 2. Surrounding Landmarks & Infrastructure (Original Data) */}
                <div>
                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-600" /> Surrounding Landmarks & Infrastructure
                  </h4>
                  <ul className="space-y-3.5">
                    {(() => {
                      const metroVal = enlargedProperty.NearestMetroStation || enlargedProperty.nearestmetrostation || enlargedProperty.nearest_metro_station;
                      const hospitalVal = enlargedProperty.NearestHospital || enlargedProperty.nearesthospital || enlargedProperty.nearest_hospital;
                      const policeVal = enlargedProperty.NearestPoliceStation || enlargedProperty.nearestpolicestation || enlargedProperty.nearest_police_station;
                      const marketVal = enlargedProperty.NearestShoppingMarket || enlargedProperty.nearestshoppingmarket || enlargedProperty.nearest_shopping_market;

                      return (
                        <>
                          <li className="flex gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-blue-50/50">
                            <TrainFront className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Nearest Metro Station</span>
                                {metroVal && (
                                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Verified Transit</span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm truncate">{metroVal || 'Metro Station Nearby on Record'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Verified rapid transit connectivity for this listing</p>
                            </div>
                          </li>

                          <li className="flex gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-rose-50/50">
                            <HeartPulse className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Nearest Hospital</span>
                                {hospitalVal && (
                                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Medical Care</span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm truncate">{hospitalVal || 'Hospital / Healthcare Facility on Record'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Verified emergency medical center nearby</p>
                            </div>
                          </li>

                          <li className="flex gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-amber-50/50">
                            <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Nearest Police Station</span>
                                {policeVal && (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Security Post</span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm truncate">{policeVal || 'Local Police Station on Record'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Law enforcement & neighborhood security post</p>
                            </div>
                          </li>

                          <li className="flex gap-3.5 p-3.5 rounded-xl border border-gray-100 bg-emerald-50/50">
                            <ShoppingBag className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Nearest Shopping Market</span>
                                {marketVal && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Retail Center</span>
                                )}
                              </div>
                              <p className="font-semibold text-gray-900 text-sm truncate">{marketVal || 'Shopping Market on Record'}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Retail market & daily convenience center</p>
                            </div>
                          </li>
                        </>
                      );
                    })()}
                  </ul>
                </div>
              </div>

              {/* 3. 5-Angle Verified Photos (Click to Enlarge) */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5 text-blue-600" /> 5-Angle Verified Property Photos
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verified photographic documentation captured during on-site audit inspection
                    </p>
                  </div>
                  <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    5 Inspection Angles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[
                    {
                      label: 'Front / Exterior Angle',
                      url: enlargedProperty.FrontExteriorAngle || enlargedProperty.frontexteriorangle || enlargedProperty.front_exterior_angle,
                      desc: 'Property facade & approach'
                    },
                    {
                      label: 'Living Room / Main Hall',
                      url: enlargedProperty.LivingRoomMainHall || enlargedProperty.livingroommainhall || enlargedProperty.living_room_main_hall,
                      desc: 'Living area & entrance hall'
                    },
                    {
                      label: 'Master Bedroom Angle',
                      url: enlargedProperty.MasterBedroomAngle || enlargedProperty.masterbedroomangle || enlargedProperty.master_bedroom_angle,
                      desc: 'Primary bedroom & layout'
                    },
                    {
                      label: 'Kitchen & Dining Space',
                      url: enlargedProperty.KitchenDiningSpace || enlargedProperty.kitchendiningspace || enlargedProperty.kitchen_dining_space,
                      desc: 'Kitchen & meal prep area'
                    },
                    {
                      label: 'Balcony / Washroom Angle',
                      url: enlargedProperty.BalconyWashroomAngle || enlargedProperty.balconywashroomangle || enlargedProperty.balcony_washroom_angle,
                      desc: 'Balcony & sanitary fittings'
                    }
                  ].map((angle, idx) => {
                    const fullUrl = getFullImageUrl(angle.url, enlargedProperty.contact_id, enlargedProperty.indprop_id);
                    return (
                      <div key={idx} className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div 
                          className="aspect-video rounded-lg overflow-hidden bg-gray-100 relative group border border-gray-100 mb-2.5 cursor-pointer"
                          onClick={() => fullUrl && setLightboxImage({ url: fullUrl, label: angle.label })}
                        >
                          {fullUrl ? (
                            <>
                              <img 
                                src={fullUrl} 
                                alt={angle.label} 
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  const fallbackUrl = `http://127.0.0.1:5000${angle.url?.startsWith('/') ? '' : '/'}${angle.url}`;
                                  if (e.currentTarget.src !== fallbackUrl) {
                                    e.currentTarget.src = fallbackUrl;
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                                  <Eye className="h-3.5 w-3.5 text-blue-400" />
                                  <span>Click to Enlarge</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 text-xs italic gap-1 p-2">
                              <Camera className="h-6 w-6 text-gray-300" />
                              <span className="text-[11px]">No photo uploaded</span>
                            </div>
                          )}

                          {fullUrl && (
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-black text-white text-[10px] flex items-center gap-1 transition-colors"
                              title="Open full resolution in new tab"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="px-1">
                          <span className="text-xs font-bold text-gray-900 block truncate" title={angle.label}>
                            {angle.label}
                          </span>
                          <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                            {angle.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox Modal for 5-Angle Verified Photos */}
      {lightboxImage && createPortal(
        <div 
          className="fixed inset-0 z-[2500] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-5 right-5 flex items-center gap-3 z-10">
            <a 
              href={lightboxImage.url} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Full Tab
            </a>
            <button 
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="text-center text-white mb-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-bold">{lightboxImage.label}</h3>
            <p className="text-xs text-white/70">{enlargedProperty?.title || 'Verified Property Photo'}</p>
          </div>

          <div className="max-w-4xl max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightboxImage.url} 
              alt={lightboxImage.label} 
              className="w-full h-full object-contain max-h-[75vh]"
            />
          </div>
        </div>,
        document.body
      )}

      {/* 360 Degree Interactive Gallery Modal */}
      {show360Gallery && enlargedProperty && createPortal(
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="absolute top-6 right-6 z-20 flex gap-4">
            <button 
              onClick={() => setShow360Gallery(false)}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center flex flex-col items-center w-full max-w-2xl px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
              {enlargedProperty.title}
            </h2>
            <p className="text-white/80 text-sm md:text-base mt-2 flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" /> {enlargedProperty.location}, {enlargedProperty.city}
            </p>
          </div>

          <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="relative w-full max-w-7xl h-[70vh] sm:h-[80vh] overflow-x-auto hide-scrollbar rounded-3xl select-none shadow-2xl border border-white/10" 
            style={{ scrollSnapType: 'none' }}
          >
            <div className={`w-[200vw] md:w-[150vw] h-full flex items-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
              <img 
                src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=3000&auto=format&fit=crop"
                alt="360 Panorama"
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
            
            <div className="sticky left-1/2 bottom-8 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium flex items-center gap-3 pointer-events-none w-max z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-white/10 animate-bounce">
              <MoveHorizontal className="h-5 w-5 text-blue-400" />
              <span>Drag or scroll horizontally to explore</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

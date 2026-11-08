import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Maximize2, X, CheckCircle2, FileText, Activity, Shield, Phone, MapPin, Building, Download, Eye, MoveHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../types';
import { useAuth } from '../context/AuthContext';

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

  // Placeholder amenities
  const defaultAmenities = ['Swimming Pool', 'Gymnasium', '24/7 Security', 'Power Backup', 'Club House', 'Park'];

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
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Area</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.areaSqFt} <span className="text-[10px] sm:text-xs">sq.ft</span></p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Beds</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.bhk} <span className="text-[10px] sm:text-xs">BHK</span></p>
                </div>
                <div className="bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-100 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 uppercase font-semibold">Baths</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{enlargedProperty.bathrooms}</p>
                </div>
              </div>

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
                        className="font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-blue-200 truncate max-w-[200px]"
                        title={enlargedProperty.Ownershipproof || 'Verified Title Deed'}
                      >
                        <FileText className="h-3 w-3 shrink-0" /> {enlargedProperty.Ownershipproof || 'Verified Title Deed'}
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
                  onClick={() => alert('Downloading Verified Property Report PDF...')}
                  className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button 
                  onClick={() => setShowDocument(false)}
                  className="p-2 bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Price</p>
                      <p className="text-xl font-bold text-blue-600">{enlargedProperty.price}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Configuration</p>
                      <p className="text-xl font-bold text-gray-900">{enlargedProperty.bhk} BHK</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Carpet Area</p>
                      <p className="text-xl font-bold text-gray-900">{enlargedProperty.areaSqFt} sq.ft</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Property Type</p>
                      <p className="text-xl font-bold text-gray-900">{enlargedProperty.type}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-gray-500" /> Property Specifications
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-500">Furnishing</span>
                      <span className="font-medium text-gray-900">Semi-Furnished</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-500">Facing</span>
                      <span className="font-medium text-gray-900">North-East</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-500">Floor</span>
                      <span className="font-medium text-gray-900">8th of 15 Floors</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-500">Age of Property</span>
                      <span className="font-medium text-gray-900">2-5 Years</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-500">Parking</span>
                      <span className="font-medium text-gray-900">2 Covered Slots</span>
                    </li>
                  </ul>

                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3 mt-8 mb-4">
                    Detailed Amenities & Features
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Leisure & Lifestyle</h5>
                      <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">Clubhouse</span>
                            <span className="text-xs text-gray-500">Fully equipped, 5000 sqft</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">Swimming Pool</span>
                            <span className="text-xs text-gray-500">Temperature controlled</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">Gymnasium</span>
                            <span className="text-xs text-gray-500">24/7 Access, Trainer avail.</span>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Security & Convenience</h5>
                      <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">24x7 Security</span>
                            <span className="text-xs text-gray-500">CCTV & Manned patrols</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">Power Backup</span>
                            <span className="text-xs text-gray-500">100% DG Backup</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-medium">Visitor Parking</span>
                            <span className="text-xs text-gray-500">Dedicated basement slots</span>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-red-500" /> Emergency & Neighborhood
                  </h4>
                  <ul className="space-y-6">
                    <li className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-red-50/50">
                      <Activity className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-gray-900 text-base">{enlargedProperty.NearestHospital || 'City Central Hospital'}</p>
                        <p className="text-sm text-gray-600 mb-2">Distance: 1.2 km (5 mins)</p>
                        <div className="flex items-center gap-2 text-sm bg-white border border-red-100 rounded-lg px-3 py-1.5 w-max">
                          <Phone className="h-3.5 w-3.5 text-red-600" />
                          <span className="font-medium text-red-700">+91 99887 76655</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Dr. Rajesh Kumar (Chief Medical Officer)</p>
                      </div>
                    </li>
                    <li className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-blue-50/50">
                      <Shield className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-gray-900 text-base">{enlargedProperty.NearestPoliceStation || 'Local Police Station'}</p>
                        <p className="text-sm text-gray-600 mb-2">Distance: 2.5 km (8 mins)</p>
                        <div className="flex items-center gap-2 text-sm bg-white border border-blue-100 rounded-lg px-3 py-1.5 w-max">
                          <Phone className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-medium text-blue-700">100 / 022-23456789</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Inspector Desai (In-Charge)</p>
                      </div>
                    </li>
                    <li className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-emerald-50/50">
                      <Building className="h-6 w-6 text-emerald-500 shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-gray-900 text-base">Fire Department</p>
                        <p className="text-sm text-gray-600 mb-2">Distance: 3.0 km (10 mins)</p>
                        <div className="flex items-center gap-2 text-sm bg-white border border-emerald-100 rounded-lg px-3 py-1.5 w-max">
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-medium text-emerald-700">101 / 022-98765432</span>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
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

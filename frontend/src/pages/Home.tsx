import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostPropertyModal from '../components/PostPropertyModal';
import { useAuth } from '../context/AuthContext';
import type { Property } from '../types';
import { Search, MapPin, X } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { getCachedGoogleCoordinates, geocodeWithGoogleMaps } from '../services/geocoding';

const PLACEHOLDERS = [
  'Search "Farm house in Punjab below 1 cr"',
  'Search "Flats in Mumbai for rent"',
  'Search "Commercial space in Bangalore"',
  'Search "Villas in Goa with pool"',
  'Search "New launch projects in Noida"'
];

const getFullImageUrl = (path?: string, contactId?: number, indpropId?: number): string => {
  if (!path) return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
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

const mapAndDeduplicateWhitelisted = (items: any[]): Property[] => {
  const map = new Map<string, Property>();

  items.forEach((item, idx) => {
    // Only accept properties whose AdminStatus is Whitelisted
    const adminStatus = (item.AdminStatus || item.adminstatus || item.admin_status || '').trim();
    if (adminStatus.toLowerCase() !== 'whitelisted') {
      return;
    }

    const propId = item.indprop_id ?? item.ind_prop_id ?? item.IndividualPropertyId ?? item.individualpropertyid ?? item.id ?? item.ActionId ?? (idx + 1);
    const address = (item.Propertyaddress || item.propertyaddress || item.property_address || item.address || '').trim() || 'Address on record';
    const cleanAddr = address.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Canonical key to prevent duplicate listings on map
    const dedupeKey = cleanAddr.length > 5 ? `addr_${cleanAddr}` : `prop_${propId}`;

    if (!map.has(dedupeKey)) {
      const rawPropName = (item.Propertyname || item.propertyname || item.property_name || '').trim();
      const typeName = item.property_type_name || item.PropertyType || item.propertytype || 'Residential';
      const propName = rawPropName || (typeName ? `${typeName} #${propId}` : `Property #${propId}`);
      const frontPhoto = item.FrontExteriorAngle || item.frontexteriorangle || item.front_exterior_angle || '';
      const photoUrl = getFullImageUrl(frontPhoto, item.contact_id, propId);

      // Extract city from address
      const parts = address.split(',').map((p: string) => p.trim());
      const city = parts.length > 1 ? parts[parts.length - 1] : 'Delhi NCR';

      const propObj: Property = {
        id: `prop-${propId}`,
        title: propName,
        price: item.Price ? (typeof item.Price === 'number' ? `₹${item.Price.toLocaleString('en-IN')}` : item.Price) : 'Verified Listing',
        priceRaw: typeof item.Price === 'number' ? item.Price : 0,
        location: address,
        city: city,
        bhk: 3,
        bathrooms: 2,
        areaSqFt: 1500,
        type: typeName,
        status: item.Status || 'Accepted_By_PropertyManager',
        AdminStatus: 'Whitelisted',
        Reason: item.Reason || item.reason || 'Verified & Whitelisted by Super Administrator',
        imageUrl: photoUrl,
        isFeatured: true,
        agent: item.contact_name || item.name || 'Verified Property Owner',
        postedAt: 'Recently Live',
        coordinates: getCachedGoogleCoordinates(address),
        amenities: [
          'Verified Title Deed',
          '5-Angle Verified Photos',
          item.NearestMetroStation ? `Metro: ${item.NearestMetroStation}` : 'Metro Station Nearby',
          item.NearestHospital ? `Hospital: ${item.NearestHospital}` : 'Hospital Nearby',
          item.NearestShoppingMarket ? `Market: ${item.NearestShoppingMarket}` : 'Market Nearby',
          item.NearestPoliceStation ? `Police: ${item.NearestPoliceStation}` : 'Police Station Nearby'
        ],
        contact_id: item.contact_id,
        indprop_id: propId,
        Propertyname: propName,
        Propertyaddress: address,
        Ownershipproof: item.Ownershipproof || item.ownershipproof,
        contact_name: item.contact_name,
        contact_mobile: item.contact_mobile,
        FrontExteriorAngle: frontPhoto,
        LivingRoomMainHall: item.LivingRoomMainHall,
        MasterBedroomAngle: item.MasterBedroomAngle,
        KitchenDiningSpace: item.KitchenDiningSpace,
        BalconyWashroomAngle: item.BalconyWashroomAngle,
        NearestMetroStation: item.NearestMetroStation,
        NearestPoliceStation: item.NearestPoliceStation,
        NearestHospital: item.NearestHospital,
        NearestShoppingMarket: item.NearestShoppingMarket,
      };

      map.set(dedupeKey, propObj);
    }
  });

  return Array.from(map.values());
};

export default function Home() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState<boolean>(true);
  const [nearbyResults, setNearbyResults] = useState<{prop: Property, dist: number}[] | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  // Geocodes addresses directly and exclusively using Google Maps Geocoding API
  const geocodePropertiesWithGoogleMaps = async (items: Property[]) => {
    let hasUpdates = false;
    const updated = await Promise.all(
      items.map(async (p) => {
        if (!p.location) return p;
        try {
          const coords = await geocodeWithGoogleMaps(p.location);
          if (coords && (!p.coordinates || p.coordinates[0] !== coords[0] || p.coordinates[1] !== coords[1])) {
            hasUpdates = true;
            return { ...p, coordinates: coords };
          }
        } catch (err) {
          console.error(`[Google Maps] Error geocoding "${p.location}":`, err);
        }
        return p;
      })
    );

    if (hasUpdates) {
      setProperties(updated);
    }
  };

  // Fetch only whitelisted properties via /api/v1/superadminfinalaction
  const fetchWhitelistedProperties = async () => {
    setIsLoadingProperties(true);
    try {
      let res = await fetch('/api/v1/superadminfinalaction?AdminStatus=Whitelisted');
      if (!res.ok && (res.status === 404 || res.status === 502)) {
        res = await fetch('http://127.0.0.1:5000/api/v1/superadminfinalaction?AdminStatus=Whitelisted');
      }

      if (res.ok) {
        const data = await res.json();
        const rawActions: any[] = data.final_actions || data.actions || [];
        const whitelistedList = mapAndDeduplicateWhitelisted(rawActions);
        setProperties(whitelistedList);
        geocodePropertiesWithGoogleMaps(whitelistedList);
      } else {
        // Fallback: fetch without filter and filter client-side
        let fbRes = await fetch('/api/v1/superadminfinalaction');
        if (!fbRes.ok && (fbRes.status === 404 || fbRes.status === 502)) {
          fbRes = await fetch('http://127.0.0.1:5000/api/v1/superadminfinalaction');
        }
        if (fbRes.ok) {
          const data = await fbRes.json();
          const rawActions: any[] = data.final_actions || data.actions || [];
          const whitelistedList = mapAndDeduplicateWhitelisted(rawActions);
          setProperties(whitelistedList);
          geocodePropertiesWithGoogleMaps(whitelistedList);
        }
      }
    } catch (err) {
      console.warn('Could not fetch whitelisted properties from /api/v1/superadminfinalaction:', err);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  useEffect(() => {
    fetchWhitelistedProperties();
  }, []);

  const handleSearchNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    const findNearest = (latitude: number, longitude: number) => {
      // Haversine formula
      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const propertiesWithDistance = properties
        .filter(prop => prop.coordinates)
        .map(prop => ({
          prop,
          dist: getDistance(latitude, longitude, prop.coordinates![0], prop.coordinates![1])
        }));

      // Sort by distance
      propertiesWithDistance.sort((a, b) => a.dist - b.dist);
      
      // Get top 3 nearest properties
      const topNearest = propertiesWithDistance.slice(0, 3);
      setNearbyResults(topNearest);

      if (topNearest.length > 0) {
        setSearchQuery(topNearest[0].prop.title);
      }
    };

    // If we are in the AI Studio preview iframe, geolocation is blocked by browser security.
    if (window !== window.parent) {
      alert("Location access is restricted in this preview window by the browser. Using a simulated location (New Delhi) for demonstration.");
      findNearest(28.6139, 77.2090);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        findNearest(position.coords.latitude, position.coords.longitude);
      }, 
      (error) => {
        console.warn("Geolocation error:", error);
        alert("Unable to retrieve your location. Please ensure location permissions are granted.");
      },
      { timeout: 5000 }
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredProperties = properties.filter(prop => 
    (prop.location || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (prop.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prop.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prop.type || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 selection:bg-gray-200 selection:text-black">
      
      {/* Full Bleed Hero Section */}
      <div className="relative bg-gray-900 pb-16 sm:pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80"
            alt="Real Estate Background"
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/40 to-gray-900/90"></div>
        </div>
        
        <div className="relative z-50">
          <Header onPostPropertyClick={() => setIsPostModalOpen(true)} />
        </div>

        <div className="relative z-10 mx-auto w-full px-4 pt-16 sm:pt-24 flex flex-col items-center text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-md">
            Find your next perfect space.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-200 drop-shadow-sm font-medium">
            {isLoadingProperties 
              ? 'Loading live properties...' 
              : `Showing ${filteredProperties.length} ${filteredProperties.length === 1 ? 'whitelisted property' : 'whitelisted properties'} live on portal`}
          </p>
          
          <div className="mt-8 w-full max-w-6xl relative">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transition-all">
              {/* Tabs Header */}
              <div className="flex items-center justify-between border-b border-gray-100 overflow-x-auto hide-scrollbar px-2 sm:px-4">
                <div className="flex items-center">
                  <button className="px-5 py-4 text-sm font-semibold text-gray-900 border-b-2 border-black whitespace-nowrap">Buy</button>
                  <button className="px-5 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">Rent</button>
                  <button className="px-5 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors relative">
                    New Launch
                    <span className="absolute top-3.5 right-3.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  </button>
                  <button className="px-5 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">Commercial</button>
                  <button className="px-5 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">Plots/Land</button>
                  <button className="px-5 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors">Projects</button>
                </div>
                
                {role !== 'user' && (
                  <div className="hidden md:flex items-center px-4 border-l border-gray-200 ml-2 py-2">
                    <button 
                      type="button"
                      onClick={() => {
                        if (!user) {
                          navigate('/login');
                        } else {
                          setIsPostModalOpen(true);
                        }
                      }}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
                    >
                      Post Property
                      <span className="bg-[#00a65e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FREE</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Search Bar Row */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center w-full p-2.5 gap-2">
                {/* Search Input */}
                <div className="flex-1 flex items-center w-full relative border-b md:border-b-0 border-gray-200 pb-2 md:pb-0">
                  <div className="pl-4">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-0 py-3 pl-3 pr-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out"
                    placeholder={PLACEHOLDERS[placeholderIndex]}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1.5 text-gray-400 hover:text-gray-600 mr-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 px-2 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSearchNearMe}
                      className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 transition-colors group relative cursor-pointer" 
                      aria-label="Search near me"
                      title="Search near me"
                    >
                      <MapPin className="h-5 w-5 text-gray-700 group-hover:text-black transition-colors" />
                      <div className="hidden md:flex pointer-events-none absolute -top-10 right-0 z-20 items-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Search near me</span>
                        <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-gray-900"></div>
                      </div>
                    </button>
                  </div>
                  <button className="ml-2 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-sm transition-colors flex-1 md:flex-none cursor-pointer">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoadingProperties ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-24 text-center mb-8 shadow-sm">
            <div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-semibold text-gray-800">Loading Whitelisted Properties...</p>
            <p className="text-xs text-gray-500 mt-1">Connecting to live executive property feed</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 border-dashed bg-white py-24 text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-2">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">No Whitelisted Properties Found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md">
              {searchQuery 
                ? `No properties matched "${searchQuery}". Try a different location or keyword.`
                : 'There are currently no listings marked as Whitelisted. Properties verified and approved by the Super Administrator will automatically appear here on the map.'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 rounded-md text-sm font-semibold text-black hover:text-gray-700 cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="mb-8 w-full h-[500px] lg:h-[650px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative z-0">
            <MapComponent properties={filteredProperties} />
          </div>
        )}
      </main>

      {/* Nearest Properties Popup */}
      {nearbyResults && nearbyResults.length > 0 && (
        <div className="fixed inset-0 z-[3000] bg-gray-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-900" />
                Properties Near You
              </h3>
              <button 
                onClick={() => setNearbyResults(null)} 
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors group cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
              </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
              {nearbyResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-100" 
                  onClick={() => {
                    setSearchQuery(result.prop.title);
                    setNearbyResults(null);
                  }}
                >
                  <img src={result.prop.imageUrl} alt={result.prop.title} className="w-20 h-20 object-cover rounded-lg shadow-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{result.prop.title}</h4>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{result.prop.location}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{result.prop.price}</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-md shrink-0">
                        {result.dist.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-center">
              <p className="text-xs text-gray-500 font-medium">Click on any property to view it on the map.</p>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Post Property Modal Form */}
      <PostPropertyModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PostPropertyModal from '../components/PostPropertyModal';
import { useAuth } from '../context/AuthContext';
import { PROPERTIES } from '../data';
import { Search, Target, ChevronDown, Mic, MapPin, X } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const PLACEHOLDERS = [
  'Search "Farm house in Punjab below 1 cr"',
  'Search "Flats in Mumbai for rent"',
  'Search "Commercial space in Bangalore"',
  'Search "Villas in Goa with pool"',
  'Search "New launch projects in Noida"'
];

export default function Home() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [nearbyResults, setNearbyResults] = useState<{prop: typeof PROPERTIES[0], dist: number}[] | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

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

      const propertiesWithDistance = PROPERTIES
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
    // We will immediately use a mock location to demonstrate the functionality.
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

  const filteredProperties = PROPERTIES.filter(prop => 
    prop.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
    prop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prop.title.toLowerCase().includes(searchQuery.toLowerCase())
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
            Showing {filteredProperties.length} results matching your criteria
          </p>
          
          <div 
            className="mt-8 w-full max-w-6xl relative"
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all ${isDropdownOpen ? 'rounded-b-none' : ''}`}>
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
              <div className={`flex flex-col md:flex-row items-stretch md:items-center w-full p-2 gap-2 ${isDropdownOpen ? 'border-b border-gray-100' : ''}`}>
                {/* Dropdown Toggle */}
                <div 
                  className="w-full md:w-auto flex items-center justify-between shrink-0 border-b md:border-b-0 md:border-r border-gray-200 px-4 py-3 md:py-2 cursor-pointer md:cursor-default hover:bg-gray-50 rounded-lg md:rounded-none md:hover:bg-transparent transition-colors"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">All Residential</span>
                  <ChevronDown className={`ml-3 h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Search Input */}
                <div className="flex-1 flex items-center w-full relative border-b md:border-b-0 border-gray-200 pb-2 md:pb-0">
                  <div className="pl-4">
                    <Search className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-0 py-3 pl-3 pr-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out"
                    placeholder={PLACEHOLDERS[placeholderIndex]}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 px-2 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSearchNearMe}
                      className="p-2.5 rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors group relative" 
                      aria-label="Search near me"
                    >
                      <Target className="h-5 w-5" />
                      <div className="hidden md:flex pointer-events-none absolute -top-10 right-0 z-20 items-center gap-1.5 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
                        <Target className="h-3.5 w-3.5" />
                        <span>Search near me</span>
                        <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-gray-900"></div>
                      </div>
                    </button>
                    <button className="p-2.5 rounded-full bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors" aria-label="Voice search">
                      <Mic className="h-5 w-5" />
                    </button>
                  </div>
                  <button className="ml-2 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold text-sm shadow-sm transition-colors flex-1 md:flex-none">
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 w-full bg-white rounded-b-2xl shadow-2xl px-6 py-4 animate-in slide-in-from-top-2 fade-in duration-200 text-left z-50 border-t border-gray-100">
                <div className="flex justify-end mb-4">
                  <button className="text-sm font-medium text-black hover:underline">Clear</button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 mb-6">
                  {['Flat/Apartment', 'Residential Land', 'Serviced Apartments'].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </label>
                  ))}
                  {['Builder Floor', '1 RK/ Studio Apartment', 'Other'].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </label>
                  ))}
                  {['Independent House/Villa', 'Farm House'].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </label>
                  ))}
                </div>

                <div className="text-sm text-gray-600 mb-6 border-b border-gray-100 pb-6">
                  Looking for commercial properties ? <a href="#" className="text-black font-medium hover:underline">Click here</a>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {['Budget', 'Bedroom', 'Construction Status', 'Posted By'].map((filter) => (
                    <button key={filter} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      {filter}
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 border-dashed bg-white py-24 text-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria.
            </p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 rounded-md text-sm font-semibold text-black hover:text-gray-700"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 h-auto lg:h-[700px] rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Left side: Background Image + Title */}
            <div className="lg:col-span-4 relative flex flex-col justify-end p-6 lg:p-8 text-white min-h-[220px] lg:min-h-[300px]">
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')" }} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
              <div className="relative z-10">
                <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm mb-3 lg:mb-4">
                  <MapPin className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-1 lg:mb-2">Property Plotting</h2>
                <p className="text-gray-200 font-medium text-xs lg:text-sm">Explore premium locations interactively.</p>
              </div>
            </div>
            
            {/* Right side: Map */}
            <div className="lg:col-span-8 w-full h-[450px] lg:h-full relative z-0">
              <MapComponent properties={filteredProperties.slice(0, 5)} />
            </div>
          </div>
        )}
      </main>

      {/* Beautiful Nearest Properties Popup */}
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
                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors group"
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
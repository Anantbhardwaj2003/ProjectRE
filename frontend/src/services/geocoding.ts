/**
 * Exclusively uses Google Maps Geocoding API to resolve exact GPS coordinates.
 */

const CACHE_KEY = 'estatesync_google_geocache_v1';

// In-memory cache for fast lookups
const memoryCache = new Map<string, [number, number]>();

export const getNormalizedKey = (address?: string): string => {
  return (address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const getCachedGoogleCoordinates = (address?: string): [number, number] | undefined => {
  const normKey = getNormalizedKey(address);
  if (!normKey) return undefined;
  if (memoryCache.has(normKey)) {
    return memoryCache.get(normKey);
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed[normKey]) && parsed[normKey].length === 2) {
        const coords: [number, number] = [parsed[normKey][0], parsed[normKey][1]];
        memoryCache.set(normKey, coords);
        return coords;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return undefined;
};

export const saveGoogleCoordinatesToCache = (address: string, coords: [number, number]) => {
  const normKey = getNormalizedKey(address);
  if (!normKey) return;
  memoryCache.set(normKey, coords);
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[normKey] = coords;
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Geocodes an address EXCLUSIVELY through Google Maps Geocoding API.
 */
export const geocodeWithGoogleMaps = async (address: string): Promise<[number, number] | null> => {
  const cleanAddr = (address || '').trim();
  if (!cleanAddr) return null;

  const cached = getCachedGoogleCoordinates(cleanAddr);
  if (cached) return cached;

  // 1. Primary: Use backend /api/v1/geocode proxy (uses backend's GOOGLE_MAPS_PLATFORM_KEY without browser CORS issues)
  try {
    let res = await fetch(`/api/v1/geocode?address=${encodeURIComponent(cleanAddr)}`);
    if (!res.ok && (res.status === 404 || res.status === 502)) {
      res = await fetch(`http://127.0.0.1:5000/api/v1/geocode?address=${encodeURIComponent(cleanAddr)}`);
    }

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.lat === 'number' && typeof data.lon === 'number') {
        const coords: [number, number] = [data.lat, data.lon];
        saveGoogleCoordinatesToCache(cleanAddr, coords);
        return coords;
      }
    }
  } catch (err) {
    console.warn('[Geocoding] Backend /api/v1/geocode unreachable, attempting direct Google Maps call:', err);
  }

  // 2. Direct client query to Google Maps Geocoding API if key is present in client environment
  const apiKey = (
    import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || 
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
    import.meta.env.GOOGLE_MAPS_PLATFORM_KEY || ''
  ).trim().replace(/^['"]|['"]$/g, '');

  if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddr)}&key=${apiKey}`;
      const res = await fetch(gUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          const coords: [number, number] = [parseFloat(loc.lat), parseFloat(loc.lng)];
          saveGoogleCoordinatesToCache(cleanAddr, coords);
          return coords;
        }
      }
    } catch (err) {
      console.error('[Geocoding] Direct Google Maps Geocoding API call error:', err);
    }
  }

  return null;
};

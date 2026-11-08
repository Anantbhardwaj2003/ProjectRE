import os
import json
import re
import urllib.request
import urllib.parse
from flask import request
from flask_restful import Resource

def get_google_maps_api_key():
    """Retrieve Google Maps API Key from environment or env configuration files."""
    # 1. Check OS environment variables
    for env_var in ['GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_PLATFORM_KEY', 'VITE_GOOGLE_MAPS_PLATFORM_KEY', 'VITE_GOOGLE_MAPS_API_KEY']:
        val = os.getenv(env_var, '')
        if val:
            cleaned = val.strip().strip("'\"")
            if cleaned and cleaned != 'your_google_maps_api_key_here':
                return cleaned

    # 2. Check backend/app.env file if not present in os.environ
    app_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'app.env')
    if os.path.isfile(app_env_path):
        try:
            with open(app_env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('#') or '=' not in line:
                        continue
                    k, v = line.split('=', 1)
                    k = k.strip()
                    if k in ['GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_PLATFORM_KEY']:
                        v = v.strip().strip("'\"")
                        if v and v != 'your_google_maps_api_key_here':
                            return v
        except Exception:
            pass

    # 3. Check frontend/.env file
    frontend_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'frontend', '.env')
    if os.path.isfile(frontend_env_path):
        try:
            with open(frontend_env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('#') or '=' not in line:
                        continue
                    k, v = line.split('=', 1)
                    k = k.strip()
                    if k in ['GOOGLE_MAPS_PLATFORM_KEY', 'GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_PLATFORM_KEY']:
                        v = v.strip().strip("'\"")
                        if v and v != 'your_google_maps_api_key_here':
                            return v
        except Exception:
            pass

    return ''

class GeocodeAddress(Resource):
    def options(self):
        return {}, 200

    def get(self):
        address = (request.args.get('address') or '').strip()
        if not address:
            return {'error': 'Address parameter is required'}, 400

        google_key = get_google_maps_api_key()
        if not google_key:
            return {
                'error': 'Google Maps API Key is not configured. Please set GOOGLE_MAPS_PLATFORM_KEY or GOOGLE_MAPS_API_KEY in your environment.'
            }, 500

        # Prepare search variants for Google Maps Geocoding
        # 1. Exact address
        # 2. Address without unit / house prefixes if exact fails
        # 3. Cleaned spaces/dashes
        clean_addr = re.sub(r'[\r\n\t]+', ' ', address).strip()
        variants = [clean_addr]

        stripped = re.sub(r'^(?:house|flat|plot|khasra|villa|unit|shop)\s*(?:no\.?|number)?\s*[\w\-\/]+[\s,]*', '', clean_addr, flags=re.IGNORECASE).strip()
        if stripped and stripped not in variants:
            variants.append(stripped)

        cleaned_spaces = re.sub(r'(\w+)-(\w+)', r'\1 \2', clean_addr)
        if cleaned_spaces not in variants:
            variants.append(cleaned_spaces)

        last_error = None

        # Exclusively query Google Maps Geocoding API
        for query in variants:
            try:
                g_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={urllib.parse.quote(query)}&key={google_key}"
                req = urllib.request.Request(g_url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EstateSyncApp/1.0'
                })
                with urllib.request.urlopen(req, timeout=6) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    status = res_data.get('status')
                    
                    if status == 'OK' and res_data.get('results'):
                        first = res_data['results'][0]
                        loc = first['geometry']['location']
                        lat = float(loc['lat'])
                        lng = float(loc['lng'])
                        formatted_address = first.get('formatted_address', query)
                        
                        return {
                            'status': 'success',
                            'source': 'google_maps',
                            'address': address,
                            'query_matched': query,
                            'lat': lat,
                            'lon': lng,
                            'display_name': formatted_address
                        }, 200
                    
                    elif status == 'ZERO_RESULTS':
                        last_error = 'ZERO_RESULTS'
                        continue
                    else:
                        error_msg = res_data.get('error_message') or status
                        last_error = f"Google Maps API error: {error_msg}"
                        # If invalid key or billing issue, stop retrying variants
                        if status in ['REQUEST_DENIED', 'OVER_QUERY_LIMIT']:
                            break
            except Exception as e:
                last_error = str(e)
                continue

        return {
            'error': last_error or 'Location could not be found via Google Maps Geocoding API',
            'address': address,
            'source': 'google_maps'
        }, 404

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';
import { apiFetch } from '../api/client';
import { GeocodeSuggestion } from '../types';

// Fix Leaflet's default icon path in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationPickerProps {
  locationText: string;
  lat: number | null;
  lng: number | null;
  radiusKm?: number;
  onChange: (data: { locationText: string; lat: number; lng: number }) => void;
  label?: string;
  placeholder?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  locationText,
  lat,
  lng,
  radiusKm,
  onChange,
  label = 'Select Location',
  placeholder = 'Type an address or search area...',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [searchQuery, setSearchQuery] = useState(locationText || '');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Default coordinate if none provided (e.g., Central India / Bengaluru center 12.9716, 77.5946)
  const defaultLat = lat || 12.9716;
  const defaultLng = lng || 77.5946;

  // Sync searchQuery with external locationText prop
  useEffect(() => {
    if (locationText && locationText !== searchQuery) {
      setSearchQuery(locationText);
    }
  }, [locationText]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: lat && lng ? 14 : 11,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add draggable marker
      const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Add radius circle if radiusKm is provided
      if (radiusKm && radiusKm > 0) {
        const circle = L.circle([defaultLat, defaultLng], {
          radius: radiusKm * 1000,
          color: '#6366f1',
          fillColor: '#818cf8',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);
        circleRef.current = circle;
      }

      // Drag event to reverse geocode
      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        handleReverseGeocode(position.lat, position.lng);
      });

      // Map click to move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        if (circleRef.current) {
          circleRef.current.setLatLng(e.latlng);
        }
        handleReverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker position & radius when props change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 14);

      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        if (radiusKm) {
          circleRef.current.setRadius(radiusKm * 1000);
        }
      }
    }
  }, [lat, lng, radiusKm]);

  const handleReverseGeocode = async (newLat: number, newLng: number) => {
    setStatusMessage('Fetching address...');
    try {
      const data = await apiFetch<GeocodeSuggestion>(`/geocode/reverse?lat=${newLat}&lng=${newLng}`);
      if (data && data.formatted) {
        setSearchQuery(data.formatted);
        onChange({
          locationText: data.formatted,
          lat: newLat,
          lng: newLng,
        });
        setStatusMessage(null);
      }
    } catch {
      setStatusMessage('Approximate coordinates recorded');
      onChange({
        locationText: `Location (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`,
        lat: newLat,
        lng: newLng,
      });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout(debounceTimerRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await apiFetch<GeocodeSuggestion[]>(`/geocode/search?q=${encodeURIComponent(val)}`);
        setSuggestions(results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const selectSuggestion = (s: GeocodeSuggestion) => {
    setSearchQuery(s.formatted);
    setSuggestions([]);
    onChange({
      locationText: s.formatted,
      lat: s.lat,
      lng: s.lng,
    });

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([s.lat, s.lng]);
      mapInstanceRef.current.setView([s.lat, s.lng], 14);
      if (circleRef.current) {
        circleRef.current.setLatLng([s.lat, s.lng]);
      }
    }
  };

  const useBrowserLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeolocating(true);
    setStatusMessage('Locating your position...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsGeolocating(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([userLat, userLng]);
          mapInstanceRef.current.setView([userLat, userLng], 14);
          if (circleRef.current) {
            circleRef.current.setLatLng([userLat, userLng]);
          }
        }

        await handleReverseGeocode(userLat, userLng);
      },
      (err) => {
        setIsGeolocating(false);
        setStatusMessage('Location access denied or unavailable. Please search manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
        <button
          type="button"
          onClick={useBrowserLocation}
          disabled={isGeolocating}
          className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center space-x-1 transition-colors disabled:opacity-50"
        >
          {isGeolocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          <span>Use My Location</span>
        </button>
      </div>

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-brand-500 absolute right-3 animate-spin pointer-events-none" />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
            {suggestions.map((s, idx) => (
              <li
                key={idx}
                onClick={() => selectSuggestion(s)}
                className="px-3.5 py-2.5 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-900 cursor-pointer transition-colors flex items-start space-x-2"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block text-slate-900">{s.name}</span>
                  <span className="text-slate-500 line-clamp-1">{s.formatted}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {statusMessage && (
        <p className="text-xs text-amber-600 font-medium">{statusMessage}</p>
      )}

      {/* Interactive Map Preview */}
      <div className="relative h-56 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute bottom-2 right-2 z-[400] bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-slate-600 shadow-sm border border-slate-200 pointer-events-none">
          Drag pin or click map to reposition
        </div>
      </div>
    </div>
  );
};

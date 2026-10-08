import React from 'react';
import { ExternalLink, Navigation } from 'lucide-react';

interface DirectionsLinkProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  locationText?: string;
}

export const DirectionsLink: React.FC<DirectionsLinkProps> = ({ lat, lng, locationText }) => {
  if (!lat || !lng) {
    return (
      <span className="text-xs text-slate-400 italic">
        Directions unavailable (no coordinates)
      </span>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="flex items-center space-x-2 text-xs">
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-1 text-brand-600 hover:text-brand-800 font-medium hover:underline"
      >
        <Navigation className="w-3.5 h-3.5" />
        <span>Get directions</span>
      </a>
      <span className="text-slate-300">|</span>
      <a
        href={osmUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-700 hover:underline"
      >
        <ExternalLink className="w-3 h-3" />
        <span>Open in OSM</span>
      </a>
    </div>
  );
};

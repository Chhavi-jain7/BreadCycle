'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface MapPinItem {
  id: string;
  title: string;
  category: string;
  remainingQuantity: number;
  unit: string;
  latitude: number;
  longitude: number;
  pickupAddress: string;
  restaurantName?: string;
  safetyStatus: string;
}

interface MapDiscoveryProps {
  donations: MapPinItem[];
  onSelectDonation?: (donationId: string) => void;
}

export default function MapDiscovery({ donations, onSelectDonation }: MapDiscoveryProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically require Leaflet
    const L = require('leaflet');

    // Fix default marker icon issues in Next.js bundlers
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Default center (New Delhi downtown where demo restaurants and shelters are located)
    const defaultCenter = [28.6139, 77.2090];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Custom Icon Generator
    const createCustomIcon = (category: string, safetyStatus: string) => {
      const isBlocked = safetyStatus === 'BLOCKED';
      const color = isBlocked ? '#e11d48' : '#164e3f';
      const iconChar = category === 'BAKERY' ? '🥖' : category === 'COOKED_MEALS' ? '🍲' : '📦';
      
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            background-color: ${color};
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            border: 2px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${iconChar}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34],
      });
    };

    // Add donation markers
    const validDonations = donations.filter((d) => d.latitude && d.longitude);

    validDonations.forEach((d) => {
      const marker = L.marker([d.latitude, d.longitude], {
        icon: createCustomIcon(d.category, d.safetyStatus),
      }).addTo(map);

      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-size: 10px; font-weight: bold; color: #164e3f; text-transform: uppercase;">
            ${d.category} • ${d.safetyStatus}
          </div>
          <div style="font-size: 13px; font-weight: bold; color: #1c1917; margin-top: 2px;">
            ${d.title}
          </div>
          <div style="font-size: 11px; color: #78716c; margin-top: 2px;">
            ${d.pickupAddress}
          </div>
          <div style="margin-top: 6px; font-size: 12px; font-weight: bold; color: #b45309;">
            ${d.remainingQuantity} ${d.unit} available
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectDonation) onSelectDonation(d.id);
      });
    });

    // Approximate Privacy Protected Radius Circles for Shelters (Privacy Guarantee from Section 9)
    L.circle([28.5682, 77.2435], {
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.1,
      radius: 800,
    })
      .bindTooltip('Verified Shelter Catchment Area (Address Protected)', { permanent: false })
      .addTo(map);

    if (validDonations.length > 0) {
      const bounds = L.latLngBounds(validDonations.map((d) => [d.latitude, d.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      // Map cleanup if needed on unmount
    };
  }, [donations, onSelectDonation]);

  return (
    <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#e4d6c1] shadow-inner relative bg-stone-100">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-stone-200 text-[10px] text-stone-600 shadow-sm flex items-center gap-3">
        <span className="flex items-center gap-1 font-semibold text-forest-900">
          <span className="w-2.5 h-2.5 rounded-full bg-forest-900 inline-block" /> Surplus Kitchen
        </span>
        <span className="flex items-center gap-1 font-semibold text-emerald-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Community Shelter Zone
        </span>
        <span className="text-stone-400">OpenStreetMap</span>
      </div>
    </div>
  );
}

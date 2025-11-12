// MapView Component - Google Maps integration for displaying destinations
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, DollarSign, Star } from 'lucide-react';

interface Destination {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  visit_duration?: number; // minutes
  estimated_cost?: number;
  place_types?: string[];
  place_type?: 'tourist_attraction' | 'lodging' | 'restaurant';
  photos?: string[];
  visit_date?: number; // Add visit_date field
}

interface MapViewProps {
  destinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  selectedDay?: number; // Add selectedDay prop
}

const MapView = ({ 
  destinations, 
  onDestinationClick, 
  onMapClick,
  height = '500px',
  selectedDay // Add selectedDay parameter
}: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [ready, setReady] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Fallback เมื่อไม่มี key
  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Map View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
            <div className="text-center text-gray-500">
              <MapPin className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Map View</p>
              <p className="text-sm">Google Maps API key not configured</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Destinations:</p>
                {destinations.map((dest, i) => (
                  <div key={dest.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{dest.name}</p>
                      <p className="text-xs text-gray-500">{dest.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="h-3 w-3" />
                      <span>{dest.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey || !mapContainer.current) return;

    const initializeMap = () => {
      if (!mapContainer.current || mapRef.current) return;

      try {
        const map = new google.maps.Map(mapContainer.current, {
          center: { lat: 13.7563, lng: 100.5018 }, // Bangkok center
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        mapRef.current = map;
        setReady(true);

        // Add click listener for map
        if (onMapClick) {
          map.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              onMapClick(event.latLng.lat(), event.latLng.lng());
            }
          });
        }

        // Create InfoWindow
        infoRef.current = new google.maps.InfoWindow();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.MapTypeId) {
      initializeMap();
    } else {
      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=th&region=TH&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Wait for Google Maps to be fully loaded
        const checkGoogleMaps = () => {
          if (window.google && window.google.maps && window.google.maps.MapTypeId) {
            initializeMap();
          } else {
            // Retry after 100ms if not ready
            setTimeout(checkGoogleMaps, 100);
          }
        };
        checkGoogleMaps();
      };
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      infoRef.current?.close();
      infoRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, onMapClick]);

  // Update markers when destinations change
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (destinations.length === 0) return;

    // Filter destinations by selectedDay if specified
    const filteredDestinations = selectedDay 
      ? destinations.filter(dest => dest.visit_date === selectedDay)
      : destinations;

    console.log(`🗺️ MapView: Showing ${filteredDestinations.length} destinations for day ${selectedDay || 'all'}`);

    // Create markers for each destination
    filteredDestinations.forEach((destination, index) => {
      // Skip destinations without valid coordinates (strict check for null/undefined/0)
      if (destination.latitude === null || destination.latitude === undefined || destination.latitude === 0 ||
          destination.longitude === null || destination.longitude === undefined || destination.longitude === 0) {
        console.warn(`⚠️ Skipping destination "${destination.name}" - missing coordinates (lat: ${destination.latitude}, lng: ${destination.longitude})`);
        return;
      }

      const marker = new google.maps.Marker({
        position: { 
          lat: destination.latitude, 
          lng: destination.longitude 
        },
        map: mapRef.current!,
        title: destination.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      });

      // Add click listener for marker
      marker.addListener('click', () => {
        if (!infoRef.current) return;
        
        const html = `
          <div class="p-4 max-w-xs">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                ${index + 1}
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-sm mb-1 text-gray-900">${destination.name}</h3>
                <p class="text-xs text-gray-600 mb-3 line-clamp-2">${destination.description || 'ไม่มีคำอธิบาย'}</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-xs">
                    ${destination.rating ? `
                    <div class="flex items-center gap-1">
                      <span class="text-yellow-500">★</span>
                      <span class="font-medium">${destination.rating}</span>
                    </div>
                    ` : ''}
                    ${destination.visit_duration ? `
                    <div class="flex items-center gap-1">
                      <span class="text-blue-500">⏱</span>
                      <span>${destination.visit_duration} นาที</span>
                    </div>
                    ` : ''}
                    ${destination.estimated_cost ? `
                    <div class="flex items-center gap-1">
                      <span class="text-green-500">฿</span>
                      <span>${destination.estimated_cost.toLocaleString()}</span>
                    </div>
                    ` : ''}
                  </div>
                  ${destination.place_type ? `
                    <div class="flex flex-wrap gap-1">
                      <span class="px-2 py-1 ${destination.place_type === 'lodging' ? 'bg-blue-100 text-blue-600' : 
                                                      destination.place_type === 'restaurant' ? 'bg-red-100 text-red-600' : 
                                                      'bg-gray-100 text-gray-600'} rounded text-xs">
                        ${destination.place_type === 'lodging' ? '🏨 ที่พัก' :
                          destination.place_type === 'restaurant' ? '🍽️ ร้านอาหาร' :
                          destination.place_type === 'tourist_attraction' ? '🏛️ ที่เที่ยว' : destination.place_type}
                      </span>
                    </div>
                  ` : ''}
                  ${destination.place_types && destination.place_types.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mt-1">
                      ${destination.place_types.slice(0, 2).map(type => `
                        <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">${type.replace('_', ' ')}</span>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
        
        infoRef.current.setContent(html);
        infoRef.current.open(mapRef.current!, marker);
        onDestinationClick?.(destination);
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (markersRef.current.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      mapRef.current!.fitBounds(bounds);
    } else if (markersRef.current.length === 1) {
      mapRef.current!.setCenter(markersRef.current[0].getPosition()!);
      mapRef.current!.setZoom(14);
    }
  }, [destinations, selectedDay, ready, onDestinationClick]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Map View
        </CardTitle>
        {destinations.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{destinations.length} สถานที่</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(destinations.reduce((sum, dest) => sum + (dest.visit_duration || 0), 0) / 60)} ชั่วโมง</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>฿{destinations.reduce((sum, dest) => sum + (dest.estimated_cost || 0), 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapContainer} className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  );
};

export default MapView;
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search } from 'lucide-react';

interface GeofenceLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (latitude: number, longitude: number) => void;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export const GeofenceLocationPicker: React.FC<GeofenceLocationPickerProps> = ({
  latitude,
  longitude,
  onLocationSelect
}) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');

  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current).setView([latitude, longitude], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.circleMarker([latitude, longitude], {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#007a5e',
      fillOpacity: 1
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      onLocationSelectRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const point: L.LatLngExpression = [latitude, longitude];
    markerRef.current?.setLatLng(point);
    mapRef.current?.panTo(point);
  }, [latitude, longitude]);

  const searchPlace = async () => {
    const query = searchText.trim();
    if (!query) return;

    setSearching(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: query });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Place search is temporarily unavailable.');

      const results = await response.json() as SearchResult[];
      const result = results[0];
      if (!result) {
        setMessage('No matching place found. Try a nearby landmark or tap the map.');
        return;
      }

      const nextLatitude = Number(result.lat);
      const nextLongitude = Number(result.lon);
      onLocationSelectRef.current(nextLatitude, nextLongitude);
      mapRef.current?.setView([nextLatitude, nextLongitude], 18);
      setMessage(result.display_name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Place search failed. Tap the map to choose the location.');
    } finally {
      setSearching(false);
    }
  };

  const useCurrentLocation = () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('This browser does not support location services. Search for the building or tap the map.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        onLocationSelectRef.current(nextLatitude, nextLongitude);
        mapRef.current?.setView([nextLatitude, nextLongitude], 18);
        setMessage(`Device location selected; estimated accuracy is ±${Math.round(position.coords.accuracy)} m. Check the pin before saving.`);
      },
      () => setMessage('Could not read this device location. Search for the building or tap the map.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <input
          type="search"
          className="form-input"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void searchPlace();
            }
          }}
          placeholder="Search building, address, or landmark"
          aria-label="Search for the attendance venue"
          style={{ flex: '1 1 240px' }}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void searchPlace()} disabled={searching}>
          <Search size={14} /> {searching ? 'Searching...' : 'Search'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={useCurrentLocation}>
          <LocateFixed size={14} /> Use Current Location
        </button>
      </div>

      <div
        ref={mapElementRef}
        aria-label="Map for selecting the attendance building location"
        style={{ height: '320px', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', zIndex: 0 }}
      />

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.55rem 0 0' }}>
        Click or tap the map to place the pin. Selected coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}.
      </p>
      {message && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }} role="status">
          {message}
        </p>
      )}
    </div>
  );
};
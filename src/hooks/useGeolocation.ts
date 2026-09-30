import { useState, useEffect, useCallback } from 'react';
import { GeoLocationState } from '../types';
import { DEFAULT_IT_DEPT_GEO, calculateDistanceMeters } from '../utils/haversine';

export interface GeofenceCenter {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  buildingName: string;
}

const FALLBACK_CENTER: GeofenceCenter = {
  latitude: DEFAULT_IT_DEPT_GEO.latitude,
  longitude: DEFAULT_IT_DEPT_GEO.longitude,
  radiusMeters: DEFAULT_IT_DEPT_GEO.radiusMeters,
  buildingName: DEFAULT_IT_DEPT_GEO.buildingName
};

export function useGeolocation(center: GeofenceCenter = FALLBACK_CENTER, enabled = true) {
  const [geoState, setGeoState] = useState<GeoLocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true
  });

  const [simulatedLocation, setSimulatedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getPosition = useCallback(() => {
    setGeoState(prev => ({ ...prev, loading: true, error: null }));

    if (simulatedLocation) {
      setGeoState({
        latitude: simulatedLocation.lat,
        longitude: simulatedLocation.lng,
        accuracy: 5,
        error: null,
        loading: false
      });
      return;
    }

    if (!navigator.geolocation) {
      setGeoState({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: 'Geolocation API is not supported by your browser.',
        loading: false
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false
        });
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Geolocation permission was denied. Please allow location access in browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Enable location services to check in.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again in an open area.';
        }
        setGeoState({
          latitude: null,
          longitude: null,
          accuracy: null,
          error: msg,
          loading: false
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [simulatedLocation]);

  useEffect(() => {
    if (!enabled) return;
    getPosition();
  }, [getPosition, enabled]);

  // Distance from the department centre. Stays null when there is no real fix:
  // falling back to the centre coordinates would report "0m away" for a user
  // whose location was denied, which is the opposite of what happened.
  const distanceFromDept =
    geoState.latitude !== null && geoState.longitude !== null
      ? calculateDistanceMeters(
          geoState.latitude,
          geoState.longitude,
          center.latitude,
          center.longitude
        )
      : null;

  return {
    ...geoState,
    center,
    refreshLocation: getPosition,
    distanceFromDept,
    simulatedLocation,
    setSimulatedLocation,
    simulateInsideDept: () => {
      setSimulatedLocation({ lat: center.latitude, lng: center.longitude });
    },
    simulateOutsideDept: () => {
      setSimulatedLocation({ lat: center.latitude + 0.0025, lng: center.longitude + 0.0025 });
    },
    resetSimulation: () => {
      setSimulatedLocation(null);
    }
  };
}

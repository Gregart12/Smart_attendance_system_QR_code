import { useEffect, useState } from 'react';
import { SystemSettings } from '../types';
import {
  DEFAULT_SYSTEM_SETTINGS,
  getSystemSettings,
  subscribeToSystemSettings
} from '../firebase/services';
import { GeofenceCenter } from './useGeolocation';
import { DEFAULT_IT_DEPT_GEO } from '../utils/haversine';

export function toGeofenceCenter(settings: SystemSettings): GeofenceCenter {
  return {
    latitude: Number.isFinite(settings.defaultLat) ? settings.defaultLat : DEFAULT_IT_DEPT_GEO.latitude,
    longitude: Number.isFinite(settings.defaultLng) ? settings.defaultLng : DEFAULT_IT_DEPT_GEO.longitude,
    radiusMeters: Number.isFinite(settings.defaultRadius) ? settings.defaultRadius : DEFAULT_IT_DEPT_GEO.radiusMeters,
    buildingName: settings.buildingName || DEFAULT_IT_DEPT_GEO.buildingName
  };
}

/**
 * Live system settings, so the geofence configured in Admin Settings is the
 * geofence the scanner and GPS banner actually enforce.
 */
export function useSystemSettings(): { settings: SystemSettings; center: GeofenceCenter } {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    let active = true;

    void getSystemSettings().then((loaded) => {
      if (active) setSettings(loaded);
    });

    const unsubscribe = subscribeToSystemSettings((live) => {
      if (active) setSettings(live);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { settings, center: toGeofenceCenter(settings) };
}

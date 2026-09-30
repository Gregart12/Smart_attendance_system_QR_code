/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @returns Distance in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371000; // Earth's radius in meters
  const rad = Math.PI / 180;
  
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp: floating-point error can push `a` marginally outside [0, 1] for
  // near-antipodal points, which would make sqrt(1 - a) -> NaN.
  const safeA = Math.min(1, Math.max(0, a));

  const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));

  return R * c;
}

/**
 * Checks if staff coordinates are within the allowed geofence radius of the department
 */
export function isWithinGeofence(
  staffLat: number,
  staffLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): { isInside: boolean; distanceMeters: number } {
  // Compare against the unrounded distance so a member at 100.4m with a 100m
  // radius is correctly rejected, then round only for display.
  const rawDistance = calculateDistanceMeters(staffLat, staffLng, targetLat, targetLng);
  return {
    isInside: rawDistance <= radiusMeters,
    distanceMeters: Math.round(rawDistance)
  };
}

// Default Department of Information Technology Coordinates
export const DEFAULT_IT_DEPT_GEO = {
  latitude: 5.0321,
  longitude: 7.9123,
  radiusMeters: 100,
  buildingName: 'Department of Information Technology Building'
};

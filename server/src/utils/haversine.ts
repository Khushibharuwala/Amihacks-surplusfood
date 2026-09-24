/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // 2 decimal places
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates travel time in minutes based on distance in kilometers
 * Assuming average urban transit speed of 30 km/h + 5 min loading buffer
 */
export function estimateTravelTimeMinutes(distanceKm: number): number {
  const avgSpeedKmH = 30;
  const travelHours = distanceKm / avgSpeedKmH;
  const travelMinutes = travelHours * 60;
  const loadingBufferMinutes = 5;
  return Math.ceil(travelMinutes + loadingBufferMinutes);
}

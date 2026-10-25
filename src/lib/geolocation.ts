export type Coords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export const GPS_DENIED_MESSAGE =
  "Location permission denied. Enable location permission to include your current location.";

export function getCurrentCoords(timeoutMs = 12000): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          timestamp: pos.timestamp,
        }),
      (err) => {
        reject(new Error(err.code === err.PERMISSION_DENIED ? GPS_DENIED_MESSAGE : err.message));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

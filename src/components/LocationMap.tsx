import { useEffect, useRef } from "react";
import L from "leaflet";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  meta?: string;
  emergency?: boolean;
};

export default function LocationMap({
  points,
  height = 320,
  zoom = 14,
}: {
  points: MapPoint[];
  height?: number;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
      [20.5937, 78.9629],
      4,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (points.length === 0) return;

    points.forEach((p) => {
      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: 10,
        color: p.emergency ? "#D32F2F" : "#E91E63",
        fillColor: p.emergency ? "#D32F2F" : "#E91E63",
        fillOpacity: 0.75,
        weight: 3,
      });
      marker.bindPopup(
        `<strong>${p.label}</strong><br/>${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` +
          (p.meta ? `<br/>${p.meta}` : "") +
          `<br/><a href="https://www.google.com/maps?q=${p.latitude},${p.longitude}" target="_blank" rel="noreferrer">Open in Google Maps</a>`,
      );
      marker.addTo(layer);
    });

    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], zoom);
    } else {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])),
        {
          padding: [40, 40],
        },
      );
    }
  }, [points, zoom]);

  return (
    <div ref={containerRef} style={{ height }} className="w-full rounded-xl border border-border" />
  );
}

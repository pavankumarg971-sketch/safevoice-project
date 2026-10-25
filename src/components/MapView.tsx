import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import type { MapPoint } from "./LocationMap";

const LocationMap = lazy(() => import("./LocationMap"));

export type { MapPoint };

export function MapView({
  points,
  height = 320,
  zoom,
}: {
  points: MapPoint[];
  height?: number;
  zoom?: number;
}) {
  const fallback = (
    <div
      style={{ height }}
      className="flex w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground"
    >
      Loading map…
    </div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <LocationMap points={points} height={height} zoom={zoom} />
      </Suspense>
    </ClientOnly>
  );
}

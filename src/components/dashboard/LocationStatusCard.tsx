import { useEffect, useState } from 'react';
import { MapPin, RefreshCw, Loader2, MapPinOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentCoords, type Coords } from '@/lib/geolocation';

export function LocationStatusCard() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await getCurrentCoords();
      setCoords(c);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-blue-400" />
            Current Location
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchLocation}
            disabled={loading}
            aria-label="Refresh location"
            className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
            id="refresh-location-btn"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !coords && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting your location...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-300">
            <MapPinOff className="h-4 w-4" />
            <div>
              <p>{error}</p>
              <p className="text-xs text-white/30 mt-1">
                Enable location services in your browser to use this feature.
              </p>
            </div>
          </div>
        )}

        {coords && (
          <div className="space-y-3">
            {/* Mini map visual with coordinates */}
            <div className="relative h-32 rounded-lg bg-gradient-to-br from-blue-900/20 via-slate-800/30 to-blue-900/20 border border-white/10 overflow-hidden flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(59,130,246,0.5) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative text-center">
                <MapPin className="h-6 w-6 text-blue-400 mx-auto mb-1 animate-bounce" />
                <p className="text-sm font-mono font-medium">
                  {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°
                </p>
                {coords.accuracy != null && (
                  <p className="text-xs text-white/40 mt-0.5">
                    Accuracy: ±{coords.accuracy.toFixed(0)}m
                  </p>
                )}
              </div>
            </div>

            {lastUpdated && (
              <p className="text-xs text-white/30 text-right">Last updated: {lastUpdated}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

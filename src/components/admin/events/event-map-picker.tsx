"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CircleMarker, LeafletMouseEvent, Map as LeafletMap } from "leaflet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EventMapPickerProps = {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const SOFIA_CENTER: [number, number] = [42.6977, 23.3219];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidLatLng(lat?: number, lng?: number): lat is number {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function roundCoord(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

export function EventMapPicker({ lat, lng, onPick }: EventMapPickerProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  const [open, setOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const initialCenter = useMemo<[number, number]>(() => {
    if (isValidLatLng(lat, lng)) return [lat, lng];
    return SOFIA_CENTER;
  }, [lat, lng]);

  useEffect(() => {
    if (!open) return;
    if (!mapRootRef.current || mapRef.current) return;
    let isCancelled = false;
    let cleanupMap: LeafletMap | null = null;

    const initMap = async () => {
      const L = await import("leaflet");
      if (isCancelled || !mapRootRef.current) return;

      const map = L.map(mapRootRef.current, {
        center: initialCenter,
        zoom: isValidLatLng(lat, lng) ? 13 : 12,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      map.on("click", (e: LeafletMouseEvent) => {
        onPickRef.current(roundCoord(e.latlng.lat), roundCoord(e.latlng.lng));
      });

      mapRef.current = map;
      cleanupMap = map;
    };

    void initMap();

    return () => {
      isCancelled = true;
      if (cleanupMap) {
        cleanupMap.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, initialCenter, lat, lng]);

  useEffect(() => {
    if (!open || !mapRef.current) return;
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncMarker = async () => {
      const L = await import("leaflet");
      if (!mapRef.current) return;

      if (isValidLatLng(lat, lng)) {
        const point: [number, number] = [lat, lng];
        if (!markerRef.current) {
          markerRef.current = L.circleMarker(point, {
            radius: 7,
            color: "#1d4ed8",
            weight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.75,
          }).addTo(mapRef.current);
        } else {
          markerRef.current.setLatLng(point);
        }

        mapRef.current.panTo(point, { animate: true });
        return;
      }

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };

    void syncMarker();
  }, [lat, lng]);

  useEffect(() => {
    const canUsePermissions =
      typeof navigator !== "undefined" &&
      "permissions" in navigator &&
      typeof navigator.permissions.query === "function";
    if (!canUsePermissions || !navigator.geolocation) return;

    let isCancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (isCancelled || status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (isCancelled) return;
            onPickRef.current(roundCoord(position.coords.latitude), roundCoord(position.coords.longitude));
          },
          () => {
            // Keep current center when geolocation fails.
          }
        );
      })
      .catch(() => {
        // Ignore unsupported/failed permission queries.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const applyCoordinates = (nextLat: number, nextLng: number) => {
    onPickRef.current(roundCoord(nextLat), roundCoord(nextLng));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const centerOnSofia = () => {
    mapRef.current?.setView(SOFIA_CENTER, 12, { animate: true });
  };

  const runAddressSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = (await res.json()) as NominatimResult[];
      const normalized = Array.isArray(data) ? data : [];
      setSearchResults(normalized);
      if (!normalized.length) setSearchError("No results found.");
    } catch {
      setSearchError("Address search failed. Try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: NominatimResult) => {
    const nextLat = Number(result.lat);
    const nextLng = Number(result.lon);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    applyCoordinates(nextLat, nextLng);
    mapRef.current?.setView([nextLat, nextLng], 15, { animate: true });
  };

  return (
    <>
      <div className="space-y-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {isValidLatLng(lat, lng) ? "Update map pin" : "Pick coordinates on map"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {isValidLatLng(lat, lng)
            ? `Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : "No coordinates selected yet."}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="4xl">
          <DialogHeader>
            <DialogTitle>Pick coordinates</DialogTitle>
            <DialogDescription>
              Search for an address or click on the map. Tiles and geocoding use OpenStreetMap services.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={runAddressSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, city, venue..."
            />
            <Button type="submit" variant="outline" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <div className="h-[420px] w-full overflow-hidden rounded-md border" ref={mapRootRef} />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={isLocating}>
                  {isLocating ? "Locating..." : "Use current location"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={centerOnSofia}>
                  Center on Sofia
                </Button>
              </div>

              <div className="max-h-[360px] space-y-1 overflow-auto rounded-md border p-2">
                {searchError && <p className="text-xs text-red-600">{searchError}</p>}
                {!searchError && !searchResults.length && (
                  <p className="text-xs text-muted-foreground">Search results will appear here.</p>
                )}
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="w-full rounded-sm border p-2 text-left text-xs hover:bg-accent"
                    onClick={() => handleSelectResult(result)}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}

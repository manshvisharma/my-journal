import React, { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Sheet } from "../../ui/Sheet";
import type { LocationAttachment } from "../../types";
import { haptics } from "../../lib/haptics";

interface LocationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: LocationAttachment | null;
  onSave: (location: LocationAttachment | null) => void;
}

export const LocationSheet: React.FC<LocationSheetProps> = ({ isOpen, onClose, initial, onSave }) => {
  const [name, setName] = useState(initial?.name || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name || "");
    setCoords(initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null);
    setError("");
  }, [isOpen, initial]);

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (!name.trim()) setName("Current location");
        setLocating(false);
        haptics.success();
      },
      () => {
        setLocating(false);
        setError("Could not read your location. You can still type a place name.");
        haptics.warning();
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!isOpen) return null;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} showCloseButton>
      <div className="flex flex-col gap-4 text-app-text-primary">
        <div>
          <h3 className="text-lg font-bold">Add a place</h3>
          <p className="text-sm text-app-text-secondary mt-1">Pin where this entry happened.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-app-text-secondary">Place name</span>
          <div className="flex items-center gap-2 rounded-2xl border border-app-hairline bg-app-bg px-3 py-3">
            <MapPin className="w-4 h-4 text-app-accent" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cafe, city, trail, home…"
              className="flex-1 bg-transparent outline-none text-[16px] text-app-text-primary placeholder:text-app-text-tertiary"
            />
          </div>
        </label>
        <button
          type="button"
          onClick={useCurrent}
          className="flex items-center justify-center gap-2 rounded-2xl border border-app-hairline py-3 text-sm font-semibold text-app-accent"
        >
          <Navigation className="w-4 h-4" />
          {locating ? "Finding you…" : "Use current location"}
        </button>
        {coords && (
          <p className="text-xs text-app-text-secondary">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}
        {error && <p className="text-xs text-app-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          {initial && (
            <button
              type="button"
              onClick={() => {
                onSave(null);
                onClose();
              }}
              className="flex-1 rounded-2xl py-3 text-sm font-semibold text-app-destructive border border-app-hairline"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              haptics.success();
              onSave({ name: name.trim(), lat: coords?.lat, lng: coords?.lng });
              onClose();
            }}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold bg-app-accent text-white disabled:opacity-40"
            disabled={!name.trim()}
          >
            Save place
          </button>
        </div>
      </div>
    </Sheet>
  );
};

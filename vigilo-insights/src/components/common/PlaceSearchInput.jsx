import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POI_CATALOG } from "@/lib/poi";

/* -- Photon geocoding (Komoot) -- */
export async function searchPlaces(query) {
  if (!query || query.length < 3) return [];
  try {
    const trimmed = query.trim();

    // Quick path: lat,lng direct input or Google Maps URL
    const coordMatch = trimmed.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lon = coordMatch[3];
      return [{ lat, lon, display_name: `Coordinates: ${lat}, ${lon}` }];
    }

    const urlMatch = trimmed.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/) ||
      trimmed.match(/[?&](q|query|ll)=(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (urlMatch) {
      const lat = urlMatch[2] || urlMatch[1];
      const lon = urlMatch[4] || urlMatch[3];
      if (lat && lon) {
        return [{ lat, lon, display_name: `Coordinates: ${lat}, ${lon}` }];
      }
    }

    const formatPhotonName = (props = {}) => {
      const parts = [];
      if (props.name) parts.push(props.name);
      if (props.housenumber && props.street) {
        parts.push(`${props.housenumber} ${props.street}`);
      } else if (props.street) {
        parts.push(props.street);
      }
      if (props.city) parts.push(props.city);
      if (props.state) parts.push(props.state);
      if (props.postcode) parts.push(props.postcode);
      if (props.country) parts.push(props.country);
      return parts.filter(Boolean).join(", ");
    };

    const toPhotonPlaces = (data) => {
      const features = Array.isArray(data?.features) ? data.features : [];
      return features
        .map((feature) => {
          const coords = feature?.geometry?.coordinates || [];
          const lon = coords[0];
          const lat = coords[1];
          if (typeof lat !== "number" || typeof lon !== "number") return null;
          const display_name = formatPhotonName(feature?.properties) || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          return { lat: String(lat), lon: String(lon), display_name };
        })
        .filter(Boolean);
    };

    const toNominatimPlaces = (data) => {
      return Array.isArray(data)
        ? data.map((place) => ({
            lat: place.lat,
            lon: place.lon,
            display_name: place.display_name,
          }))
        : [];
    };

    const looksLikeExactAddress = /\d/.test(trimmed) || /\b\d{6}\b/.test(trimmed);

    if (looksLikeExactAddress) {
      // Exact address search: Nominatim first (better for house numbers)
      const resExact = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=10&countrycodes=in&viewbox=72.6,21.4,73.1,20.9&bounded=1&addressdetails=1`
      );
      const dataExact = await resExact.json();
      const exactResults = toNominatimPlaces(dataExact).slice(0, 5);
      if (exactResults.length > 0) return exactResults;

      // Fallback: Nominatim without strict bounding box
      const resExactLoose = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=10&countrycodes=in&addressdetails=1`
      );
      const dataExactLoose = await resExactLoose.json();
      const exactLooseResults = toNominatimPlaces(dataExactLoose).slice(0, 5);
      if (exactLooseResults.length > 0) return exactLooseResults;
    }

    // Search 1: Try with "Surat" appended for better city matching
    const term = query.toLowerCase().includes("surat") ? query : `${query} Surat`;
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&limit=10&bbox=72.6,20.9,73.1,21.4&lang=en`
    );
    const data = await res.json();
    const primary = toPhotonPlaces(data);
    if (primary.length > 0) return primary.slice(0, 5);

    // Search 2: Fallback if Search 1 came up empty (bound still enforced)
    const resFallback = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&bbox=72.6,20.9,73.1,21.4&lang=en`
    );
    const dataFallback = await resFallback.json();
    return toPhotonPlaces(dataFallback).slice(0, 5);
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    // Attempt 1: Nominatim with explicit email to avoid 403s
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&email=vigilo@example.com`
    );
    if (!res.ok) throw new Error("Nominatim failed");
    const data = await res.json();
    
    if (data && data.address) {
      const parts = [];
      const road = data.address.road || data.address.pedestrian || data.address.path;
      if (road) parts.push(road);
      
      const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village;
      if (area) parts.push(area);
      
      const city = data.address.city || data.address.town || data.address.county || "Surat";
      if (city) parts.push(city);
      
      if (parts.length > 0) return parts.join(", ");
    }
    if (data && data.display_name) {
      return data.display_name.split(",").slice(0, 3).join(", ");
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode failed, trying Photon:", err);
  }

  try {
    // Attempt 2: Photon reverse geocoding
    const res2 = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
    const data2 = await res2.json();
    if (data2 && data2.features && data2.features.length > 0) {
      const p = data2.features[0].properties;
      const parts = [];
      if (p.name) parts.push(p.name);
      if (p.street) parts.push(p.street);
      if (p.district || p.locality) parts.push(p.district || p.locality);
      if (p.city) parts.push(p.city);
      if (parts.length > 0) return parts.join(", ");
    }
  } catch (err2) {
    console.warn("Photon reverse geocode failed:", err2);
  }

  // Fallback if everything fails
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/* -- Place Search Input Component -- */
export function PlaceSearchInput({
  label, icon: Icon = MapPin, iconColor, placeholder,
  value, onSelect, onQueryChange, disabled, inputRef, className = ""
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const normalize = (value) =>
      (value || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const normalizedQuery = normalize(q);
    return POI_CATALOG.filter((p) => {
      const haystack = [
        p.label,
        p.category,
        p.address,
        p.query,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const normalizedHaystack = normalize(haystack);
      return normalizedHaystack.includes(normalizedQuery);
    });
  }, [query]);

  const suggestionItems = useMemo(() => (
    suggestions.map((p) => ({
      display_name: p.label,
      subLabel: p.address || p.category || "Saved place",
      meta: [p.category, p.hours, p.phone].filter(Boolean).join(" • "),
      query: p.query || p.label,
      lat: p.lat,
      lon: p.lon,
    }))
  ), [suggestions]);

  const dropdownItems = useMemo(() => {
    if (query.trim().length < 3) return [];
    const base = query.length < 3 ? suggestionItems : [...suggestionItems, ...results];
    const seen = new Set();
    return base.filter((item) => {
      const key = (item.display_name || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [query, suggestionItems, results]);

  const handleSearch = useCallback((text) => {
    setQuery(text);
    if (onQueryChange) onQueryChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const places = await searchPlaces(text);
      setResults(places);
      setIsSearching(false);
    }, 400);
  }, [onQueryChange]);

  const handleEnterSelect = useCallback(async () => {
    const text = query.trim();
    if (!text) return;

    // Prefer existing dropdown items (suggestions + fetched results)
    const first = dropdownItems[0] || results[0] || suggestionItems[0];
    if (first) {
      await handleSelect(first);
      return;
    }

    // Fallback: resolve by geocoding the typed text
    try {
      setIsSearching(true);
      const places = await searchPlaces(text);
      if (places && places.length > 0) {
        await handleSelect(places[0]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [query, dropdownItems, results, suggestionItems]);

  useEffect(() => {
    if (!isFocused) {
      setShowDropdown(false);
      return;
    }
    setShowDropdown(dropdownItems.length > 0);
  }, [isFocused, dropdownItems]);

  const handleSelect = async (place) => {
    const baseName = place.display_name?.split(",").slice(0, 3).join(",") || place.display_name || "";
    const fullName = place.display_name || baseName;
    if (baseName) setQuery(baseName);
    if (onQueryChange) onQueryChange(baseName);
    setShowDropdown(false);

    let lat = parseFloat(place.lat);
    let lng = parseFloat(place.lon);
    let name = baseName;
    let full = fullName;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      try {
        setIsSearching(true);
        const fallback = await searchPlaces(place.query || place.display_name);
        if (!fallback || fallback.length === 0) return;
        lat = parseFloat(fallback[0].lat);
        lng = parseFloat(fallback[0].lon);
        name = fallback[0].display_name?.split(",").slice(0, 3).join(",") || name;
        full = fallback[0].display_name || name;
      } finally {
        setIsSearching(false);
      }
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setQuery(name);
    if (onQueryChange) onQueryChange(name);
    onSelect(lat, lng, name, full, place);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    if (onQueryChange) onQueryChange("");
    onSelect(null, null, "", "", null);
  };

  // Sync external value changes (e.g. map click)
  useEffect(() => {
    if (value && value !== query) setQuery(value);
  }, [value]);

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {label && (
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Icon size={14} className={iconColor} />
          {label}
        </Label>
      )}
      <div className="relative">
        {isSearching ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <Loader2 size={14} className="text-primary animate-spin" />
          </div>
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className="pl-9 pr-9 rounded-xl text-sm h-11 bg-background"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleEnterSelect();
            }
          }}
          onFocus={() => {
            setIsFocused(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowDropdown(false), 100);
          }}
          disabled={disabled}
        />
        {query && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {(isFocused || showDropdown) && dropdownItems.length > 0 && showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full mt-1 w-full bg-card rounded-xl shadow-lg border border-border overflow-hidden"
          >
            {dropdownItems.map((place, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(place)}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-start gap-2 border-b border-border/50 last:border-0"
              >
                <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-foreground line-clamp-2">
                  {place.display_name}
                  {place.subLabel && (
                    <span className="block text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {place.subLabel}
                    </span>
                  )}
                  {place.meta && (
                    <span className="block text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                      {place.meta}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

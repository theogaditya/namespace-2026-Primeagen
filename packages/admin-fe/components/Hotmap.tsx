"use client";
import { useEffect, useState, useMemo } from "react";
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, useMap, TileLayer, Circle } from "react-leaflet";
import L from "leaflet";

// Jharkhand state bounds (approximate)
const JHARKHAND_BOUNDS = {
  minLat: 21.95,
  maxLat: 25.35,
  minLng: 83.30,
  maxLng: 87.95,
};

// Center point between Ranchi, Dhanbad, and Jamshedpur (the 3 major districts)
const JHARKHAND_CENTER: [number, number] = [23.233236, 85.964145];
const DEFAULT_ZOOM = 8;

// Helper to check if coordinates are within Jharkhand
function isWithinJharkhand(lat: number | null, lng: number | null): boolean {
  if (lat == null || lng == null) return false;
  return (
    lat >= JHARKHAND_BOUNDS.minLat &&
    lat <= JHARKHAND_BOUNDS.maxLat &&
    lng >= JHARKHAND_BOUNDS.minLng &&
    lng <= JHARKHAND_BOUNDS.maxLng
  );
}

// fix default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom red marker for hotspots
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom orange marker for medium hotspots
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ComplaintLocation {
  id: string;
  seq: number;
  description: string;
  subCategory: string;
  status: string;
  urgency: string;
  submissionDate: string;
  location: {
    latitude: number | null;
    longitude: number | null;
    district: string;
    city: string;
    locality: string;
    pin: string;
  } | null;
  category: { name: string } | null;
}

interface HotspotCluster {
  center: [number, number];
  count: number;
  complaints: ComplaintLocation[];
  district: string;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks and open modal with current view
function MapClickHandler({ onMapClick }: { onMapClick: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleClick = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapClick([center.lat, center.lng], zoom);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);
  return null;
}

// Component to track map view changes and update state
function MapViewTracker({ onViewChange }: { onViewChange: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleMoveEnd = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onViewChange([center.lat, center.lng], zoom);
    };
    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, onViewChange]);
  return null;
}

export default function Hotmap() {
  const [complaints, setComplaints] = useState<ComplaintLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusCenter, setFocusCenter] = useState<[number, number]>(JHARKHAND_CENTER);
  const [focusZoom, setFocusZoom] = useState(DEFAULT_ZOOM);
  // Track current preview map view for modal
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(JHARKHAND_CENTER);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

  // Fetch complaints with location data from dedicated endpoint
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("[Hotmap] No token found");
          setLoading(false);
          setMapReady(true);
          return;
        }

        // Use the local Next.js API route which proxies to the backend
        const res = await fetch(`/api/complaints/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.warn("[Hotmap] Failed to fetch complaint locations:", res.status);
          setLoading(false);
          setMapReady(true);
          return;
        }

        const data = await res.json();
        
        if (!data.success) {
          console.warn("[Hotmap] API returned error:", data.message);
          setLoading(false);
          setMapReady(true);
          return;
        }

        // Transform to expected format and filter to only Jharkhand locations
        const allLocations: ComplaintLocation[] = (data.locations || []).map((loc: any) => ({
          id: loc.id,
          seq: loc.seq,
          description: loc.description,
          subCategory: loc.subCategory,
          status: loc.status,
          urgency: loc.urgency,
          submissionDate: loc.submissionDate,
          category: { name: loc.category },
          location: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            district: loc.district,
            city: loc.city,
            locality: loc.locality,
            pin: loc.pin,
          },
        }));
        
        // Filter to only include complaints within Jharkhand bounds
        const locations = allLocations.filter((c) => 
          isWithinJharkhand(c.location?.latitude ?? null, c.location?.longitude ?? null)
        );
        
        console.log(`[Hotmap] Fetched ${allLocations.length} total, ${locations.length} within Jharkhand`);
        setComplaints(locations);

        // Find the hotspot with most complaints and zoom in on it
        if (locations.length > 0) {
          const hotspot = findHotspotCenter(locations);
          if (hotspot) {
            setFocusCenter(hotspot.center);
            setCurrentCenter(hotspot.center);
            // Zoom level based on complaint count: more complaints = closer zoom (increased by 1 for better visibility)
            const zoomLevel = hotspot.count >= 5 ? 12 : hotspot.count >= 3 ? 11 : 10;
            setFocusZoom(zoomLevel);
            setCurrentZoom(zoomLevel);
          }
        } else {
          // Fallback to Jharkhand center if no complaints
          setFocusCenter(JHARKHAND_CENTER);
          setFocusZoom(DEFAULT_ZOOM);
        }
      } catch (error) {
        console.error("[Hotmap] Error fetching complaints:", error);
      } finally {
        setLoading(false);
        setMapReady(true);
      }
    };

    fetchComplaints();
  }, []);

  // Find the area with most complaints
  const findHotspotCenter = (complaintsWithCoords: ComplaintLocation[]): { center: [number, number]; count: number } | null => {
    if (complaintsWithCoords.length === 0) return null;
    // Build initial clusters by rounded coords
    const clusterMap: Record<string, ComplaintLocation[]> = {};
    complaintsWithCoords.forEach((c) => {
      const lat = c.location?.latitude ?? 0;
      const lng = c.location?.longitude ?? 0;
      const key = `${lat.toFixed(3)}|${lng.toFixed(3)}`;
      if (!clusterMap[key]) clusterMap[key] = [];
      clusterMap[key].push(c);
    });

    let clusters: { center: [number, number]; complaints: ComplaintLocation[]; count: number }[] = Object.entries(clusterMap).map(([k, list]) => {
      const [latStr, lngStr] = k.split("|");
      return { center: [parseFloat(latStr), parseFloat(lngStr)], complaints: list, count: list.length };
    });

    // haversine helper
    const toRad = (v: number) => (v * Math.PI) / 180;
    const metersBetween = (a: [number, number], b: [number, number]) => {
      const R = 6371000;
      const dLat = toRad(b[0] - a[0]);
      const dLon = toRad(b[1] - a[1]);
      const lat1 = toRad(a[0]);
      const lat2 = toRad(b[0]);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLon = Math.sin(dLon / 2);
      const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
      const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
      return R * c;
    };

    const radiusForCount = (count: number) => count * 500 + 1000;

    // merge overlapping clusters
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const a = clusters[i];
          const b = clusters[j];
          const dist = metersBetween(a.center, b.center);
          if (dist <= radiusForCount(a.count) + radiusForCount(b.count)) {
            const combined = [...a.complaints, ...b.complaints];
            const avgLat = combined.reduce((s, c) => s + (c.location?.latitude ?? 0), 0) / combined.length;
            const avgLng = combined.reduce((s, c) => s + (c.location?.longitude ?? 0), 0) / combined.length;
            clusters[i] = { center: [avgLat, avgLng], complaints: combined, count: combined.length };
            clusters.splice(j, 1);
            merged = true;
            break outer;
          }
        }
      }
    }

    if (clusters.length === 0) return null;
    // pick the largest cluster
    clusters.sort((a, b) => b.count - a.count);
    const top = clusters[0];
    return { center: [parseFloat(top.center[0].toFixed(6)), parseFloat(top.center[1].toFixed(6))], count: top.count };
  };

  // Cluster complaints by rounded lat/lng so circle density equals number of pins at that spot
  // Merge clusters iteratively when their display circles would intersect
  const hotspotClusters = useMemo((): HotspotCluster[] => {
    if (complaints.length === 0) return [];

    const clusterMap: Record<string, { list: ComplaintLocation[]; lat: number; lng: number; districtCounts: Record<string, number> }> = {};

    complaints.forEach((c) => {
      const lat = c.location?.latitude ?? 0;
      const lng = c.location?.longitude ?? 0;
      const key = `${lat.toFixed(3)}|${lng.toFixed(3)}`;
      if (!clusterMap[key]) {
        clusterMap[key] = { list: [], lat: parseFloat(lat.toFixed(3)), lng: parseFloat(lng.toFixed(3)), districtCounts: {} };
      }
      clusterMap[key].list.push(c);
      const district = c.location?.district || "Unknown";
      clusterMap[key].districtCounts[district] = (clusterMap[key].districtCounts[district] || 0) + 1;
    });

    // initial clusters
    let clusters: HotspotCluster[] = Object.entries(clusterMap).map(([_, val]) => {
      const districtEntries = Object.entries(val.districtCounts);
      const district = districtEntries.sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
      return {
        center: [val.lat, val.lng] as [number, number],
        count: val.list.length,
        complaints: val.list,
        district,
      };
    });

    // helper: haversine distance in meters
    const metersBetween = (a: [number, number], b: [number, number]) => {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371000; // Earth's radius in meters
      const dLat = toRad(b[0] - a[0]);
      const dLon = toRad(b[1] - a[1]);
      const lat1 = toRad(a[0]);
      const lat2 = toRad(b[0]);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLon = Math.sin(dLon / 2);
      const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
      const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
      return R * c;
    };

    const radiusForCount = (count: number) => count * 500 + 1000;

    // merge overlapping clusters iteratively
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const a = clusters[i];
          const b = clusters[j];
          const dist = metersBetween(a.center, b.center);
          const rA = radiusForCount(a.count);
          const rB = radiusForCount(b.count);
          if (dist <= rA + rB) {
            // merge b into a
            const combined = [...a.complaints, ...b.complaints];
            // recompute center as average of complaints' coords
            const avgLat = combined.reduce((s, c) => s + (c.location?.latitude ?? 0), 0) / combined.length;
            const avgLng = combined.reduce((s, c) => s + (c.location?.longitude ?? 0), 0) / combined.length;
            // recompute district (most common)
            const districtCounts: Record<string, number> = {};
            combined.forEach((c) => {
              const d = c.location?.district || "Unknown";
              districtCounts[d] = (districtCounts[d] || 0) + 1;
            });
            const district = Object.entries(districtCounts).sort((x, y) => y[1] - x[1])[0]?.[0] || "Unknown";
            clusters[i] = {
              center: [parseFloat(avgLat.toFixed(6)), parseFloat(avgLng.toFixed(6))],
              count: combined.length,
              complaints: combined,
              district,
            };
            // remove j
            clusters.splice(j, 1);
            merged = true;
            break outer;
          }
        }
      }
    }

    return clusters;
  }, [complaints]);

  // Get circle color based on complaint count
  const getCircleColor = (count: number) => {
    if (count >= 5) return "#ef4444";
    if (count >= 2) return "#f97316";
    return "#3b82f6";
  };

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Open modal with current map view (center and zoom)
  const openModalWithView = (center: [number, number], zoom: number) => {
    if (!mapReady) return;
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    setIsOpen(true);
  };

  // Track view changes from preview map
  const handleViewChange = (center: [number, number], zoom: number) => {
    setCurrentCenter(center);
    setCurrentZoom(zoom);
  };

  const closeModal = () => setIsOpen(false);

  const previewStyle: React.CSSProperties = {
    width: "100%",
    height: 350,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
  };

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: 350,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#6b7280",
        }}
      >
        Loading complaint locations...
      </div>
    );
  }

  // Always use the Google Maps tile layer as it has better coverage in India and doesn't require API keys 
  // It also shows Jammu and Kashmir region properly and it being part of India
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  function GoogleTileLayer({ url, attribution, maxZoom }: { url: string; attribution?: string; maxZoom?: number }) {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      let layer: L.TileLayer | null = null;
      try {
        layer = L.tileLayer(url, { attribution, maxZoom });
        layer.addTo(map);
      } catch (e) {
        // ignore
      }
      return () => {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      };
    }, [map, url, attribution, maxZoom]);
    return null;
  }

  return (
    <>
      {/* Preview map */}
      {mapReady && !isOpen && (
        <div style={previewStyle}>
          <MapContainer
            key="hotmap-preview"
            center={focusCenter}
            zoom={focusZoom}
            style={{ height: "100%", width: "100%", zIndex: 0, position: 'relative' }}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={true}
          >
            {/* <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            /> */}
            <GoogleTileLayer url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' maxZoom={20} />

            <MapController center={focusCenter} zoom={focusZoom} />
            <MapClickHandler onMapClick={openModalWithView} />
            <MapViewTracker onViewChange={handleViewChange} />
            
            {/* Show hotspot circles */}
            {hotspotClusters.map((cluster, idx) => (
              <Circle
                key={`circle-${idx}`}
                center={cluster.center}
                radius={cluster.count * 500 + 1000}
                pathOptions={{
                  color: getCircleColor(cluster.count),
                  fillColor: getCircleColor(cluster.count),
                  fillOpacity: 0.2,
                }}
              />
            ))}

            {/* Show individual complaint markers */}
            {complaints.map((c) => (
              <Marker
                key={`preview-${c.id}`}
                position={[c.location!.latitude!, c.location!.longitude!]}
                icon={blueIcon}
              />
            ))}
          </MapContainer>
          
          {/* Info badge - shows complaint count */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 1000,
            }}
          >
          </div>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 50,
              background: "rgba(255,255,255,0.95)",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 11,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              zIndex: 1000,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Complaint Density</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }}></span>
              <span>High (5+)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316" }}></span>
              <span>Medium (2-4)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }}></span>
              <span>Low (1)</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90vw",
              maxWidth: 1200,
              height: "80vh",
              background: "#fff",
              borderRadius: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 50,
                background: "rgba(255,255,255,0.95)",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                zIndex: 10001,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                Complaint Hotspots - Jharkhand ({complaints.length} complaints)
              </span>
              <button
                onClick={closeModal}
                aria-label="Close map"
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

            {/* Map */}
            <div style={{ width: "100%", height: "100%", paddingTop: 50 }}>
              <MapContainer
                key="hotmap-modal"
                center={currentCenter}
                zoom={currentZoom}
                style={{ height: "100%", width: "100%", zIndex: 0, position: 'relative' }}
              >
                {/* <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                /> */}
                <GoogleTileLayer url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' maxZoom={20} />

                {/* Hotspot circles */}
                {hotspotClusters.map((cluster, idx) => (
                  <Circle
                    key={`modal-circle-${idx}`}
                    center={cluster.center}
                    radius={cluster.count * 500 + 1000}
                    pathOptions={{
                      color: getCircleColor(cluster.count),
                      fillColor: getCircleColor(cluster.count),
                      fillOpacity: 0.2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{cluster.district}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                          {cluster.count} complaint{cluster.count > 1 ? "s" : ""} in this area
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                ))}

                {/* Individual complaint markers */}
                {complaints.map((c) => (
                  <Marker
                    key={`modal-${c.id}`}
                    position={[c.location!.latitude!, c.location!.longitude!]}
                    icon={blueIcon}
                  >
                    <Popup>
                      <div style={{ minWidth: 220, maxWidth: 280 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          #{c.seq} - {c.category?.name || "N/A"}
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>{c.subCategory}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginBottom: 6,
                            maxHeight: 60,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.description.length > 100
                            ? c.description.substring(0, 100) + "..."
                            : c.description}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {c.location?.locality}, {c.location?.city}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              background:
                                c.status === "COMPLETED"
                                  ? "#dcfce7"
                                  : c.status === "REGISTERED"
                                  ? "#dbeafe"
                                  : "#fef3c7",
                              color:
                                c.status === "COMPLETED"
                                  ? "#166534"
                                  : c.status === "REGISTERED"
                                  ? "#1e40af"
                                  : "#92400e",
                            }}
                          >
                            {c.status.replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontSize: 10,
                              background:
                                c.urgency === "CRITICAL"
                                  ? "#fee2e2"
                                  : c.urgency === "HIGH"
                                  ? "#ffedd5"
                                  : "#f3f4f6",
                              color:
                                c.urgency === "CRITICAL"
                                  ? "#991b1b"
                                  : c.urgency === "HIGH"
                                  ? "#9a3412"
                                  : "#374151",
                            }}
                          >
                            {c.urgency}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Legend in modal */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                background: "rgba(255,255,255,0.95)",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 10001,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Complaint Density</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }}
                ></span>
                <span>High density (5+ complaints)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316" }}
                ></span>
                <span>Medium density (2-4 complaints)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6" }}
                ></span>
                <span>Low density (1 complaint)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

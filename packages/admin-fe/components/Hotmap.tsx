"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";

// Default center (India) — used only when no complaints are available
const DEFAULT_CENTER: [number, number] = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;

// fix default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Marker icons by density
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ---------- Types ----------
interface ComplaintLocation {
  id: string;
  seq: number;
  description: string;
  subCategory: string;
  status: string;
  urgency: string;
  submissionDate: string;
  latitude: number;
  longitude: number;
  district: string | null;
  city: string | null;
  locality: string | null;
  pin: string | null;
  category: string;
}

interface HotspotCluster {
  center: [number, number];
  count: number;
  complaints: ComplaintLocation[];
  district: string;
}

// ---------- Map helper components ----------

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleClick = () => {
      const c = map.getCenter();
      onMapClick([c.lat, c.lng], map.getZoom());
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map, onMapClick]);
  return null;
}

function MapViewTracker({ onViewChange }: { onViewChange: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const c = map.getCenter();
      onViewChange([c.lat, c.lng], map.getZoom());
    };
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => { map.off('moveend', handler); map.off('zoomend', handler); };
  }, [map, onViewChange]);
  return null;
}

// Google Maps tile layer via Leaflet (no react-leaflet TileLayer needed)
function GoogleTileLayer({ url, attribution, maxZoom }: { url: string; attribution?: string; maxZoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    let layer: L.TileLayer | null = null;
    try {
      layer = L.tileLayer(url, { attribution, maxZoom });
      layer.addTo(map);
    } catch { /* ignore */ }
    return () => { if (layer && map.hasLayer(layer)) map.removeLayer(layer); };
  }, [map, url, attribution, maxZoom]);
  return null;
}

// ---------- Clustering helpers ----------

/** Haversine distance in meters between two lat/lng points */
function metersBetween(a: [number, number], b: [number, number]): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/** Build clusters from complaints. Uses a grid of ~0.05° (~5 km) cells, then merges overlapping circles. */
function buildClusters(complaints: ComplaintLocation[]): HotspotCluster[] {
  if (complaints.length === 0) return [];

  // Grid-based initial clustering (~5 km cells)
  const cellSize = 0.05;
  const gridMap: Record<string, ComplaintLocation[]> = {};
  for (const c of complaints) {
    const key = `${Math.floor(c.latitude / cellSize)}|${Math.floor(c.longitude / cellSize)}`;
    (gridMap[key] ||= []).push(c);
  }

  // Convert to cluster objects
  let clusters: HotspotCluster[] = Object.values(gridMap).map((list) => {
    const avgLat = list.reduce((s, c) => s + c.latitude, 0) / list.length;
    const avgLng = list.reduce((s, c) => s + c.longitude, 0) / list.length;
    // Most common district
    const districtCounts: Record<string, number> = {};
    list.forEach((c) => { const d = c.district || "Unknown"; districtCounts[d] = (districtCounts[d] || 0) + 1; });
    const district = Object.entries(districtCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
    return { center: [avgLat, avgLng] as [number, number], count: list.length, complaints: list, district };
  });

  // Merge overlapping clusters iteratively
  const radiusForCount = (n: number) => n * 500 + 1000;
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (metersBetween(clusters[i].center, clusters[j].center) <= radiusForCount(clusters[i].count) + radiusForCount(clusters[j].count)) {
          const combined = [...clusters[i].complaints, ...clusters[j].complaints];
          const avgLat = combined.reduce((s, c) => s + c.latitude, 0) / combined.length;
          const avgLng = combined.reduce((s, c) => s + c.longitude, 0) / combined.length;
          const dc: Record<string, number> = {};
          combined.forEach((c) => { const d = c.district || "Unknown"; dc[d] = (dc[d] || 0) + 1; });
          const dist = Object.entries(dc).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
          clusters[i] = { center: [avgLat, avgLng], count: combined.length, complaints: combined, district: dist };
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  return clusters;
}

/** Returns the center + zoom for the densest cluster */
function findFocusPoint(clusters: HotspotCluster[]): { center: [number, number]; zoom: number } {
  if (clusters.length === 0) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  const top = clusters.reduce((best, c) => (c.count > best.count ? c : best), clusters[0]);
  const zoom = top.count >= 10 ? 13 : top.count >= 5 ? 12 : top.count >= 3 ? 11 : 10;
  return { center: top.center, zoom };
}

// ---------- Color helpers ----------
function getCircleColor(count: number): string {
  if (count >= 5) return "#ef4444";
  if (count >= 2) return "#f97316";
  return "#3b82f6";
}

// ============================
// Main Component
// ============================
export default function Hotmap() {
  const [complaints, setComplaints] = useState<ComplaintLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusCenter, setFocusCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [focusZoom, setFocusZoom] = useState(DEFAULT_ZOOM);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const tileUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`;

  // ---- Fetch complaint locations from the backend ----
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("[Hotmap] No token found");
          setLoading(false);
          setMapReady(true);
          return;
        }

        const res = await fetch(`/api/complaints/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.warn("[Hotmap] Failed to fetch locations:", res.status);
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

        // Map backend response to our type (no filtering — show all locations)
        const locations: ComplaintLocation[] = (data.locations || [])
          .filter((loc: any) => loc.latitude != null && loc.longitude != null)
          .map((loc: any) => ({
            id: loc.id,
            seq: loc.seq,
            description: loc.description,
            subCategory: loc.subCategory,
            status: loc.status,
            urgency: loc.urgency,
            submissionDate: loc.submissionDate,
            latitude: loc.latitude,
            longitude: loc.longitude,
            district: loc.district,
            city: loc.city,
            locality: loc.locality,
            pin: loc.pin,
            category: loc.category || "Unknown",
          }));

        console.log(`[Hotmap] Loaded ${locations.length} complaint locations`);
        setComplaints(locations);

        // Auto-focus on the densest cluster
        const clusters = buildClusters(locations);
        const focus = findFocusPoint(clusters);
        setFocusCenter(focus.center);
        setFocusZoom(focus.zoom);
        setCurrentCenter(focus.center);
        setCurrentZoom(focus.zoom);
      } catch (error) {
        console.error("[Hotmap] Error fetching complaints:", error);
      } finally {
        setLoading(false);
        setMapReady(true);
      }
    };

    fetchLocations();
  }, []);

  // ---- Memoised clusters ----
  const hotspotClusters = useMemo(() => buildClusters(complaints), [complaints]);

  // ---- Escape key closes modal ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // ---- Callbacks ----
  const openModalWithView = useCallback((center: [number, number], zoom: number) => {
    if (!mapReady) return;
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    setIsOpen(true);
  }, [mapReady]);

  const handleViewChange = useCallback((center: [number, number], zoom: number) => {
    setCurrentCenter(center);
    setCurrentZoom(zoom);
  }, []);

  const closeModal = () => setIsOpen(false);

  // ---- Styles ----
  const previewStyle: React.CSSProperties = {
    width: "100%",
    height: 350,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        style={{
          width: "100%", height: 350, border: "1px solid #e5e7eb", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f9fafb", color: "#6b7280",
        }}
      >
        Loading complaint locations...
      </div>
    );
  }

  // ============================
  // Render
  // ============================
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
            <GoogleTileLayer url={tileUrl} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' maxZoom={20} />
            <MapController center={focusCenter} zoom={focusZoom} />
            <MapClickHandler onMapClick={openModalWithView} />
            <MapViewTracker onViewChange={handleViewChange} />

            {/* Density circles */}
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

            {/* Individual complaint markers */}
            {complaints.map((c) => (
              <Marker
                key={`preview-${c.id}`}
                position={[c.latitude, c.longitude]}
                icon={blueIcon}
              />
            ))}
          </MapContainer>

          {/* Legend */}
          <div
            style={{
              position: "absolute", top: 10, right: 50,
              background: "rgba(255,255,255,0.95)", padding: "8px 12px",
              borderRadius: 6, fontSize: 11,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)", zIndex: 1000,
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
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
          }}
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90vw", maxWidth: 1200, height: "80vh",
              background: "#fff", borderRadius: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 50,
                background: "rgba(255,255,255,0.95)", borderBottom: "1px solid #e5e7eb",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", zIndex: 10001,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                Complaint Hotspots ({complaints.length} complaints)
              </span>
              <button
                onClick={closeModal}
                aria-label="Close map"
                style={{
                  background: "#f3f4f6", color: "#374151", border: "none",
                  width: 32, height: 32, borderRadius: 6, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
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
                <GoogleTileLayer url={tileUrl} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' maxZoom={20} />

                {/* Density circles with popups */}
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

                {/* Individual complaint markers with popups */}
                {complaints.map((c) => (
                  <Marker
                    key={`modal-${c.id}`}
                    position={[c.latitude, c.longitude]}
                    icon={blueIcon}
                  >
                    <Popup>
                      <div style={{ minWidth: 220, maxWidth: 280 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          #{c.seq} - {c.category || "N/A"}
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>{c.subCategory}</div>
                        <div
                          style={{
                            fontSize: 12, color: "#6b7280", marginBottom: 6,
                            maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis",
                          }}
                        >
                          {c.description.length > 100 ? c.description.substring(0, 100) + "..." : c.description}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {c.locality}, {c.city}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                          <span
                            style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10,
                              background: c.status === "COMPLETED" ? "#dcfce7" : c.status === "REGISTERED" ? "#dbeafe" : "#fef3c7",
                              color: c.status === "COMPLETED" ? "#166534" : c.status === "REGISTERED" ? "#1e40af" : "#92400e",
                            }}
                          >
                            {c.status.replace(/_/g, " ")}
                          </span>
                          <span
                            style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10,
                              background: c.urgency === "CRITICAL" ? "#fee2e2" : c.urgency === "HIGH" ? "#ffedd5" : "#f3f4f6",
                              color: c.urgency === "CRITICAL" ? "#991b1b" : c.urgency === "HIGH" ? "#9a3412" : "#374151",
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
                position: "absolute", bottom: 20, left: 20,
                background: "rgba(255,255,255,0.95)", padding: "10px 14px",
                borderRadius: 8, fontSize: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10001,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Complaint Density</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }}></span>
                <span>High density (5+ complaints)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f97316" }}></span>
                <span>Medium density (2-4 complaints)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#3b82f6" }}></span>
                <span>Low density (1 complaint)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

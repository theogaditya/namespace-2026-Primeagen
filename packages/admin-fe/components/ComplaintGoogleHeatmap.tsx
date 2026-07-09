"use client"

/**
 * ComplaintGoogleHeatmap
 *
 * Shared heatmap component used by Agent, Municipal, State admin analytics pages.
 * Fetches real complaint location data from /api/complaints/locations and renders a
 * Google Maps HeatmapLayer on top of a Google Maps instance.
 *
 * Usage:
 *   <ComplaintGoogleHeatmap height="450px" />
 *   <ComplaintGoogleHeatmap height="300px" showDensityTable />
 */

import { useEffect, useRef, useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

// India center
const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 }
const DEFAULT_ZOOM = 5

interface ComplaintPoint {
  id: string
  seq: number
  latitude: number
  longitude: number
  district: string | null
  city: string | null
  status: string
  urgency: string
  category: string
  subCategory: string
  description: string
  ipfsHash: string | null
  blockchainHash: string | null
  isOnChain: boolean
}

interface DistrictDensity {
  district: string
  count: number
  level: "High" | "Medium" | "Low"
}

interface Props {
  /** Height of the map container. Defaults to 400px */
  height?: string
  /** If true, renders a density table below (or to the right of) the map */
  showDensityTable?: boolean
  /** Extra Tailwind classes for the outer wrapper */
  className?: string
}

function densityLevel(count: number, max: number): "High" | "Medium" | "Low" {
  if (count >= max * 0.6) return "High"
  if (count >= max * 0.3) return "Medium"
  return "Low"
}

let scriptLoadPromise: Promise<void> | null = null

function loadGoogleMapsScript(): Promise<void> {
  // Check that the marker library (AdvancedMarkerElement) is available
  if ((window as any).google?.maps?.marker?.AdvancedMarkerElement) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    // remove any previous failed script
    const existing = document.getElementById("gm-complaint-heatmap")
    if (existing) existing.remove()
    const script = document.createElement("script")
    script.id = "gm-complaint-heatmap"
    // Use 'marker' library for AdvancedMarkerElement + PinElement
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=marker&loading=async&callback=__gmComplaintHeatmapReady`
    script.async = true
    ;(window as any).__gmComplaintHeatmapReady = () => {
      resolve()
      delete (window as any).__gmComplaintHeatmapReady
    }
    script.onerror = () => { scriptLoadPromise = null; reject(new Error("Google Maps script failed")) }
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

export default function ComplaintGoogleHeatmap({ height = "400px", showDensityTable = false, className = "" }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any | null>(null)
  // Density circles replace the deprecated HeatmapLayer
  const densityCirclesRef = useRef<any[]>([])
  // AdvancedMarkerElement replaces the deprecated google.maps.Marker
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any | null>(null)
  // Points grouped by district for quick panning / centering
  const districtPointsRef = useRef<Record<string, ComplaintPoint[]>>({})
  // Ensure initial focus to top district runs only once
  const initialFocusDoneRef = useRef(false)

  const [points, setPoints] = useState<ComplaintPoint[]>([])
  const [densityRows, setDensityRows] = useState<DistrictDensity[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)

  // ── 1. Fetch complaint locations ──────────────────────────────────
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const headers: HeadersInit = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch(`${API_URL}/api/complaints/locations`, { headers, credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.message || "API error")

        const pts: ComplaintPoint[] = (data.locations || [])
          .filter((l: any) => l.latitude != null && l.longitude != null)
          .map((l: any) => ({
            id: l.id,
            seq: l.seq,
            latitude: Number(l.latitude),
            longitude: Number(l.longitude),
            district: l.district ?? null,
            city: l.city ?? null,
            status: l.status ?? "REGISTERED",
            urgency: l.urgency ?? "LOW",
            category: l.category ?? "Unknown",
            subCategory: l.subCategory ?? "",
            description: l.description ?? "",
            ipfsHash: l.ipfsHash ?? null,
            blockchainHash: l.blockchainHash ?? null,
            isOnChain: l.isOnChain ?? false,
          }))

        setPoints(pts)

        // Compute district density and keep list of points per district
        const distCounts: Record<string, number> = {}
        const districtPoints: Record<string, ComplaintPoint[]> = {}
        pts.forEach((p) => {
          const key = p.district || p.city || "Unknown"
          distCounts[key] = (distCounts[key] || 0) + 1
          districtPoints[key] = districtPoints[key] || []
          districtPoints[key].push(p)
        })
        districtPointsRef.current = districtPoints

        const max = Math.max(1, ...Object.values(distCounts))
        const rows: DistrictDensity[] = Object.entries(distCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([district, count]) => ({ district, count, level: densityLevel(count, max) }))
        setDensityRows(rows)
      } catch (err) {
        console.error("[ComplaintGoogleHeatmap] fetch error:", err)
      } finally {
        setLoadingData(false)
      }
    }
    fetchPoints()
  }, [])

  // ── 2. Initialise / update Google Map + HeatmapLayer ─────────────
  useEffect(() => {
    if (loadingData) return // wait for data first

    const initMap = async () => {
      try {
        await loadGoogleMapsScript()

        if (!mapDivRef.current) return

        // Create map only once
        if (!mapInstanceRef.current) {
          const center = points.length > 0
            ? { lat: points[0].latitude, lng: points[0].longitude }
            : DEFAULT_CENTER

          // mapId is required for AdvancedMarkerElement; styles cannot coexist with mapId
          // (cloud console controls styling when a mapId is present)
          const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"
          mapInstanceRef.current = new (globalThis as any).google.maps.Map(mapDivRef.current, {
            center,
            zoom: points.length > 0 ? 7 : DEFAULT_ZOOM,
            mapId,
            mapTypeControl: true,
            streetViewControl: true,
            rotateControl: true,
            zoomControl: true,
            fullscreenControl: true,
          })
        }

        // ── Density overlay (replaces deprecated HeatmapLayer) ───
        // Transparent stacking circles: overlapping areas naturally compound
        // opacity to give a visual density/heat effect.
        densityCirclesRef.current.forEach((c) => c.setMap(null))
        densityCirclesRef.current = []

        if (points.length > 0) {
          const URGENCY_FILL: Record<string, string> = {
            CRITICAL: "#ba1a1a",
            HIGH:     "#d97706",
            MEDIUM:   "#115cb9",
            LOW:      "#1a8754",
          }

          // Helper: approximate haversine distance (meters)
          const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
            const toRad = (v: number) => (v * Math.PI) / 180
            const R = 6371000 // earth meters
            const dLat = toRad(b.lat - a.lat)
            const dLon = toRad(b.lng - a.lng)
            const lat1 = toRad(a.lat)
            const lat2 = toRad(b.lat)
            const sinDLat = Math.sin(dLat / 2)
            const sinDLon = Math.sin(dLon / 2)
            const aa = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2)
            const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
            return R * c
          }

          // Dynamic radius parameters
          const BASE_RADIUS = 1200 // meters for single nearby point
          const MIN_RADIUS = 350
          const MAX_RADIUS = 8000
          const NEARBY_CHECK_METERS = 500

          for (let i = 0; i < points.length; i++) {
            const p = points[i]
            let nearby = 0
            for (let j = 0; j < points.length; j++) {
              if (i === j) continue
              const d = haversineMeters({ lat: p.latitude, lng: p.longitude }, { lat: points[j].latitude, lng: points[j].longitude })
              if (d <= NEARBY_CHECK_METERS) nearby++
            }

            const countFactor = Math.sqrt(1 + nearby) // smooth growth
            const radiusMeters = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.round(BASE_RADIUS * countFactor)))

            const circle = new (globalThis as any).google.maps.Circle({
              center: { lat: p.latitude, lng: p.longitude },
              radius: radiusMeters,
              strokeOpacity: 0,
              strokeWeight: 0,
              fillColor: URGENCY_FILL[p.urgency] ?? "#115cb9",
              fillOpacity: Math.min(0.2, 0.05 * (1 + nearby)),
              map: mapInstanceRef.current!,
              zIndex: 1,
            })
            densityCirclesRef.current.push(circle)
          }

          // Auto-focus: if not done yet, focus map on the district with highest density
          if (!initialFocusDoneRef.current) {
            initialFocusDoneRef.current = true
            const groups = districtPointsRef.current || {}
            // pick the district with the most points
            const topDistrict = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0]
            const MAX_FOCUS_ZOOM = 12
            if (topDistrict && topDistrict[1] && topDistrict[1].length > 0) {
              const ptsForDistrict = topDistrict[1]
              if (ptsForDistrict.length === 1) {
                const p = ptsForDistrict[0]
                mapInstanceRef.current.setCenter({ lat: p.latitude, lng: p.longitude })
                mapInstanceRef.current.setZoom(Math.min(MAX_FOCUS_ZOOM, 12))
              } else {
                const bounds = new (globalThis as any).google.maps.LatLngBounds()
                ptsForDistrict.forEach((pp) => bounds.extend(new (globalThis as any).google.maps.LatLng(pp.latitude, pp.longitude)))
                mapInstanceRef.current.fitBounds(bounds, { left: 60, right: 60, top: 60, bottom: 60 })
                // After fitBounds completes, ensure we are not zoomed in too far
                (globalThis as any).google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
                  const z = mapInstanceRef.current!.getZoom() || 0
                  if (z > MAX_FOCUS_ZOOM) mapInstanceRef.current!.setZoom(MAX_FOCUS_ZOOM)
                })
              }
            } else {
              const avgLat = points.reduce((s, p) => s + p.latitude, 0) / points.length
              const avgLng = points.reduce((s, p) => s + p.longitude, 0) / points.length
              mapInstanceRef.current.setCenter({ lat: avgLat, lng: avgLng })
              mapInstanceRef.current.setZoom(points.length > 50 ? 7 : points.length > 10 ? 8 : 10)
            }
          }
        }

        // ── Complaint markers with info popups ────────────────────
        // Clear any previously placed AdvancedMarkerElement instances
        markersRef.current.forEach((m) => { m.map = null })
        markersRef.current = []

        // One shared InfoWindow so only one popup is open at a time
        if (!infoWindowRef.current) {
          infoWindowRef.current = new (globalThis as any).google.maps.InfoWindow()
        }

        // Urgency colour → coloured PinElement
        const URGENCY_COLOR: Record<string, string> = {
          CRITICAL: "#ba1a1a",
          HIGH:     "#d97706",
          MEDIUM:   "#115cb9",
          LOW:      "#1a8754",
        }

        const { AdvancedMarkerElement, PinElement } = (globalThis as any).google.maps.marker

        // Prepare counts for identical coordinates so we can spiderfy overlapping pins
        const coordCountMap: Record<string, number> = {}
        points.forEach((pp) => {
          const key = `${pp.latitude.toFixed(6)}|${pp.longitude.toFixed(6)}`
          coordCountMap[key] = (coordCountMap[key] || 0) + 1
        })
        const coordIndexMap: Record<string, number> = {}

        points.forEach((p) => {
          const pinColor = URGENCY_COLOR[p.urgency] ?? "#115cb9"

          // PinElement gives a proper coloured teardrop pin
          const pin = new PinElement({
            background: pinColor,
            borderColor: "rgba(0,0,0,0.25)",
            glyphColor: "#ffffff",
            scale: 0.85,
          })

          // If multiple complaints share the exact coords, offset them in a small circle
          const key = `${p.latitude.toFixed(6)}|${p.longitude.toFixed(6)}`
          const totalAtCoord = coordCountMap[key] || 1
          const idxAtCoord = (coordIndexMap[key] = (coordIndexMap[key] || 0) + 1) - 1

          let position = { lat: p.latitude, lng: p.longitude }
          if (totalAtCoord > 1) {
            const angle = (idxAtCoord * 2 * Math.PI) / totalAtCoord
            // radius in meters for spiderfy; spread slightly depending on crowding
            const radiusMeters = 8 + Math.floor(idxAtCoord / 6) * 6
            // approximate meters -> degrees conversion
            const metersToLat = (m: number) => m / 111320
            const metersToLng = (m: number, atLat: number) => m / (111320 * Math.cos((atLat * Math.PI) / 180))
            const dLat = metersToLat(radiusMeters * Math.cos(angle))
            const dLng = metersToLng(radiusMeters * Math.sin(angle), p.latitude)
            position = { lat: p.latitude + dLat, lng: p.longitude + dLng }
          }

          const marker = new AdvancedMarkerElement({
            position,
            map: mapInstanceRef.current,
            title: `#${p.seq} – ${p.category}`,
            content: pin,
            zIndex: 10,
          })

          marker.addListener("gmp-click", () => {
            const statusLabel = p.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
            const location    = [p.city, p.district].filter(Boolean).join(", ") || "Location unavailable"
            const desc        = p.description.length > 110 ? p.description.slice(0, 110) + "…" : p.description

            infoWindowRef.current!.setContent(`
              <div style="font-family:system-ui,sans-serif;max-width:250px;padding:2px 4px 4px">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                  <span style="
                    display:inline-block;width:10px;height:10px;border-radius:50%;
                    background:${pinColor};flex-shrink:0;border:1.5px solid #fff;
                    box-shadow:0 0 0 1.5px ${pinColor}
                  "></span>
                  <span style="font-weight:800;font-size:13px;color:#191c1d">
                    #${p.seq} &mdash; ${p.category}
                  </span>
                </div>
                <table style="border-collapse:collapse;width:100%;font-size:11.5px;color:#44474c">
                  <tr>
                    <td style="padding:2px 6px 2px 0;font-weight:600;white-space:nowrap">Status</td>
                    <td style="padding:2px 0">${statusLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 6px 2px 0;font-weight:600;white-space:nowrap">Urgency</td>
                    <td style="padding:2px 0;font-weight:700;color:${pinColor}">${p.urgency}</td>
                  </tr>
                  ${p.subCategory ? `<tr>
                    <td style="padding:2px 6px 2px 0;font-weight:600;white-space:nowrap">Sub-category</td>
                    <td style="padding:2px 0">${p.subCategory}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:2px 6px 2px 0;font-weight:600;white-space:nowrap">Location</td>
                    <td style="padding:2px 0">${location}</td>
                  </tr>
                </table>
                ${desc ? `<div style="margin-top:7px;padding-top:7px;border-top:1px solid #e7e8e9;font-size:11px;color:#44474c;line-height:1.5">${desc}</div>` : ""}
                ${p.isOnChain ? `<div style="margin-top:6px;font-size:10px;font-weight:700;color:#1a8754">✓ Verified on Blockchain</div>` : ""}
              </div>
            `)
            infoWindowRef.current!.open(mapInstanceRef.current!, marker)
          })

          markersRef.current.push(marker)
        })
      } catch (err) {
        console.error("[ComplaintGoogleHeatmap] map init error:", err)
        setMapError("Could not load Google Maps. Check your API key.")
      }
    }

    initMap()
  }, [loadingData, points])

  // ── 3. Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      densityCirclesRef.current.forEach((c) => c.setMap(null))
      densityCirclesRef.current = []
      markersRef.current.forEach((m) => { m.map = null })
      markersRef.current = []
      if (infoWindowRef.current) { infoWindowRef.current.close(); infoWindowRef.current = null }
      mapInstanceRef.current = null
    }
  }, [])

  const levelStyle: Record<DistrictDensity["level"], string> = {
    High: "text-[#ba1a1a] font-bold",
    Medium: "text-[#115cb9] font-bold",
    Low: "text-[#44474c] font-bold",
  }

  if (mapError) {
    return (
      <div className={`flex items-center justify-center bg-[#f3f4f5] rounded-xl text-[#44474c] text-sm ${className}`} style={{ height }}>
        <span className="material-symbols-outlined mr-2 text-[#ba1a1a]">error</span>
        {mapError}
      </div>
    )
  }

  return (
    <div className={`flex flex-col lg:flex-row w-full overflow-hidden rounded-xl ${className}`}>
      {/* Map */}
      <div className="relative flex-1">
        {loadingData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f3f4f5] rounded-xl">
            <span className="material-symbols-outlined animate-spin mr-2 text-[#115cb9]">progress_activity</span>
            <span className="text-sm text-[#44474c] font-medium">Loading complaint heatmap…</span>
          </div>
        )}
        <div ref={mapDivRef} className="w-full rounded-xl" style={{ height }} />
        {/* Legend */}
        {!loadingData && points.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] font-bold shadow-md flex flex-col gap-2">
            {/* Density overlay + pin urgency legend */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[#44474c] uppercase tracking-widest">Urgency</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#1a8754" }} /> Low</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#115cb9" }} /> Medium</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#d97706" }} /> High</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#ba1a1a" }} /> Critical</span>
              <span className="text-[#44474c] ml-1 border-l border-[#c4c6cd]/40 pl-3">{points.length.toLocaleString()} complaints</span>
            </div>
          </div>
        )}
      </div>

      {/* Density Table */}
      {showDensityTable && densityRows.length > 0 && (
        <div className="lg:w-56 border-t lg:border-t-0 lg:border-l border-[#c4c6cd]/20 overflow-y-auto" style={{ maxHeight: height }}>
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#e7e8e9] z-10">
              <tr>
                <th className="p-3 font-bold uppercase tracking-widest text-[#44474c]">District</th>
                <th className="p-3 font-bold uppercase tracking-widest text-[#44474c]">Density</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c6cd]/10">
              {densityRows.map(({ district, count, level }) => (
                    <tr
                      key={district}
                      onClick={() => {
                        try {
                          const pts = districtPointsRef.current[district] || []
                          if (!mapInstanceRef.current || pts.length === 0) return
                          const MAX_FOCUS_ZOOM = 12
                          if (pts.length === 1) {
                            mapInstanceRef.current.setCenter({ lat: pts[0].latitude, lng: pts[0].longitude })
                            mapInstanceRef.current.setZoom(Math.min(MAX_FOCUS_ZOOM, 12))
                          } else {
                            const bounds = new (globalThis as any).google.maps.LatLngBounds()
                            pts.forEach((pp) => bounds.extend(new (globalThis as any).google.maps.LatLng(pp.latitude, pp.longitude)))
                            mapInstanceRef.current.fitBounds(bounds, { left: 60, right: 60, top: 60, bottom: 60 })
                            (globalThis as any).google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
                              const z = mapInstanceRef.current!.getZoom() || 0
                              if (z > MAX_FOCUS_ZOOM) mapInstanceRef.current!.setZoom(MAX_FOCUS_ZOOM)
                            })
                          }
                        } catch (e) { console.error('panToDistrict error', e) }
                      }}
                      className="hover:bg-[#f3f4f5] transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-medium text-[#191c1d] truncate max-w-[100px]">{district}</td>
                      <td className={`p-3 ${levelStyle[level]}`}>{level} ({count})</td>
                    </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

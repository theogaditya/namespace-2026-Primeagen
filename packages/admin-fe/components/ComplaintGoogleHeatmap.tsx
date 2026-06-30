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
  if ((window as any).google?.maps?.visualization) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    // remove any previous failed script
    const existing = document.getElementById("gm-complaint-heatmap")
    if (existing) existing.remove()
    const script = document.createElement("script")
    script.id = "gm-complaint-heatmap"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=visualization&callback=__gmComplaintHeatmapReady`
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
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

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

        // Compute district density
        const distCounts: Record<string, number> = {}
        pts.forEach((p) => {
          const key = p.district || p.city || "Unknown"
          distCounts[key] = (distCounts[key] || 0) + 1
        })
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

          mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
            center,
            zoom: points.length > 0 ? 7 : DEFAULT_ZOOM,
            styles: [
              { featureType: "water", elementType: "all", stylers: [{ color: "#c8dff5" }, { lightness: 10 }] },
              { featureType: "road", elementType: "all", stylers: [{ lightness: 30 }] },
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          })
        }

        // Build heatmap data
        const heatData = points.map(
          (p) => new window.google.maps.LatLng(p.latitude, p.longitude)
        )

        // Remove old heatmap layer if any
        if (heatmapLayerRef.current) {
          heatmapLayerRef.current.setMap(null)
        }

        if (heatData.length > 0) {
          heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: heatData,
            map: mapInstanceRef.current,
            radius: 30,
            opacity: 0.75,
            gradient: [
              "rgba(0, 255, 255, 0)",
              "rgba(0, 255, 255, 1)",
              "rgba(0, 191, 255, 1)",
              "rgba(0, 127, 255, 1)",
              "rgba(0, 63, 255, 1)",
              "rgba(0, 0, 255, 1)",
              "rgba(0, 0, 223, 1)",
              "rgba(0, 0, 191, 1)",
              "rgba(0, 0, 159, 1)",
              "rgba(0, 0, 127, 1)",
              "rgba(63, 0, 91, 1)",
              "rgba(127, 0, 63, 1)",
              "rgba(191, 0, 31, 1)",
              "rgba(255, 0, 0, 1)",
            ],
          })

          // Auto-pan to data centroid
          const avgLat = points.reduce((s, p) => s + p.latitude, 0) / points.length
          const avgLng = points.reduce((s, p) => s + p.longitude, 0) / points.length
          mapInstanceRef.current.setCenter({ lat: avgLat, lng: avgLng })
          mapInstanceRef.current.setZoom(points.length > 50 ? 7 : points.length > 10 ? 8 : 10)
        }
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
      if (heatmapLayerRef.current) heatmapLayerRef.current.setMap(null)
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      if (infoWindowRef.current) infoWindowRef.current.close()
      mapInstanceRef.current = null
      heatmapLayerRef.current = null
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
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] font-bold shadow-md flex items-center gap-3">
            <span className="text-[#44474c] uppercase tracking-widest">Density</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> High
            </span>
            <span className="text-[#44474c] ml-1">{points.length.toLocaleString()} complaints</span>
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
                <tr key={district} className="hover:bg-[#f3f4f5] transition-colors">
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

"use client"

/**
 * CivicComplaintHeatmap
 *
 * A Google Maps–based heatmap that visualises public complaint locations
 * fetched from the citizens' user-be backend.
 *
 * Adapted from admin-fe's ComplaintGoogleHeatmap for user-facing theming.
 *
 * Usage:
 *   <CivicComplaintHeatmap height="500px" showDensityTable />
 */

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Loader2 } from "lucide-react"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

// India center fallback
const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 }
const DEFAULT_ZOOM = 5

// ─── Data shapes ─────────────────────────────────────────────────────────────

interface ComplaintPoint {
  id: string
  seq: number
  latitude: number
  longitude: number
  district: string | null
  city: string | null
  locality: string | null
  status: string
  urgency: string
  category: string
  subCategory: string
  description: string
}

interface DistrictDensity {
  district: string
  count: number
  level: "High" | "Medium" | "Low"
}

export interface Props {
  /** Height of the map container. Defaults to 500px */
  height?: string
  /** If true, renders a top-8 district density sidebar */
  showDensityTable?: boolean
  /** Extra Tailwind classes for the outer wrapper */
  className?: string
  /** Receives fetched summary data once available */
  onSummary?: (summary: { total: number; totalWithCoords: number }) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function densityLevel(count: number, max: number): "High" | "Medium" | "Low" {
  if (count >= max * 0.6) return "High"
  if (count >= max * 0.3) return "Medium"
  return "Low"
}

let scriptLoadPromise: Promise<void> | null = null

function loadGoogleMapsScript(): Promise<void> {
  if ((window as any).google?.maps?.marker?.AdvancedMarkerElement) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("gm-civic-heatmap")
    if (existing) existing.remove()
    const script = document.createElement("script")
    script.id = "gm-civic-heatmap"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=marker&callback=__gmCivicHeatmapReady`
    script.async = true
    ;(window as any).__gmCivicHeatmapReady = () => {
      resolve()
      delete (window as any).__gmCivicHeatmapReady
    }
    script.onerror = () => { scriptLoadPromise = null; reject(new Error("Google Maps script failed to load")) }
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CivicComplaintHeatmap({ height = "500px", showDensityTable = false, className = "", onSummary }: Props) {
  const mapDivRef        = useRef<HTMLDivElement>(null)
  const mapInstanceRef   = useRef<google.maps.Map | null>(null)
  const circlesRef       = useRef<google.maps.Circle[]>([])
  const markersRef       = useRef<any[]>([])
  const infoWindowRef    = useRef<google.maps.InfoWindow | null>(null)
  const districtPtsRef   = useRef<Record<string, ComplaintPoint[]>>({})
  const initialFocusRef  = useRef(false)

  const [points,       setPoints]       = useState<ComplaintPoint[]>([])
  const [densityRows,  setDensityRows]  = useState<DistrictDensity[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [mapError,     setMapError]     = useState<string | null>(null)

  // ── 1. Fetch public complaint locations ─────────────────────────────────────
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch("/api/complaint/feed/heatmap?limit=500", { headers, credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!json.success) throw new Error(json.message || "API error")

        const raw: any[] = (json.data?.withCoordinates || [])
          .filter((c: any) => c.location?.latitude != null && c.location?.longitude != null)

        const pts: ComplaintPoint[] = raw.map((c: any) => ({
          id:          c.id,
          seq:         c.seq,
          latitude:    Number(c.location.latitude),
          longitude:   Number(c.location.longitude),
          district:    c.location.district   ?? null,
          city:        c.location.city       ?? null,
          locality:    c.location.locality   ?? null,
          status:      c.status              ?? "REGISTERED",
          urgency:     c.urgency             ?? "LOW",
          category:    c.category?.name      ?? "Unknown",
          subCategory: c.subCategory         ?? "",
          description: c.description         ?? "",
        }))

        setPoints(pts)
        onSummary?.({ total: json.summary?.total ?? pts.length, totalWithCoords: pts.length })

        // District density
        const distCounts: Record<string, number> = {}
        const districtPoints: Record<string, ComplaintPoint[]> = {}
        pts.forEach((p) => {
          const key = p.district || p.city || p.locality || "Unknown"
          distCounts[key] = (distCounts[key] || 0) + 1
          districtPoints[key] = districtPoints[key] || []
          districtPoints[key].push(p)
        })
        districtPtsRef.current = districtPoints

        const max = Math.max(1, ...Object.values(distCounts))
        const rows: DistrictDensity[] = Object.entries(distCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([district, count]) => ({ district, count, level: densityLevel(count, max) }))
        setDensityRows(rows)
      } catch (err) {
        console.error("[CivicComplaintHeatmap] fetch error:", err)
        setMapError("Could not load complaint data.")
      } finally {
        setLoadingData(false)
      }
    }
    fetchPoints()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Initialise / refresh map ─────────────────────────────────────────────
  useEffect(() => {
    if (loadingData) return

    const init = async () => {
      try {
        await loadGoogleMapsScript()
        if (!mapDivRef.current) return

        // Create map once
        if (!mapInstanceRef.current) {
          const center = points.length > 0
            ? { lat: points[0].latitude, lng: points[0].longitude }
            : DEFAULT_CENTER

          mapInstanceRef.current = new window.google.maps.Map(mapDivRef.current, {
            center,
            zoom: points.length > 0 ? 7 : DEFAULT_ZOOM,
            mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
            styles: [
              { featureType: "water",    elementType: "all",    stylers: [{ color: "#dbeafe" }, { lightness: 5  }] },
              { featureType: "road",     elementType: "all",    stylers: [{ lightness: 40 }] },
              { featureType: "poi",      elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "transit",  elementType: "labels", stylers: [{ visibility: "off" }] },
            ],
            mapTypeControl:    true,
            streetViewControl: false,
            rotateControl:     false,
            zoomControl:       true,
            fullscreenControl: true,
          })
        }

        // ── Density overlay circles ─────────────────────────────────────────
        circlesRef.current.forEach((c) => c.setMap(null))
        circlesRef.current = []

        if (points.length > 0) {
          const URGENCY_FILL: Record<string, string> = {
            CRITICAL: "#dc2626",
            HIGH:     "#d97706",
            MEDIUM:   "#630ed4", // --dash-primary
            LOW:      "#059669",
          }

          const haversineM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
            const R = 6371000
            const toR = (v: number) => (v * Math.PI) / 180
            const dLat = toR(b.lat - a.lat)
            const dLon = toR(b.lng - a.lng)
            const aa =
              Math.sin(dLat / 2) ** 2 +
              Math.sin(dLon / 2) ** 2 * Math.cos(toR(a.lat)) * Math.cos(toR(b.lat))
            return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
          }

          const BASE_R  = 1200
          const MIN_R   = 350
          const MAX_R   = 8000
          const NEARBY  = 500

          for (let i = 0; i < points.length; i++) {
            const p = points[i]
            let nearby = 0
            for (let j = 0; j < points.length; j++) {
              if (i === j) continue
              if (haversineM({ lat: p.latitude, lng: p.longitude }, { lat: points[j].latitude, lng: points[j].longitude }) <= NEARBY)
                nearby++
            }
            const r = Math.min(MAX_R, Math.max(MIN_R, Math.round(BASE_R * Math.sqrt(1 + nearby))))
            const circle = new window.google.maps.Circle({
              center:        { lat: p.latitude, lng: p.longitude },
              radius:        r,
              strokeOpacity: 0,
              strokeWeight:  0,
              fillColor:     URGENCY_FILL[p.urgency] ?? "#630ed4",
              fillOpacity:   Math.min(0.22, 0.055 * (1 + nearby)),
              map:           mapInstanceRef.current!,
              zIndex:        1,
            })
            circlesRef.current.push(circle)
          }

          // Auto-focus to highest density district
          if (!initialFocusRef.current) {
            initialFocusRef.current = true
            const groups = districtPtsRef.current
            const top = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0]
            const MAX_ZOOM = 12

            if (top && top[1].length > 0) {
              const pts2 = top[1]
              if (pts2.length === 1) {
                mapInstanceRef.current.setCenter({ lat: pts2[0].latitude, lng: pts2[0].longitude })
                mapInstanceRef.current.setZoom(MAX_ZOOM)
              } else {
                const bounds = new window.google.maps.LatLngBounds()
                pts2.forEach((pp) => bounds.extend({ lat: pp.latitude, lng: pp.longitude }))
                mapInstanceRef.current.fitBounds(bounds, { left: 80, right: 80, top: 80, bottom: 80 })
                window.google.maps.event.addListenerOnce(mapInstanceRef.current, "idle", () => {
                  const z = mapInstanceRef.current!.getZoom() || 0
                  if (z > MAX_ZOOM) mapInstanceRef.current!.setZoom(MAX_ZOOM)
                })
              }
            } else {
              const avgLat = points.reduce((s, p) => s + p.latitude, 0) / points.length
              const avgLng = points.reduce((s, p) => s + p.longitude, 0) / points.length
              mapInstanceRef.current.setCenter({ lat: avgLat, lng: avgLng })
              mapInstanceRef.current.setZoom(points.length > 50 ? 7 : 9)
            }
          }
        }

        // ── Markers ──────────────────────────────────────────────────────────
        markersRef.current.forEach((m) => { m.map = null })
        markersRef.current = []

        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow()
        }

        const URGENCY_COLOR: Record<string, string> = {
          CRITICAL: "#dc2626",
          HIGH:     "#d97706",
          MEDIUM:   "#630ed4",
          LOW:      "#059669",
        }

        const { AdvancedMarkerElement, PinElement } = (window as any).google.maps.marker

        // Spiderfy overlapping pins
        const coordCount: Record<string, number> = {}
        const coordIdx:   Record<string, number> = {}
        points.forEach((p) => {
          const k = `${p.latitude.toFixed(6)}|${p.longitude.toFixed(6)}`
          coordCount[k] = (coordCount[k] || 0) + 1
        })

        points.forEach((p) => {
          const pinColor = URGENCY_COLOR[p.urgency] ?? "#630ed4"
          const pin = new PinElement({
            background:   pinColor,
            borderColor:  "rgba(0,0,0,0.2)",
            glyphColor:   "#ffffff",
            scale:        0.82,
          })

          const k      = `${p.latitude.toFixed(6)}|${p.longitude.toFixed(6)}`
          const total  = coordCount[k] || 1
          const idx    = (coordIdx[k] = (coordIdx[k] || 0) + 1) - 1
          let position = { lat: p.latitude, lng: p.longitude }

          if (total > 1) {
            const angle    = (idx * 2 * Math.PI) / total
            const rM       = 8 + Math.floor(idx / 6) * 6
            const mToLat   = (m: number) => m / 111320
            const mToLng   = (m: number, lat: number) => m / (111320 * Math.cos((lat * Math.PI) / 180))
            position = {
              lat: p.latitude  + mToLat(rM * Math.cos(angle)),
              lng: p.longitude + mToLng(rM * Math.sin(angle), p.latitude),
            }
          }

          const marker = new AdvancedMarkerElement({
            position,
            map:     mapInstanceRef.current,
            title:   `#${p.seq} – ${p.category}`,
            content: pin.element,
            zIndex:  10,
          })

          marker.addListener("click", () => {
            const statusLabel = p.status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
            const location    = [p.locality, p.city, p.district].filter(Boolean).join(", ") || "Location unavailable"
            const desc        = p.description.length > 120 ? p.description.slice(0, 120) + "…" : p.description

            infoWindowRef.current!.setContent(`
              <div style="font-family:system-ui,sans-serif;max-width:260px;padding:4px 6px 6px">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
                  <span style="
                    display:inline-block;width:10px;height:10px;border-radius:50%;
                    background:${pinColor};flex-shrink:0;
                    box-shadow:0 0 0 2px ${pinColor}44
                  "></span>
                  <span style="font-weight:800;font-size:13px;color:#161c27">
                    #${p.seq} &mdash; ${p.category}
                  </span>
                </div>
                <table style="border-collapse:collapse;width:100%;font-size:11.5px;color:#555">
                  <tr>
                    <td style="padding:2px 8px 2px 0;font-weight:600;white-space:nowrap;color:#888">Status</td>
                    <td style="padding:2px 0">${statusLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 8px 2px 0;font-weight:600;white-space:nowrap;color:#888">Urgency</td>
                    <td style="padding:2px 0;font-weight:700;color:${pinColor}">${p.urgency}</td>
                  </tr>
                  ${p.subCategory ? `<tr>
                    <td style="padding:2px 8px 2px 0;font-weight:600;white-space:nowrap;color:#888">Sub-category</td>
                    <td style="padding:2px 0">${p.subCategory}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:2px 8px 2px 0;font-weight:600;white-space:nowrap;color:#888">Location</td>
                    <td style="padding:2px 0">${location}</td>
                  </tr>
                </table>
                ${desc ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;font-size:11px;color:#555;line-height:1.55">${desc}</div>` : ""}
              </div>
            `)
            infoWindowRef.current!.open(mapInstanceRef.current!, marker)
          })

          markersRef.current.push(marker)
        })
      } catch (err) {
        console.error("[CivicComplaintHeatmap] map init error:", err)
        setMapError("Could not load Google Maps. Please check your API key configuration.")
      }
    }

    init()
  }, [loadingData, points])

  // ── 3. Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      circlesRef.current.forEach((c) => c.setMap(null))
      circlesRef.current = []
      markersRef.current.forEach((m) => { m.map = null })
      markersRef.current = []
      if (infoWindowRef.current) { infoWindowRef.current.close(); infoWindowRef.current = null }
      mapInstanceRef.current = null
    }
  }, [])

  // ── Density table pan helper ────────────────────────────────────────────────
  const panToDistrict = (district: string) => {
    try {
      const pts = districtPtsRef.current[district] || []
      if (!mapInstanceRef.current || pts.length === 0) return
      const MAX_ZOOM = 12
      if (pts.length === 1) {
        mapInstanceRef.current.setCenter({ lat: pts[0].latitude, lng: pts[0].longitude })
        mapInstanceRef.current.setZoom(MAX_ZOOM)
      } else {
        const bounds = new window.google.maps.LatLngBounds()
        pts.forEach((pp) => bounds.extend({ lat: pp.latitude, lng: pp.longitude }))
        mapInstanceRef.current.fitBounds(bounds, { left: 60, right: 60, top: 60, bottom: 60 })
        window.google.maps.event.addListenerOnce(mapInstanceRef.current, "idle", () => {
          const z = mapInstanceRef.current!.getZoom() || 0
          if (z > MAX_ZOOM) mapInstanceRef.current!.setZoom(MAX_ZOOM)
        })
      }
    } catch (e) { console.error("[panToDistrict]", e) }
  }

  const levelBadge: Record<DistrictDensity["level"], string> = {
    High:   "bg-red-50 text-red-600   border border-red-200",
    Medium: "bg-violet-50 text-violet-600 border border-violet-200",
    Low:    "bg-emerald-50 text-emerald-600 border border-emerald-200",
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (mapError) {
    return (
      <div
        className={`flex items-center justify-center gap-3 bg-slate-50 rounded-3xl text-slate-500 text-sm border border-slate-200 ${className}`}
        style={{ height }}
      >
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <span>{mapError}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col lg:flex-row w-full overflow-hidden rounded-3xl border border-slate-200/60 shadow-sm bg-white ${className}`}>

      {/* ── Map panel ────────────────────────────────────────────────────── */}
      <div className="relative flex-1">

        {/* Loading overlay */}
        {loadingData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--dash-primary)]" />
            <span className="text-sm text-slate-500 font-medium">Loading complaint map…</span>
          </div>
        )}

        <div ref={mapDivRef} className="w-full rounded-3xl lg:rounded-r-none" style={{ height }} />

        {/* Urgency legend */}
        {!loadingData && points.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-md border border-slate-100 flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Urgency</span>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Low",      color: "#059669" },
                { label: "Medium",   color: "#630ed4" },
                { label: "High",     color: "#d97706" },
                { label: "Critical", color: "#dc2626" },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {label}
                </span>
              ))}
              <span className="ml-2 pl-3 border-l border-slate-200 text-[11px] text-slate-400 font-medium">
                {points.length.toLocaleString()} complaints
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── District density sidebar ─────────────────────────────────────── */}
      {showDensityTable && densityRows.length > 0 && (
        <div className="lg:w-60 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Top Districts</p>
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: height }}>
            {densityRows.map(({ district, count, level }) => (
              <button
                key={district}
                onClick={() => panToDistrict(district)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-b-0 group"
              >
                <span className="text-sm font-semibold text-slate-800 truncate max-w-[110px] group-hover:text-[var(--dash-primary)]">
                  {district}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge[level]}`}>
                  {level} · {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface ComplaintItem {
  id: string
  seq: number
  title: string
  attachmentUrl: string | null
  location: { district?: string; city?: string; locality?: string } | null
}

interface MatchResult {
  match: boolean
  confidence: number
  reason: string
  accuracy?: number
  description?: string
}

const SELF_MATCH_URL =
  process.env.NEXT_PUBLIC_API_URL_SELF_MATCH || "http://localhost:3030/api/match"

/** Route external image URLs through the Next.js server proxy to avoid CORP blocks */
const proxyImg = (url: string | null | undefined) =>
  url ? `/api/img-proxy?url=${encodeURIComponent(url)}` : ""

export function UavIntelligence({ complaints }: { complaints: ComplaintItem[] }) {
  const withImages = complaints.filter((c) => c.attachmentUrl)
  const [selectedId, setSelectedId] = useState<string>(withImages[0]?.id ?? "")
  const [uavFile, setUavFile] = useState<File | null>(null)
  const [uavPreview, setUavPreview] = useState<string | null>(null)
  const [uavUrlInput, setUavUrlInput] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const droneAnimRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scriptSrc = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.10.2/lottie.min.js'
    let anim: any = null
    let cancelled = false

    const ensureLottie = async () => {
      try {
        if (!(window as any).lottie) {
          // Avoid injecting multiple script tags
          if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
            await new Promise<void>((resolve, reject) => {
              const s = document.createElement('script')
              s.src = scriptSrc
              s.onload = () => resolve()
              s.onerror = () => reject(new Error('Failed to load lottie'))
              document.head.appendChild(s)
            })
          } else {
            // wait for lottie to become available
            await new Promise<void>((resolve) => {
              const check = () => {
                if ((window as any).lottie) resolve()
                else setTimeout(check, 50)
              }
              check()
            })
          }
        }
        if (cancelled) return
        const lottie = (window as any).lottie
        if (droneAnimRef.current && lottie) {
          // If a previous animation instance was stored on the element, destroy it first
          try { (droneAnimRef.current as any).__lottieAnim?.destroy?.() } catch (e) {}
          anim = lottie.loadAnimation({
            container: droneAnimRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: '/Drone-2.json',
          })
          // keep reference so future calls can clean it up
          try { (droneAnimRef.current as any).__lottieAnim = anim } catch (e) {}
        }
      } catch (err) {
        console.warn('Lottie failed to init', err)
      }
    }

    ensureLottie()
    return () => {
      cancelled = true
      try { anim?.destroy?.() } catch (e) {}
      try { if (droneAnimRef.current) delete (droneAnimRef.current as any).__lottieAnim } catch (e) {}
    }
  }, [])

  const selected = withImages.find((c) => c.id === selectedId) ?? withImages[0]
  const [selectedImgError, setSelectedImgError] = useState(false)

  const prettyLabelFromUrl = (url: string | null | undefined, idx?: number) => {
    if (!url) return `Image ${idx ?? ""}`
    const part = url.split('/').pop() || url
    const name = part.replace(/\.(jpg|jpeg|png|webp)$/i, '')
    const tokens = name.split(/[_-]/).filter(Boolean)
    const map: Record<string, string> = {
      pothole: 'Pothole',
      brokenwall: 'Broken Wall',
      waterlogging: 'Waterlogging',
    }
    const found = tokens.map(t => map[t.toLowerCase()] || t.charAt(0).toUpperCase() + t.slice(1)).join(' ')
    return `${found}${idx ? ` -#${idx}` : ''}`
  }

  const handleFile = (file: File) => {
    setUavFile(file)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => setUavPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUrlPaste = (url: string) => {
    setUavFile(null)
    setUavPreview(url)
    setResult(null)
    setError(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) handleFile(file)
  }, [])

  const handleVerify = async () => {
    if (!selected?.attachmentUrl || (!uavFile && !uavPreview)) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      let data: any = null
      if (uavFile) {
        const fd = new FormData()
        fd.append("imageUrl1", selected.attachmentUrl)
        fd.append("image2", uavFile)
        const res = await fetch(SELF_MATCH_URL, { method: "POST", body: fd })
        data = await res.json()
      } else if (uavPreview && /^https?:\/\//.test(uavPreview)) {
        const res = await fetch(SELF_MATCH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl1: selected.attachmentUrl, imageUrl2: uavPreview }),
        })
        data = await res.json()
      } else {
        throw new Error("Provide a UAV image file or a reachable image URL")
      }
      if (data.success) {
        setResult({
          match: data.match,
          confidence: data.confidence,
          reason: data.reason || data.description || "",
          accuracy: typeof data.accuracy === "number" ? data.accuracy : data.confidence,
          description: data.description || data.reason || "",
        })
      } else {
        setError(data.error || "Comparison failed")
      }
    } catch (err: any) {
      setError(err?.message || "Network error connecting to UAV analysis server")
    } finally {
      setLoading(false)
    }
  }

  const confidencePct = result ? Math.round((result.confidence ?? result.accuracy ?? 0) * 100) : 0
  const confidenceColor =
    confidencePct >= 90 ? "text-emerald-600" : confidencePct >= 70 ? "text-amber-500" : "text-red-500"
  const barColor =
    confidencePct >= 90 ? "bg-emerald-500" : confidencePct >= 70 ? "bg-amber-400" : "bg-red-500"

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-8">
      <style>{`
        @keyframes uav-scan { 0% { top: -100px; } 100% { top: 100%; } }
        .uav-scan { animation: uav-scan 3s linear infinite; }
        @keyframes uav-scan2 { 0% { top: -100px; } 100% { top: 100%; } }
        .uav-scan2 { animation: uav-scan 3s linear 1.5s infinite; }
        @keyframes uav-pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79,70,229,.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(79,70,229,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(79,70,229,0); }
        }
        .uav-pulse-ring { animation: uav-pulse 2s cubic-bezier(.4,0,.6,1) infinite; }
      `}</style>

      {/* Header */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">
            UAV Intelligence Verification
          </h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Real-time forensic integrity analysis protocol
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div ref={droneAnimRef} className="w-12 h-12" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              Verification Link Active
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12">
        {/* ── Analysis Area ── */}
        <div className="col-span-12 xl:col-span-9 p-8 border-r border-slate-100">
          {/* Complaint selector */}
          <div className="mb-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Select Registered Complaint
            </label>
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setResult(null); setError(null) }}
              className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer"
            >
              {withImages.length === 0 ? (
                <option value="">No complaints with images</option>
              ) : (
                withImages.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.seq} -{c.title.slice(0, 60)}{c.title.length > 60 ? "…" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Image panels */}
          {/* Column headers row -kept separate so both image boxes sit at the same height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-3">
            {/* Left header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Registered Complaint Source
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  REF: IMG-{selected?.seq?.toString().padStart(4, "0") ?? "0000"}
                </span>
              </div>
              <div className="h-10" />
            </div>
            {/* Right header + URL input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  UAV Captured Image
                </span>
                <span className="text-[10px] font-mono text-indigo-600">SQDN: ALPHA-7</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={uavUrlInput}
                  onChange={(e) => setUavUrlInput(e.target.value)}
                  placeholder="Paste image URL to use instead"
                  className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={() => { if (uavUrlInput) { handleUrlPaste(uavUrlInput); setUavUrlInput("") } }}
                  className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
                >
                  Use URL
                </button>
              </div>
            </div>
          </div>

          {/* Images grid -both boxes start at the same level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Left: Complaint image */}
            <div>
              <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative group min-h-[220px] flex items-center justify-center">
                {/* Scanning bar */}
                <div
                  className="uav-scan absolute left-0 z-20 w-full pointer-events-none"
                  style={{
                    height: 100,
                    background: "linear-gradient(to bottom, transparent, #4f46e5, transparent)",
                    opacity: 0.3,
                    top: -100,
                  }}
                />
                {selected?.attachmentUrl && !selectedImgError ? (
                  <img
                    src={proxyImg(selected.attachmentUrl)}
                    alt="Complaint Reference"
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                    onError={() => setSelectedImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-20 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>image_not_supported</span>
                      </div>
                      <div className="text-sm font-semibold">{selected ? prettyLabelFromUrl(selected.attachmentUrl, selected.seq) : 'Complaint Image'}</div>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-white">
                  COMPLAINT SOURCE
                </div>
                {selected?.location && (
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-white">
                    {[selected.location.locality, selected.location.city].filter(Boolean).join(", ") || "Unknown location"}
                  </div>
                )}
              </div>
            </div>

            {/* Center pulse icon */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center uav-pulse-ring">
                <span className="material-symbols-outlined text-indigo-600">sync_alt</span>
              </div>
            </div>

            {/* Right: UAV upload -headers moved to the row above, image starts flush with left */}
            <div>
              <div
                className={`aspect-video bg-slate-50 rounded-xl overflow-hidden border-2 transition-all duration-200 relative group cursor-pointer min-h-[220px] flex items-center justify-center
                  ${dragging ? "border-indigo-400 bg-indigo-50" : uavPreview ? "border-slate-200" : "border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {uavPreview ? (
                  <>
                    {/* Actual image preview */}
                    <img
                      src={/^https?:\/\//.test(uavPreview) ? proxyImg(uavPreview) : uavPreview}
                      alt="UAV Captured"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Scan overlay */}
                    <div
                      className="uav-scan2 absolute left-0 z-20 w-full pointer-events-none"
                      style={{
                        height: 100,
                        background: "linear-gradient(to bottom, transparent, #4f46e5, transparent)",
                        opacity: 0.3,
                        top: -100,
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-indigo-600/80 backdrop-blur px-2 py-1 rounded text-[8px] font-mono text-white z-10">
                      UAV CAPTURED
                    </div>
                    <button
                      className="absolute top-2 right-2 bg-white/80 backdrop-blur p-1 rounded-full text-slate-500 hover:text-red-500 transition-colors z-30"
                      onClick={(e) => { e.stopPropagation(); setUavFile(null); setUavPreview(null); setResult(null) }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-500" style={{ fontSize: 24 }}>
                        {dragging ? "file_download" : "cloud_upload"}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700">
                        {dragging ? "Drop UAV image here" : "Upload UAV Image"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Drag & drop or click -JPG/PNG/WEBP
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stats + Verify button */}
            <div className="mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Match Results</h3>
                {result ? (
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Verdict</p>
                        <p className={`text-lg font-black ${result.match ? 'text-emerald-700' : 'text-red-700'}`}>
                          {result.match ? 'Match Confirmed' : 'No Match'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 uppercase">Confidence</p>
                        <p className="text-2xl font-black text-slate-900">{Math.round((result.confidence ?? result.accuracy ?? 0) * 100)}%</p>
                      </div>
                    </div>
                    {result.description && <p className="mt-3 text-sm text-slate-700">{result.description}</p>}
                    {typeof result.accuracy === 'number' && (
                      <p className="mt-2 text-[12px] text-slate-600">Accuracy: <span className="font-bold">{Math.round(result.accuracy * 100)}%</span></p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-600">
                    Awaiting verification -provide a UAV image (file or URL) and click Verify.
                  </div>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={!selected?.attachmentUrl || (!uavFile && !uavPreview) || loading}
                className="px-10 py-4 bg-indigo-600 text-white rounded-full font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uav-pulse-ring flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:bg-indigo-700"
              >
                <span className="material-symbols-outlined">
                  {loading ? "progress_activity" : "verified"}
                </span>
                {loading ? "Analysing..." : "Verify Authenticity"}
              </button>
            </div>

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <span className="material-symbols-outlined text-red-500 flex-shrink-0" style={{ fontSize: 18 }}>error</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* ── Metrics Sidebar ── */}
        <div className="col-span-12 xl:col-span-3 bg-slate-50 p-6 space-y-8">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Verification Metrics
            </h3>

            {result ? (
              <div className="space-y-5">
                {/* Confidence */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-900">Confidence</span>
                    <span className={`text-2xl font-black ${confidenceColor}`}>{confidencePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`${barColor} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </div>

                {/* Match verdict */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${result.match ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.match ? "bg-emerald-100" : "bg-red-100"}`}>
                    <span className={`material-symbols-outlined text-sm ${result.match ? "text-emerald-600" : "text-red-600"}`}>
                      {result.match ? "check_circle" : "cancel"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">Verdict</p>
                    <p className={`text-xs font-bold ${result.match ? "text-emerald-700" : "text-red-700"}`}>
                      {result.match ? "Match Confirmed" : "No Match"}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Analysis</p>
                  {result.description && (
                    <p className="text-xs text-slate-700 leading-relaxed">{result.description}</p>
                  )}
                  {!result.description && (
                    <p className="text-xs text-slate-700 leading-relaxed">{result.reason}</p>
                  )}
                  {typeof result.accuracy === 'number' && (
                    <p className="text-[11px] text-slate-600 font-medium">Accuracy: <span className="font-bold">{Math.round(result.accuracy * 100)}%</span></p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { icon: "location_on", label: "GPS Correlation", value: loading ? "Analysing…" : "Awaiting scan" },
                  { icon: "schedule", label: "Temporal Alignment", value: loading ? "Analysing…" : "Awaiting scan" },
                  { icon: "id_card", label: "Feature Alignment", value: loading ? "Analysing…" : "Awaiting scan" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-600 text-sm">{m.icon}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{m.label}</p>
                      <p className={`text-xs font-bold text-slate-900 ${loading ? "animate-pulse" : ""}`}>
                        {m.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Reference Images</h3>
            <p className="text-xs text-slate-500 mb-3">These reference images are temporary placeholders. As soon as the UAV system is fully functional, the reference images will be refreshed automatically with UAV-captured reference photos.</p>
            <div className="space-y-3">
              {[
                "https://r2.abhashbehera.online/uploads/1765265732822_pothole_2.jpg",
                "https://r2.abhashbehera.online/uploads/1765271481362_brokenwall_1.png",
                "https://r2.abhashbehera.online/uploads/1765270715482_waterlogging_1.png",
              ].map((url, idx) => {
                const name = url.split('/').pop() || `image-${idx + 1}`
                return (
                  <div key={url} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100">
                    <div className="w-10 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>insert_photo</span>
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-slate-800">{prettyLabelFromUrl(url, idx + 1)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => { await navigator.clipboard.writeText(url) }}
                        className="px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={() => { setUavUrlInput(url); handleUrlPaste(url) }}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

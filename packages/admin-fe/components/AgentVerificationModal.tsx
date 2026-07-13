"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface MatchResult {
  match: boolean
  confidence: number
  reason: string
  accuracy?: number
  description?: string
}

const SELF_MATCH_URL = "/api/self-match"

const proxyImg = (url: string | null | undefined) =>
  url ? `/api/img-proxy?url=${encodeURIComponent(url)}` : ""

interface AgentVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isUpdating: boolean
  complaint: {
    id: string
    seq: number
    title: string
    attachmentUrl: string | null
    location: { district?: string; city?: string; locality?: string; pin?: string; street?: string | null } | null
  }
}

export function AgentVerificationModal({ isOpen, onClose, onConfirm, isUpdating, complaint }: AgentVerificationModalProps) {
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
    if (!isOpen) {
      setUavFile(null)
      setUavPreview(null)
      setUavUrlInput("")
      setResult(null)
      setError(null)
    }
  }, [isOpen])

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
  }, [loading]) // Reload animation when loading state changes

  const [selectedImgError, setSelectedImgError] = useState(false)

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
    if (!complaint.attachmentUrl || (!uavFile && !uavPreview)) {
      console.log("[Verification] Missing required data. url:", complaint.attachmentUrl, "file:", !!uavFile, "preview:", !!uavPreview)
      return
    }
    
    console.log("[Verification] Starting verification for complaint:", complaint.id)
    setLoading(true)
    setResult(null)
    setError(null)
    
    try {
      let data: any = null
      if (uavFile) {
        console.log("[AgentVerification] Sending FILE upload:", {
          originalImageUrl: complaint.attachmentUrl,
          uploadFileName: uavFile.name,
          uploadFileType: uavFile.type,
          uploadFileSize: uavFile.size,
        });

        const fd = new FormData()
        fd.append("imageUrl1", complaint.attachmentUrl)
        fd.append("image2", uavFile)
        
        console.log("[AgentVerification] FormData keys:", Array.from(fd.keys()));

        const res = await fetch(SELF_MATCH_URL, { method: "POST", body: fd })
        data = await res.json()
        
        console.log("[AgentVerification] Response:", data);
      } else if (uavPreview && /^https?:\/\//.test(uavPreview)) {
        console.log("[AgentVerification] Sending URL request:", {
          originalImageUrl: complaint.attachmentUrl,
          previewUrl: uavPreview
        });

        const res = await fetch(SELF_MATCH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl1: complaint.attachmentUrl, imageUrl2: uavPreview }),
        })
        data = await res.json()
        
        console.log("[AgentVerification] Response:", data);
      } else {
        throw new Error("Provide a verification image file or a reachable image URL")
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
        console.error("[Verification] API returned error:", data.error)
        setError(data.error || "Comparison failed")
      }
    } catch (err: any) {
      console.error("[Verification] Exception caught:", err)
      setError(err?.message || "Network error connecting to verification server")
    } finally {
      setLoading(false)
    }
  }

  const confidencePct = result ? Math.round((result.confidence ?? result.accuracy ?? 0) * 100) : 0
  const confidenceColor =
    result && !result.match ? "text-red-500" : confidencePct >= 90 ? "text-emerald-600" : confidencePct >= 70 ? "text-amber-500" : "text-red-500"

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#080d19] rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] w-full max-w-6xl text-slate-200 border border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-[#0d1424] rounded-full border border-slate-700 shadow-sm hover:bg-slate-800 hover:text-red-400 transition-all text-slate-400"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>

        <div className="flex flex-col h-full bg-[#040812] rounded-2xl overflow-hidden relative">
          <style>{`
            .scan-line {
              position: absolute;
              left: 0;
              width: 100%;
              height: 4px;
              background: #3b82f6;
              box-shadow: 0 0 20px #3b82f6, 0 0 40px #3b82f6;
              opacity: 0.6;
              animation: scan 3s linear infinite;
              z-index: 20;
            }
            @keyframes scan {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { top: 100%; opacity: 0; }
            }
          `}</style>
          
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />

          <div className="flex flex-col lg:flex-row h-full">
            <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 relative z-10 border-r border-slate-800/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                  <span className="material-symbols-outlined text-blue-400 text-2xl">verified</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                    Complaint Verification
                    {result && result.match && confidencePct >= 90 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        Matched
                      </span>
                    )}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Upload a field verification image to confirm resolution. Confidence must be ≥ 90%.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
                <div className="relative group rounded-xl overflow-hidden border border-slate-700/50 bg-[#0d1424] flex flex-col">
                  <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start pointer-events-none">
                    <span className="px-2 py-1 rounded bg-black/50 backdrop-blur border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest shadow-lg">
                      Original Complaint
                    </span>
                  </div>
                  {complaint.attachmentUrl ? (
                    <img
                      src={proxyImg(complaint.attachmentUrl)}
                      alt="Complaint"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={() => setSelectedImgError(true)}
                      style={{ display: selectedImgError ? "none" : "block" }}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-50">image_not_supported</span>
                      <span className="text-sm font-medium">No original image</span>
                    </div>
                  )}
                  {loading && <div className="scan-line" />}
                </div>

                <div
                  className={`relative group rounded-xl overflow-hidden border-2 flex flex-col transition-all duration-300 ${
                    dragging ? "border-blue-500 bg-blue-500/10" : "border-dashed border-slate-700 hover:border-blue-400/50 bg-[#0d1424]"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start pointer-events-none">
                    <span className="px-2 py-1 rounded bg-blue-500/20 backdrop-blur border border-blue-500/30 text-[10px] font-bold text-blue-300 uppercase tracking-widest shadow-lg">
                      Verification Upload
                    </span>
                  </div>
                  {uavPreview ? (
                    <>
                      <img
                        src={/^https?:\/\//.test(uavPreview) ? proxyImg(uavPreview) : uavPreview}
                        alt="Upload"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setUavFile(null)
                          setUavPreview(null)
                          setResult(null)
                        }}
                        className="absolute top-3 right-3 z-30 p-1.5 bg-black/50 hover:bg-red-500/80 text-white rounded-lg backdrop-blur transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center cursor-pointer" onClick={() => fileRef.current?.click()}>
                      <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl border border-slate-700">
                        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-blue-400 transition-colors">cloud_upload</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-300 mb-1">Drag & drop verification image</p>
                      <p className="text-xs text-slate-500">or click to browse files</p>
                    </div>
                  )}
                  {loading && <div className="scan-line" style={{ animationDelay: "0.5s" }} />}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              </div>

              {!uavPreview && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">link</span>
                    <input
                      type="text"
                      placeholder="Paste image URL instead..."
                      value={uavUrlInput}
                      onChange={(e) => setUavUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && uavUrlInput && handleUrlPaste(uavUrlInput)}
                      className="w-full bg-[#0d1424] border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => uavUrlInput && handleUrlPaste(uavUrlInput)}
                    disabled={!uavUrlInput}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load
                  </button>
                </div>
              )}
            </div>

            <div className="w-full lg:w-[380px] bg-[#0d1424] p-6 lg:p-8 flex flex-col relative z-10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Analysis Results</h3>

              <div className="flex-1 flex flex-col relative">
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div ref={droneAnimRef} className="w-48 h-48 opacity-80" />
                    <p className="text-blue-400 font-mono text-sm tracking-widest mt-4 animate-pulse">ANALYZING SCENE...</p>
                    <div className="w-32 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-blue-500 w-1/2 animate-[ping_1.5s_infinite]" />
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#040812] border-4 border-slate-800 shadow-2xl relative mb-4">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
                          <circle
                            cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8"
                            className={`${confidenceColor} transition-all duration-1000 ease-out`}
                            strokeDasharray={`${(confidencePct / 100) * 289} 289`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className={`text-3xl font-black tabular-nums ${confidenceColor}`}>{confidencePct}%</span>
                      </div>
                      <h4 className="text-xl font-bold text-white tracking-tight">
                        {result.match && confidencePct >= 90 ? "Verification Passed" : "Verification Failed"}
                      </h4>
                      <p className={`text-sm mt-1 ${result.match && confidencePct >= 90 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                        {!result.match ? "Images do not match" : confidencePct >= 90 ? "High confidence match" : "Below 90% threshold"}
                      </p>
                    </div>

                    <div className="bg-[#040812] rounded-xl p-4 border border-slate-800/50">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">psychology</span> AI Reasoning
                      </h5>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {result.reason || result.description || "No specific reasoning provided."}
                      </p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                    </div>
                    <p className="text-red-400 font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4">Dismiss</button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
                    <span className="material-symbols-outlined text-6xl mb-4 text-slate-600">query_stats</span>
                    <p className="text-sm font-medium">Awaiting Verification</p>
                    <p className="text-xs mt-1">Upload an image to begin analysis</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                {!result || !result.match || confidencePct < 90 ? (
                  <button
                    onClick={handleVerify}
                    disabled={(!uavFile && !uavPreview) || loading || !complaint.attachmentUrl}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">memory</span>
                        {result && !result.match ? "Re-Analyze Images" : "Analyze Images"}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={onConfirm}
                    disabled={isUpdating}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg font-variation-fill">check_circle</span>
                        Confirm Completed
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

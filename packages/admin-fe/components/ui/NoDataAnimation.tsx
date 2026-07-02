"use client"

import { useEffect, useRef } from "react"

export default function NoDataAnimation({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    const loadLottie = async () => {
      if (!mounted || !containerRef.current) return

      // load lottie-web from CDN if not already present
      const ensure = () =>
        new Promise<void>((resolve, reject) => {
          if ((window as any).lottie) return resolve()
          const s = document.createElement("script")
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.10.2/lottie.min.js"
          s.async = true
          s.onload = () => resolve()
          s.onerror = (e) => reject(e)
          document.body.appendChild(s)
        })

      try {
        await ensure()
        if (!mounted || !containerRef.current) return
        const lottie = (window as any).lottie
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "/No-Data.json",
        })
      } catch (err) {
        // failed to load lottie; fall back to simple text
      }
    }

    loadLottie()

    return () => {
      mounted = false
      if (animRef.current) {
        try {
          animRef.current.destroy()
        } catch (e) {}
      }
    }
  }, [])

  return (
    <div className={`w-full flex items-center justify-center py-12 ${className || ""}`}>
      <div ref={containerRef} style={{ width: 360, height: 240 }} />
    </div>
  )
}

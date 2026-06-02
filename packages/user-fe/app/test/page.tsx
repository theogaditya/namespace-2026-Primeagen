"use client"
import React, { useState, useCallback, useEffect } from "react"
import { validateImage } from "../../lib/api/imageValidation"

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault()
    setDragOver(false)
    const f = ev.dataTransfer.files && ev.dataTransfer.files[0]
    if (f && f.type.startsWith("image/")) setFile(f)
  }, [])

  const onDragOver = useCallback((ev: React.DragEvent) => {
    ev.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setDragOver(false), [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError("Please choose an image file before submitting")
      return
    }

    setLoading(true)
    try {
      const data = await validateImage(file)
      setResult(data)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "80vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 96, // keep below typical navbar
    paddingBottom: 48,
  }

  const cardStyle: React.CSSProperties = {
    width: 560,
    padding: 24,
    border: "1px solid #e6eef6",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(11,22,39,0.06)",
    background: "linear-gradient(180deg,#ffffff,#fbfdff)",
  }

  const dropZoneStyle: React.CSSProperties = {
    height: 220,
    border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    cursor: 'pointer',
    background: dragOver ? 'rgba(37,99,235,0.04)' : 'transparent'
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>Image Validation Test</h2>
        <p style={{ marginTop: 0, marginBottom: 18, color: '#475569' }}>Drop an image here or click to choose. The image will be sent to the validation service and the result displayed below.</p>

        <div
          style={dropZoneStyle}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', color: dragOver ? '#1e3a8a' : '#64748b' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Drop image here</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>or click to select (PNG, JPG)</div>
            </div>
          )}
          <input id="file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={(ev) => setFile(ev.target.files ? ev.target.files[0] : null)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={submit} disabled={loading} style={{ padding: '10px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>
            {loading ? 'Checking...' : 'Validate Image'}
          </button>
          <button onClick={() => { setFile(null); setResult(null); setError(null) }} style={{ padding: '10px 14px', background: '#f1f5f9', border: 'none', borderRadius: 8 }}>
            Reset
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          {error && <div style={{ color: '#b91c1c' }}>Error: {error}</div>}

          {result && (
            <div style={{ marginTop: 8, color: '#0f172a' }}>
              <div><strong>Sector:</strong> {String(result.sector)}</div>
              <div><strong>Category:</strong> {String(result.category)}</div>
              <div><strong>Is Valid:</strong> {String(result.is_valid)}</div>
              <div><strong>Source:</strong> {String(result.source)}</div>
              <div><strong>Confidence VLM:</strong> {String(result.confidence_vlm)}</div>
              <div><strong>Confidence VIT:</strong> {String(result.confidence_vit)}</div>

              {result.is_valid ? (
                <div style={{ marginTop: 12, color: '#065f46', fontWeight: 600 }}>Image is valid ✅</div>
              ) : (
                <div style={{ marginTop: 12, color: '#92400e', fontWeight: 600 }}>Image is invalid ❌</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

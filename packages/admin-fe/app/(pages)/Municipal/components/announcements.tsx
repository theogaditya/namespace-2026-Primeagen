"use client"

import { useState, useEffect, useCallback } from "react"

/* ───── Types ───── */
type Announcement = {
  id: string
  title: string
  content: string
  priority: number
  isActive: boolean
  startsAt: string
  expiresAt: string | null
  createdAt: string
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
  }
}

/* ───── Card Preview (matches user-fe dashboard card) ───── */
function CardPreview({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">ANNOUNCEMENTS</p>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-emerald-600 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-snug">{title || "Announcement Title"}</p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{content || "Announcement details will appear here."}</p>
        </div>
      </div>
    </div>
  )
}

/* ───── Main Component ───── */
export function MunicipalAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)

  // form fields
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [startsAt, setStartsAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/municipal-admin/announcements`, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) setAnnouncements(json.data)
    } catch (err) {
      console.error("Failed to fetch announcements", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const resetForm = () => {
    setTitle("")
    setContent("")
    setPriority(0)
    setIsActive(true)
    setStartsAt("")
    setExpiresAt("")
    setEditing(null)
    setFormOpen(false)
  }

  const openNew = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (a: Announcement) => {
    setTitle(a.title)
    setContent(a.content)
    setPriority(a.priority)
    setIsActive(a.isActive)
    setStartsAt(a.startsAt ? new Date(a.startsAt).toISOString().slice(0, 16) : "")
    setExpiresAt(a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : "")
    setEditing(a)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      const body: any = { title, content, priority, isActive }
      if (startsAt) body.startsAt = new Date(startsAt).toISOString()
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString()
      else body.expiresAt = null

      if (editing) {
        await fetch(`${API}/api/municipal-admin/announcements/${editing.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`${API}/api/municipal-admin/announcements`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        })
      }
      resetForm()
      fetchAnnouncements()
    } catch (err) {
      console.error("Failed to save announcement", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return
    try {
      await fetch(`${API}/api/municipal-admin/announcements/${id}`, { method: "DELETE", headers: authHeaders() })
      fetchAnnouncements()
    } catch (err) {
      console.error("Failed to delete announcement", err)
    }
  }

  const handleToggle = async (a: Announcement) => {
    // optimistic
    setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: !x.isActive } : x)))
    try {
      await fetch(`${API}/api/municipal-admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !a.isActive }),
      })
    } catch {
      // revert
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: a.isActive } : x)))
    }
  }

  const isExpired = (a: Announcement) => a.expiresAt && new Date(a.expiresAt) < new Date()

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage public announcements for your municipality</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#115cb9] hover:bg-[#0e4d9a] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left: Announcements List ─── */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-6 h-6 border-2 border-[#115cb9] border-t-transparent rounded-full" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">campaign</span>
              <p className="text-sm font-semibold text-slate-500">No announcements yet</p>
              <p className="text-xs text-slate-400 mt-1">Click "New Announcement" to create your first one.</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${
                  !a.isActive || isExpired(a) ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-emerald-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{a.title}</p>
                      {a.priority > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">P{a.priority}</span>
                      )}
                      {isExpired(a) && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Expired</span>
                      )}
                      {!a.isActive && !isExpired(a) && (
                        <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded">Inactive</span>
                      )}
                      {a.isActive && !isExpired(a) && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Created {new Date(a.createdAt).toLocaleDateString()}
                      {a.expiresAt && <> · Expires {new Date(a.expiresAt).toLocaleDateString()}</>}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(a)}
                      title={a.isActive ? "Deactivate" : "Activate"}
                      className={`p-1.5 rounded-lg transition-colors ${
                        a.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{a.isActive ? "toggle_on" : "toggle_off"}</span>
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#115cb9] hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── Right: Form + Preview ─── */}
        <div className="lg:col-span-2">
          {formOpen ? (
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4 sticky top-20">
              <h2 className="text-base font-bold text-slate-900">{editing ? "Edit Announcement" : "New Announcement"}</h2>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Title</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#115cb9] focus:border-[#115cb9] outline-none transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled maintenance in Sector 4"
                  maxLength={120}
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Announcement Text <span className="text-slate-400">({content.length}/280)</span>
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#115cb9] focus:border-[#115cb9] outline-none transition resize-none"
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 280))}
                  placeholder="Water supply may be affected this Thursday between 10 AM - 4 PM."
                  maxLength={280}
                />
              </div>

              {/* Preview */}
              {(title || content) && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Live Card Preview</label>
                  <CardPreview title={title} content={content} />
                </div>
              )}

              {/* Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Priority (0–10)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#115cb9] focus:border-[#115cb9] outline-none transition"
                    value={priority}
                    onChange={(e) => setPriority(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={10}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="text-xs font-semibold text-slate-600">Active</label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Starts At</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#115cb9] focus:border-[#115cb9] outline-none transition"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Expires At</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-[#115cb9] focus:border-[#115cb9] outline-none transition"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !content.trim()}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#115cb9] hover:bg-[#0e4d9a] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Update" : "Save Announcement"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sticky top-20">
              <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">edit_note</span>
              <p className="text-sm text-slate-500">Select an announcement to edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

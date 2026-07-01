"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"
import { useCivicPartnerAuth, CivicPartner } from "@/hooks/useCivicPartnerAuth"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  isPublic: boolean
  _count?: { responses: number; questions: number }
}

export default function CivicPartnerSettingsPage() {
  const router = useRouter()
  const { partner, isLoading, logout } = useCivicPartnerAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [cachedPartner, setCachedPartner] = useState<CivicPartner | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggleVisibility = async (survey: Survey) => {
    setTogglingId(survey.id)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${survey.id}/visibility`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isPublic: data.survey.isPublic } : s))
      }
    } catch (err) { console.error(err) } finally { setTogglingId(null) }
  }

  useEffect(() => {
    // Immediate load from local cache for instant visibility
    const raw = localStorage.getItem("civicPartner")
    if (raw) setCachedPartner(JSON.parse(raw))

    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setSurveys(data.surveys ?? [])
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [])

  const displayPartner = partner ?? cachedPartner

  return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h2 className="text-3xl font-black text-black tracking-tight">Portal Settings</h2>
              <p className="text-sm text-gray-400 mt-1 font-medium">Manage your civic organization profile and active campaigns.</p>
           </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
           {/* Profile Section */}
           <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                 <h3 className="text-lg font-bold text-black mb-8">Organization Profile</h3>

                 {!displayPartner ? (
                    <div className="space-y-4 animate-pulse">
                       {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl" />)}
                    </div>
                 ) : (
                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Legal Name</label>
                             <div className="h-12 w-full flex items-center px-5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-black">{displayPartner.orgName}</div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Official Email</label>
                             <div className="h-12 w-full flex items-center px-5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-black">{displayPartner.officialEmail}</div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Primary State</label>
                             <div className="h-12 w-full flex items-center px-5 bg-gray-50 border border-gray-100 rounded-xl font-bold font-outfit text-black">{displayPartner.state}</div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Headquarter District</label>
                             <div className="h-12 w-full flex items-center px-5 bg-gray-50 border border-gray-100 rounded-xl font-bold font-outfit text-black">{displayPartner.district || 'N/A'}</div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Entity Type</label>
                             <div className="h-12 w-full flex items-center px-5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-black uppercase tracking-tight">{displayPartner.orgType?.replace(/_/g, ' ')}</div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

              {/* Campaign Table in Settings */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-black">Campaign Controls</h3>
                    <span className="text-xs font-black text-brand-500 bg-brand-50 px-3 py-1 rounded-full uppercase">{surveys.length} Registered</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                             <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Survey Title</th>
                             <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                          {surveys.slice(0, 10).map(s => (
                             <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-5">
                                   <p className="text-sm font-bold text-black tracking-tight">{s.title}</p>
                                   <div className="flex items-center gap-2 mt-1">
                                     <span className="text-[10px] font-black text-emerald-500 uppercase">{s.status}</span>
                                     {s.status === 'CLOSED' && (
                                       <span className={cn(
                                         'text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full',
                                         s.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                                       )}>
                                         {s.isPublic ? 'Public' : 'Private'}
                                       </span>
                                     )}
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                                   {s.status === 'CLOSED' && (
                                     <button
                                       onClick={() => handleToggleVisibility(s)}
                                       disabled={togglingId === s.id}
                                       className={cn(
                                         'text-xs font-black px-3 py-1.5 rounded-lg transition-all',
                                         s.isPublic
                                           ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                           : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
                                         togglingId === s.id && 'opacity-50 cursor-not-allowed'
                                       )}
                                     >
                                       {togglingId === s.id ? '...' : s.isPublic ? 'Make Private' : 'Make Public'}
                                     </button>
                                   )}
                                   <button onClick={() => router.push(`/CivicPartner/surveys/${s.id}`)} className="text-xs font-black text-brand-500 hover:underline">Manage Center &rarr;</button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           {/* Sidebar Options */}
           <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
                 <div className={cn("h-20 w-20 rounded-3xl mx-auto flex items-center justify-center text-white mb-6 shadow-xl rotate-3 transition-transform hover:rotate-0", displayPartner?.isVerified ? "bg-brand-500" : "bg-amber-500")}>
                    <span className="material-symbols-outlined text-4xl">{displayPartner?.isVerified ? 'verified' : 'pending'}</span>
                 </div>
                 <h4 className="text-xl font-black text-black mb-2">{displayPartner?.isVerified ? 'Official Account' : 'Security Check Pending'}</h4>
                 <p className="text-xs text-gray-400 font-medium leading-relaxed px-4">Account verification ensures trust with citizens and unlocks high-volume response limits.</p>

                 <div className="mt-10 space-y-3">
                    <button onClick={() => router.push("/CivicPartner/help")} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">Support Center</button>
                    <button onClick={logout} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 text-sm font-black hover:bg-red-500 hover:text-white transition-all">Logout Identity</button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

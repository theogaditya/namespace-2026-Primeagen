"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  category: string
  createdAt: string
  _count?: { responses: number }
}

export default function SurveysListPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const url = filter === "ALL" ? `${API}/api/civic-partner/surveys` : `${API}/api/civic-partner/surveys?status=${filter}`
        const res = await fetch(url, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setSurveys(data.surveys ?? [])
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [filter])

  const filteredSurveys = surveys.filter(s => s.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h2 className="text-3xl font-black text-black tracking-tight">Campaign Inventory</h2>
              <p className="text-sm text-gray-400 font-medium">Manage and monitor all your active civic participation campaigns.</p>
           </div>
           <button 
             onClick={() => router.push("/CivicPartner/surveys/new")} 
             className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 flex items-center gap-2 uppercase tracking-tighter hover:bg-[#3451D1] transition-all"
           >
              <span className="material-symbols-outlined text-sm font-bold">add</span> New Campaign
           </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
           {/* Elite Filter Bar - Synchronized with Photo */}
           <div className="p-8 border-b border-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    {["ALL", "PUBLISHED", "DRAFT"].map(f => (
                      <button key={f} onClick={() => setFilter(f)} className={cn("px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", filter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600")}>{f}</button>
                    ))}
                 </div>
                 
                 {/* This matches the 'white box' screenshot geometry */}
                 <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-gray-200 w-80 shadow-xs focus-within:shadow-md transition-all">
                    <span className="material-symbols-outlined text-gray-300 text-lg">search</span>
                    <input 
                      type="text" 
                      placeholder="Search campaigns..." 
                      className="bg-transparent border-none outline-none text-xs text-gray-600 font-bold w-full" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                 </div>
              </div>

              <div className="flex items-center gap-2">
                 <button className="h-10 px-6 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-400 hover:bg-gray-50 uppercase tracking-widest flex items-center gap-2 transition-all shadow-xs">
                    <span className="material-symbols-outlined text-sm">filter_alt</span> Type: All
                 </button>
                 <button 
                   onClick={() => {/* CSV logic */}}
                   className="h-10 px-6 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-400 hover:bg-gray-50 uppercase tracking-widest flex items-center gap-2 transition-all shadow-xs"
                 >
                    <span className="material-symbols-outlined text-sm">download</span> Export
                 </button>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                    <tr className="border-b border-gray-100">
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Survey Identification</th>
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Engagement</th>
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {loading ? [1,2,3].map(i => <tr key={i} className="animate-pulse"><td className="px-8 py-6"><div className="h-4 w-48 bg-gray-50 rounded" /></td><td className="px-8 py-6"><div className="h-5 w-20 bg-gray-50 rounded-full mx-auto" /></td><td className="px-8 py-6"><div className="h-8 w-8 bg-gray-50 rounded ml-auto" /></td></tr>) : 
                     filteredSurveys.map(sv => (
                      <tr key={sv.id} className="hover:bg-gray-50/30 cursor-pointer group transition-colors" onClick={() => router.push(`/CivicPartner/surveys/${sv.id}`)}>
                         <td className="px-8 py-5">
                            <p className="font-black text-gray-900 group-hover:text-brand-500 transition-colors uppercase tracking-tight">{sv.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase", sv.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>{sv.status}</span>
                               <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Added {new Date(sv.createdAt).toLocaleDateString()}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <p className="text-sm font-black text-black">{(sv._count?.responses || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Citizens</p>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <button className="h-9 w-9 bg-gray-50 rounded-xl text-gray-400 hover:bg-brand-50 hover:text-brand-500 transition-all focus:ring-4 ring-brand-50">
                               <span className="material-symbols-outlined text-xl">visibility</span>
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

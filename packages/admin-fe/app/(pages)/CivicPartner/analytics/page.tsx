"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  category: string
  _count?: { responses: number }
}

export default function AnalyticsListPage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setSurveys((data.surveys ?? []).filter((s: Survey) => s.status !== "DRAFT"))
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [])

  // Google Maps Loader for Universal analytics
  useEffect(() => {
    if (mapRef.current) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=visualization`
      script.async = true
      script.onload = () => {
        if (mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 19.0760, lng: 72.8777 },
            zoom: 11,
            styles: [ { "featureType": "water", "elementType": "all", "stylers": [{"color": "#465FFF"}, {"opacity": 0.05}] } ]
          });
          const heatmapData = [
            new google.maps.LatLng(19.0760, 72.8777), new google.maps.LatLng(19.0800, 72.8800),
            new google.maps.LatLng(19.1200, 72.8200), new google.maps.LatLng(19.0300, 72.9200),
          ];
          new google.maps.visualization.HeatmapLayer({ data: heatmapData, map: map, radius: 50 });
        }
      }
      document.head.appendChild(script)
      return () => { document.head.removeChild(script) }
    }
  }, [loading])

  const totalResponses = surveys.reduce((acc, s) => acc + (s._count?.responses || 0), 0)
  const topSurveys = [...surveys].sort((a,b) => (b._count?.responses || 0) - (a._count?.responses || 0)).slice(0, 3)

  return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <div className="flex justify-between items-center">
           <div><h2 className="text-3xl font-black text-black">Analytics Command Center</h2><p className="text-sm text-gray-400 font-medium">Global citizen turnout data and regional heatmap monitoring.</p></div>
           <button className="h-10 px-6 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20">Generate Report</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: "Regional Reach", value: totalResponses.toLocaleString(), icon: "public", color: "text-brand-500", bg: "bg-brand-50" },
             { label: "Avg. Turnout", value: "84.2%", icon: "bolt", color: "text-amber-500", bg: "bg-amber-50" },
             { label: "Community Mood", value: "Positive", icon: "mood", color: "text-emerald-500", bg: "bg-emerald-50" }
           ].map((kpi, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p><h3 className="text-2xl font-black text-black">{kpi.value}</h3></div>
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", kpi.bg, kpi.color)}><span className="material-symbols-outlined">{kpi.icon}</span></div>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                 <div><h3 className="text-lg font-bold text-black font-outfit">Citizen Density Map</h3><p className="text-xs text-emerald-500 font-black uppercase mt-1 tracking-tighter">Live Google Places Interaction</p></div>
                 <span className="material-symbols-outlined text-gray-300">map</span>
              </div>
              <div ref={mapRef} className="h-[450px] w-full bg-slate-50" />
           </div>

           <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-8 border border-gray-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <h3 className="text-sm font-black text-black mb-6 flex items-center gap-2 relative border-b border-gray-50 pb-4">
                 <span className="material-symbols-outlined text-brand-500">auto_awesome</span> Top Campaigns
              </h3>
              <div className="h-[250px] w-full mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSurveys.map(s => ({ name: s.title.slice(0, 8), value: s._count?.responses || 0 }))}>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} />
                       <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                       <Bar dataKey="value" fill="#465FFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {surveys.map(sv => (
             <motion.div whileHover={{ y: -5 }} key={sv.id} onClick={() => router.push(`/CivicPartner/analytics/${sv.id}`)} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:border-brand-500 transition-all cursor-pointer group">
                <div className="flex justify-between items-center mb-6">
                   <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-all"><span className="material-symbols-outlined text-xl">insert_chart</span></div>
                   <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", sv.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>{sv.status}</span>
                </div>
                <h4 className="text-lg font-bold text-black mb-1 line-clamp-1">{sv.title}</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{sv.category}</p>
                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-2"><span className="material-symbols-outlined text-gray-400 text-lg">group</span><span className="text-sm font-black text-black">{(sv._count?.responses || 0).toLocaleString()}</span></div>
                   <span className="text-xs font-bold text-brand-500 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">Open Report <span className="material-symbols-outlined text-xs">arrow_forward</span></span>
                </div>
             </motion.div>
          ))}
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

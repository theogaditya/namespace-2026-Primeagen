"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "./_layout"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { cn } from "@/lib/utils"
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

const interactionStats = [
  { name: 'Jan', value: 400 }, { name: 'Feb', value: 121 }, { name: 'Mar', value: 650 },
  { name: 'Apr', value: 180 }, { name: 'May', value: 920 }, { name: 'Jun', value: 340 }
];

const targetData = [
  { name: 'Reached', value: 75.5, color: '#465FFF' }, { name: 'Remaining', value: 24.5, color: '#F3F4F6' }
];

export default function CivicPartnerDashboard() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ responses: 0, surveys: 0, drafts: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          const all = data.surveys ?? []
          setStats({
            responses: all.reduce((acc: number, s: any) => acc + (s._count?.responses || 0), 0),
            surveys: all.filter((s: any) => s.status === 'PUBLISHED').length,
            drafts: all.filter((s: any) => s.status === 'DRAFT').length
          })
        }
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!loading && mapRef.current) {
         const initMap = () => {
            if (mapRef.current) {
               const g = (globalThis as any).google;
               if (g && g.maps) {
                  const map = new g.maps.Map(mapRef.current, {
                     center: { lat: 20.5937, lng: 78.9629 }, zoom: 4,
                     styles: [ { "featureType": "water", "elementType": "all", "stylers": [{"color": "#465FFF"}, {"opacity": 0.05}] } ],
                     mapTypeControl: true,
                     streetViewControl: true,
                     rotateControl: true,
                     zoomControl: true,
                     fullscreenControl: true,
                  });
                  const heatmapPoints = [ new g.maps.LatLng(19.0760, 72.8777), new g.maps.LatLng(28.6139, 77.2090) ];
                  new g.maps.visualization.HeatmapLayer({ data: heatmapPoints, map: map, radius: 40 });
               } else {
                  console.warn("[CivicPartner] google maps not available when initializing map");
               }
            }
         }

      // If Google Maps is already loaded, just init the map
         if ((globalThis as any).google?.maps) {
        initMap()
        return
      }

      // Check if script already exists in DOM
      const existing = document.querySelector(`script[src*="maps.googleapis.com"]`)
      if (existing) {
        existing.addEventListener('load', initMap)
        return
      }

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=visualization`
      script.async = true
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [loading])

  return (
    <CivicPartnerLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
         <div>
            <h2 className="text-3xl font-black text-black tracking-tight">Dashboard Overview</h2>
            <p className="text-sm text-gray-400 font-medium">Welcome back to your civic command center.</p>
         </div>
         <button
           onClick={() => router.push("/CivicPartner/surveys/new")}
           className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 hover:bg-[#3451D1] transition-all flex items-center gap-2 uppercase tracking-tighter"
         >
            <span className="material-symbols-outlined text-sm font-bold">add</span> New Campaign
         </button>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6 pb-20">

        {/* Metric Cards - Official Pixel Sync */}
        <div className="col-span-12 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
           {[
             { label: "Community", value: stats.responses.toLocaleString(), trend: "11.01%", up: true, icon: "groups" },
             { label: "Campaigns", value: stats.surveys.toString(), trend: "4.35%", up: true, icon: "campaign" },
             { label: "Success Rate", value: "84.2%", trend: "2.59%", up: true, icon: "fact_check" },
             { label: "Drafts", value: stats.drafts.toString(), trend: "0.95%", up: false, icon: "edit_document" }
           ].map((kpi, i) => (
             <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-xs">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
                   <span className="material-symbols-outlined text-gray-800 text-xl font-medium">{kpi.icon}</span>
                </div>
                <div className="flex items-end justify-between mt-5">
                   <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">{kpi.label}</span>
                      <h4 className="mt-2 font-black text-gray-800 text-2xl tracking-tighter">{kpi.value}</h4>
                   </div>
                   <div className={cn("px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1", kpi.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                      <span className="material-symbols-outlined text-xs">{kpi.up ? 'arrow_upward' : 'arrow_downward'}</span> {kpi.trend}
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Campaign Metrics Hub - Pie Chart with Legend Sync */}
        <div className="col-span-12 xl:col-span-5 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs flex flex-col justify-between">
           <div>
              <div className="flex justify-between items-center mb-6">
                 <div><h3 className="text-lg font-bold text-gray-800">Campaign Categories</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Distribution across sectors</p></div>
                 <span className="material-symbols-outlined text-gray-300">pie_chart</span>
              </div>
              <div className="h-[240px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={[
                           { name: "Infrastructure", val: 400, fill: "#465FFF" },
                           { name: "Public Safety", val: 300, fill: "#10B981" },
                           { name: "Health", val: 240, fill: "#F59E0B" },
                           { name: "Education", val: 180, fill: "#EF4444" },
                           { name: "Others", val: 100, fill: "#6366F1" }
                         ]}
                         dataKey="val"
                         innerRadius={50}
                         outerRadius={80}
                         paddingAngle={4}
                       />
                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Custom Legend - Sync with User Component */}
           <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center border-t border-gray-50 pt-6">
              {[
                { name: "Infrastructure", c: "#465FFF" }, { name: "Safety", c: "#10B981" },
                { name: "Health", c: "#F59E0B" }, { name: "Edu", c: "#EF4444" }, { name: "Other", c: "#6366F1" }
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.c }} />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{l.name}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Interactions Chart - Official Area Sync */}
        <div className="col-span-12 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
           <div className="flex justify-between items-center mb-10">
              <div><h3 className="text-lg font-bold text-gray-800">Engagement Demographics</h3><p className="text-xs text-gray-400 mt-1 uppercase font-black">Regional citizen interaction pulse</p></div>
              <div className="flex gap-2">
                 <button className="px-4 py-1.5 bg-gray-50 text-[10px] font-black uppercase text-gray-400 rounded-lg hover:bg-gray-100 transition-colors">7D</button>
                 <button className="px-4 py-1.5 bg-brand-50 text-[10px] font-black uppercase text-brand-500 rounded-lg">30D</button>
              </div>
           </div>
           <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={interactionStats} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#465FFF" stopOpacity={0.1}/><stop offset="95%" stopColor="#465FFF" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#465FFF" strokeWidth={3} fill="url(#areaGrad)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Participation Source Hub - Multiple Bar Chart Sync */}
        <div className="col-span-12 xl:col-span-5 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs flex flex-col justify-between">
           <div>
              <div className="flex justify-between items-center mb-10">
                 <div><h3 className="text-lg font-bold text-gray-800">Participation Source</h3><p className="text-xs text-gray-400 mt-1 uppercase font-black font-outfit">Direct vs. Mobile participation</p></div>
                 <span className="material-symbols-outlined text-gray-300">bar_chart</span>
              </div>
              <div className="h-[200px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interactionStats} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 700}} tickMargin={10} tickFormatter={(value) => value.slice(0, 3)} />
                       <Tooltip cursor={{fill: '#F1F4FF'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                       <Bar dataKey="value" name="Direct" fill="#465FFF" radius={4} barSize={12} />
                       <Bar dataKey="target" name="Mobile" fill="#C7D2FE" radius={4} barSize={12} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
           <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-black text-gray-800">
                 Trending up by 5.2% this month <span className="material-symbols-outlined text-emerald-500 text-sm font-bold">trending_up</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Showing total visitors for the last 6 months</p>
           </div>
        </div>

        {/* Live Interactions Table - Sync with Recent Orders */}
        <div className="col-span-12 xl:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
           <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Recent Participation</h3>
              <div className="flex gap-2">
                 <button className="px-4 py-2 border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest">Filter</button>
                 <button className="px-4 py-2 border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest">See All</button>
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left font-outfit">
                 <thead>
                    <tr className="bg-gray-50/50 border-y border-gray-100 uppercase tracking-widest text-[10px] text-gray-400 font-black">
                       <th className="px-8 py-4">Citizen Identity</th>
                       <th className="px-8 py-4">District</th>
                       <th className="px-8 py-4">Security</th>
                       <th className="px-8 py-4 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 uppercase tracking-tight">
                    {[
                      { name: "Rahul S.", district: "Maharashtra", stat: "Verified", time: "2m ago" },
                      { name: "Anita K.", district: "Delhi NCR", stat: "Pending", time: "5m ago" },
                      { name: "Vikram P.", district: "West Bengal", stat: "Verified", time: "12m ago" },
                      { name: "Priya M.", district: "Karnataka", stat: "Verified", time: "18m ago" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/20 transition-all cursor-pointer">
                         <td className="px-8 py-4"><div className="flex items-center gap-3"><div className="h-10 w-10 bg-[#F1F4FF] text-[#465FFF] flex items-center justify-center rounded-xl font-black text-xs shadow-sm">{row.name.charAt(0)}</div><div><p className="text-sm font-black text-gray-800 leading-tight">{row.name}</p><p className="text-[10px] font-bold text-gray-400 mt-1">{row.time}</p></div></div></td>
                         <td className="px-8 py-4 text-xs font-bold text-gray-500">{row.district}</td>
                         <td className="px-8 py-4 text-xs font-bold text-gray-500">{row.stat}</td>
                         <td className="px-8 py-4 text-right"><span className={cn("px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm", row.stat === 'Verified' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>{row.stat}</span></td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Global Hotspots Hub - Restored India Map */}
        <div className="col-span-12 bg-white rounded-2xl border border-gray-200 p-8 shadow-xs">
           <div className="flex justify-between items-center mb-10">
              <div><h3 className="text-lg font-bold text-gray-800">District Intelligence Hub</h3><p className="text-xs text-gray-400 mt-1 uppercase font-black">Real-time heatmaps for Indian civic turnout</p></div>
              <span className="material-symbols-outlined text-brand-500 text-2xl">public</span>
           </div>
           <div className="grid grid-cols-12 gap-10">
              <div className="col-span-12 lg:col-span-8">
                 <div ref={mapRef} className="h-[400px] w-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-inner" />
              </div>
              <div className="col-span-12 lg:col-span-4 flex flex-col justify-center space-y-8">
                 {[
                   { name: "Maharashtra", val: "79%", w: "79%", c: "bg-[#465FFF]" },
                   { name: "Delhi NCR", val: "54%", w: "54%", c: "bg-emerald-500" },
                   { name: "Karnataka", val: "23%", w: "23%", c: "bg-amber-500" },
                   { name: "West Bengal", val: "12%", w: "12%", c: "bg-red-500" }
                 ].map((d, i) => (
                    <div key={i}>
                       <div className="flex items-center justify-between mb-3"><p className="text-sm font-black text-gray-800">{d.name}</p><p className="text-xs font-black text-gray-900">{d.val}</p></div>
                       <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100"><div className={cn("h-full rounded-full transition-all duration-1000", d.c)} style={{ width: d.w }} /></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

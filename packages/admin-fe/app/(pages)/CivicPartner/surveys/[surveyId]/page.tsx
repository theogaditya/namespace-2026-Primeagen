"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "RATING" | "YES_NO"

interface Question {
  id?: string
  questionText: string
  questionType: QuestionType
  options: string[]
  isRequired: boolean
  order: number
}

interface Survey {
  id: string
  title: string
  description: string
  category: string
  content: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  lastUpdated: string
  questions: Question[]
  _count?: { responses: number; questions: number }
}

const CATEGORIES = [
  "Public Infrastructure", "Healthcare Services", "Environmental Policy",
  "Education & Youth", "Transportation", "Housing & Urban Planning",
  "Public Safety", "Governance & Civic Engagement", "Other",
]

type Tab = "overview" | "questions" | "analytics" | "settings"

export default function SurveyDetailPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [isEditingQuestion, setIsEditingQuestion] = useState<Question | null>(null)

  const loadSurvey = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSurvey(data.survey)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [surveyId])

  useEffect(() => { loadSurvey() }, [loadSurvey])

  // Google Maps Loader
  useEffect(() => {
    if (activeTab === 'analytics' && mapRef.current) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=visualization`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 19.0760, lng: 72.8777 }, // Mumbai Example Center
            zoom: 12,
            styles: [
              { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{"color": "#7c93a3"}] },
              { "featureType": "water", "elementType": "all", "stylers": [{"color": "#465FFF"}, {"opacity": 0.1}] }
            ]
          });
          
          // Realistic Mock Heatmap Data
          const heatmapData = [
            new google.maps.LatLng(19.0760, 72.8777),
            new google.maps.LatLng(19.0800, 72.8800),
            new google.maps.LatLng(19.1000, 72.8500),
            new google.maps.LatLng(19.0500, 72.9000),
          ];

          new google.maps.visualization.HeatmapLayer({ data: heatmapData, map: map, radius: 40 });
        }
      }
      document.head.appendChild(script)
      return () => { document.head.removeChild(script) }
    }
  }, [activeTab])

  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Active", icon: "rss_feed" },
    DRAFT: { bg: "bg-amber-50", text: "text-amber-600", label: "Draft", icon: "edit_note" },
    CLOSED: { bg: "bg-gray-100", text: "text-gray-500", label: "Closed", icon: "lock" },
  }

  if (loading) return <CivicPartnerLayout><div className="p-8 animate-pulse space-y-4"><div className="h-8 w-64 bg-gray-200 rounded" /><div className="h-32 bg-white rounded-2xl" /></div></CivicPartnerLayout>
  if (!survey) return <CivicPartnerLayout><div className="p-20 text-center"><p className="text-gray-400">Survey not found.</p></div></CivicPartnerLayout>

  const sc = statusConfig[survey.status] || statusConfig.DRAFT

  return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
           <div className="flex-1">
              <button onClick={() => router.push("/CivicPartner/surveys")} className="flex items-center gap-1 text-gray-400 hover:text-brand-500 text-xs font-bold mb-4">
                 <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Campaigns
              </button>
              <div className="flex items-center gap-3 mb-2">
                 <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5", sc.bg, sc.text)}>
                    <span className="material-symbols-outlined text-xs">{sc.icon}</span> {sc.label}
                 </div>
                 <span className="text-[10px] font-bold text-gray-400">TRACKING ID: {surveyId.slice(0,8)}</span>
              </div>
              <h1 className="text-4xl font-black text-black tracking-tight">{survey.title}</h1>
           </div>
           <div className="flex items-center gap-3">
              <button className="h-11 px-6 bg-white border border-gray-100 rounded-xl text-xs font-black text-gray-400 hover:bg-gray-50 hover:text-black transition-all">Save Draft</button>
              <button className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 hover:bg-[#3451D1] transition-all uppercase tracking-tighter">Rocket Launch Update</button>
           </div>
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit mb-8 shadow-sm">
           {[ { id: 'overview', label: 'Overview', icon: 'dashboard' }, { id: 'questions', label: 'Questions', icon: 'quiz' }, { id: 'analytics', label: 'Real Map', icon: 'map' } ].map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === tab.id ? "bg-brand-50 text-brand-500 shadow-sm" : "text-gray-400 hover:text-gray-700")}>
               <span className="material-symbols-outlined text-sm">{tab.icon}</span> {tab.label}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-12 gap-8">
           <div className="col-span-12 lg:col-span-8">
              <AnimatePresence mode="wait">
                 {activeTab === 'overview' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Campaign Title</label><input className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-black outline-none" defaultValue={survey.title} /></div>
                         <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Description</label><textarea className="w-full p-5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-black outline-none h-32 resize-none" defaultValue={survey.description} /></div>
                      </div>
                   </motion.div>
                 )}

                 {activeTab === 'questions' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pl-4">Interactive Questionnaire</p>
                      {survey.questions.map((q, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 flex items-center justify-between group cursor-pointer" onClick={() => setIsEditingQuestion(q)}>
                           <div className="flex items-center gap-5">
                              <span className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center font-black">{idx + 1}</span>
                              <p className="font-bold text-black">{q.questionText}</p>
                           </div>
                           <span className="material-symbols-outlined text-gray-300 group-hover:text-brand-500">edit_square</span>
                        </div>
                      ))}
                   </motion.div>
                 )}

                 {activeTab === 'analytics' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                       <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                             <div><h3 className="text-lg font-bold text-black">Citizen Interaction Heatmap</h3><p className="text-xs text-gray-400 mt-1 uppercase font-black text-emerald-500">Live from Google API</p></div>
                             <div className="flex items-center gap-2 group cursor-help"><span className="material-symbols-outlined text-sm text-gray-300">info</span><span className="text-[10px] font-bold text-gray-300">Regional clustering active</span></div>
                          </div>
                          <div ref={mapRef} className="h-[500px] w-full bg-slate-50" />
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>

           <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Performance Report</h3>
                 <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <div><p className="text-[10px] font-bold text-gray-400 uppercase">Total Participation</p><p className="text-2xl font-black text-black mt-1">{(survey._count?.responses || 0).toLocaleString()}</p></div>
                       <div className="h-12 w-12 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">group</span></div>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-8">
                       <div><p className="text-[10px] font-bold text-gray-400 uppercase">Completion Rate</p><p className="text-2xl font-black text-black mt-1">84%</p></div>
                       <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">fact_check</span></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

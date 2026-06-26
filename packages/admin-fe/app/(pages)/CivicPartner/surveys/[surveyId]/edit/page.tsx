"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

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
  status: string
  startsAt: string | null
  endsAt: string | null
  questions: Question[]
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Open Text",
  MCQ: "Multiple Choice",
  CHECKBOX: "Checkbox",
  RATING: "Rating (1-5)",
  YES_NO: "Yes / No",
}

const CATEGORIES = [
  "Public Infrastructure",
  "Healthcare Services",
  "Environmental Policy",
  "Education & Youth",
  "Transportation",
  "Housing & Urban Planning",
  "Public Safety",
  "Governance & Civic Engagement",
  "Other",
]

export default function EditSurveyPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Editable fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [content, setContent] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          const sv = data.survey as Survey
          setSurvey(sv)
          setTitle(sv.title)
          setDescription(sv.description)
          setCategory(sv.category)
          setContent(sv.content)
          setQuestions(sv.questions)
          if (sv.startsAt) setStartsAt(sv.startsAt.slice(0, 16))
          if (sv.endsAt) setEndsAt(sv.endsAt.slice(0, 16))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId])

  const addQuestion = () => {
    setQuestions((q) => [
      ...q,
      { questionText: "", questionType: "MCQ", options: [""], isRequired: true, order: q.length + 1 },
    ])
  }

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })))
  }

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ""] } : q))
    )
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    )
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
      )
    )
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          category,
          content: content || description,
          questions: questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: ["MCQ", "CHECKBOX"].includes(q.questionType) ? q.options.filter(Boolean) : [],
            isRequired: q.isRequired,
            order: q.order,
          })),
          startsAt: startsAt || undefined,
          endsAt: endsAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save")
      router.push("/CivicPartner/surveys")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setError("")
    setSaving(true)
    try {
      // Save first
      await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          category,
          content: content || description,
          questions: questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: ["MCQ", "CHECKBOX"].includes(q.questionType) ? q.options.filter(Boolean) : [],
            isRequired: q.isRequired,
            order: q.order,
          })),
        }),
      })

      // Then publish
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/publish`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to publish")
      router.push("/CivicPartner/surveys")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 text-center py-40 text-[#727780]">Loading survey...</div>
      </CivicPartnerLayout>
    )
  }

  if (!survey) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 text-center py-40">
          <p className="text-[#727780] text-lg">Survey not found or you don&apos;t have access.</p>
        </div>
      </CivicPartnerLayout>
    )
  }

  const isDraft = survey.status === "DRAFT"

  return (
    <CivicPartnerLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2
              className="text-3xl font-extrabold text-[#003358] tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {isDraft ? "Edit Survey" : "View Survey"}
            </h2>
            <p className="text-[#42474f] mt-1">
              {isDraft ? "Modify your draft before publishing" : "This survey is no longer editable"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 bg-[#d5ecf8] text-[#003358] font-semibold rounded-xl hover:bg-[#cfe6f2] transition-colors"
            >
              Cancel
            </button>
            {isDraft && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#d5ecf8] text-[#003358] font-semibold rounded-xl hover:bg-[#cfe6f2] transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || questions.length === 0}
                  className="px-6 py-2.5 text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                >
                  {saving ? "Publishing..." : "Publish"}
                </button>
              </>
            )}
          </div>
        </header>

        {error && (
          <div className="max-w-5xl mx-auto mb-6 bg-[#ffdad6] text-[#93000a] p-4 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="max-w-5xl mx-auto space-y-8">
          {/* Basic Info */}
          <section
            className="bg-white p-10 rounded-xl"
            style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
          >
            <h3
              className="text-xl font-bold text-[#003358] mb-6"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Survey Details
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#003358]">Title</label>
                <input
                  className="w-full px-5 py-3 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] disabled:opacity-60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!isDraft}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#003358]">Category</label>
                  <select
                    className="w-full px-5 py-3 bg-[#e6f6ff] border-none rounded-xl text-[#071e27] disabled:opacity-60"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!isDraft}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#003358]">Department</label>
                  <input
                    className="w-full px-5 py-3 bg-[#e6f6ff] border-none rounded-xl text-[#071e27] disabled:opacity-60"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!isDraft}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#003358]">Description</label>
                <textarea
                  className="w-full px-5 py-3 bg-[#e6f6ff] border-none rounded-xl text-[#071e27] resize-none disabled:opacity-60"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isDraft}
                />
              </div>
            </div>
          </section>

          {/* Questions */}
          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <h3
                className="text-xl font-bold text-[#003358]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Questions ({questions.length})
              </h3>
              {isDraft && (
                <button
                  onClick={addQuestion}
                  className="bg-white text-[#006b5e] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#006b5e] hover:text-white transition-all"
                  style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Add Question
                </button>
              )}
            </div>

            {questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-[#003358]">Question {idx + 1}</span>
                  {isDraft && (
                    <button onClick={() => removeQuestion(idx)} className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1 rounded-lg">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    className="w-full px-4 py-3 bg-[#e6f6ff] border-none rounded-xl text-[#071e27] placeholder:text-[#727780] disabled:opacity-60"
                    placeholder="Enter your question..."
                    value={q.questionText}
                    onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                    disabled={!isDraft}
                  />
                  <div className="flex gap-4 items-center">
                    <select
                      className="px-4 py-2 bg-[#e6f6ff] border-none rounded-xl text-sm text-[#003358] disabled:opacity-60"
                      value={q.questionType}
                      onChange={(e) =>
                        updateQuestion(idx, {
                          questionType: e.target.value as QuestionType,
                          options: ["MCQ", "CHECKBOX"].includes(e.target.value)
                            ? q.options.length ? q.options : [""]
                            : [],
                        })
                      }
                      disabled={!isDraft}
                    >
                      {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) => updateQuestion(idx, { isRequired: e.target.checked })}
                        disabled={!isDraft}
                        className="w-4 h-4 rounded text-[#006b5e]"
                      />
                      <span className="text-[#003358] font-medium">Required</span>
                    </label>
                  </div>
                  {["MCQ", "CHECKBOX"].includes(q.questionType) && (
                    <div className="space-y-2 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-[#c1c7d0] flex-shrink-0" />
                          <input
                            className="flex-1 px-3 py-2 bg-[#f3faff] border-none rounded-lg text-sm text-[#071e27] disabled:opacity-60"
                            placeholder={`Option ${oIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                            disabled={!isDraft}
                          />
                          {isDraft && q.options.length > 1 && (
                            <button onClick={() => removeOption(idx, oIdx)} className="text-[#727780] hover:text-[#ba1a1a]">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          )}
                        </div>
                      ))}
                      {isDraft && (
                        <button onClick={() => addOption(idx)} className="text-xs font-bold text-[#006b5e] flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">add</span>
                          Add Option
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

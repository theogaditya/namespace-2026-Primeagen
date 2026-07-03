"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "RATING" | "YES_NO"

interface Question {
  questionText: string
  questionType: QuestionType
  options: string[]
  isRequired: boolean
  order: number
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

export default function NewSurveyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({})
  const [duplicateTargets, setDuplicateTargets] = useState<Record<number, number[]>>({})
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})

  // Step 1: Basic info
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [content, setContent] = useState("")

  // Step 2: Questions
  const [questions, setQuestions] = useState<Question[]>([])

  // Step 3: Settings
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [isPublic, setIsPublic] = useState(true)

  const addQuestion = () => {
    setQuestions((q) => [
      ...q,
      {
        questionText: "",
        questionType: "MCQ",
        options: [""],
        isRequired: true,
        order: q.length + 1,
      },
    ])
  }

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
    // clear question-step errors when user edits
    setStepErrors((prev) => {
      if (!prev || !prev[2]) return prev
      const copy = { ...prev }
      delete copy[2]
      return copy
    })
    setDuplicateTargets((prev) => {
      if (!prev || prev[idx] == null) return prev
      const copy = { ...prev }
      delete copy[idx]
      return copy
    })
    // mark step 2 completed when user edits question
    setCompletedSteps((prev) => ({ ...prev, 2: true }))
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
    // clear question-step errors when user edits options
    setStepErrors((prev) => {
      if (!prev || !prev[2]) return prev
      const copy = { ...prev }
      delete copy[2]
      return copy
    })
    setDuplicateTargets((prev) => {
      if (!prev || prev[qIdx] == null) return prev
      const copy = { ...prev }
      delete copy[qIdx]
      return copy
    })
    // mark step 2 completed when user edits options
    setCompletedSteps((prev) => ({ ...prev, 2: true }))
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
      )
    )
  }

  const handleSave = async (publish: boolean) => {
    setError("")
    setSaving(true)
    try {
      // Client-side validation with per-step error tracking -only when publishing
      if (publish) {
        const errs: Record<number, string[]> = {}
        const dupTargets: Record<number, number[]> = {}

        if (title.trim().length < 3) errs[1] = (errs[1] || []).concat('Title must be at least 3 characters')
        if (description.trim().length < 10) errs[1] = (errs[1] || []).concat('Description must be at least 10 characters')
        const bodyContent = content || description
        if ((bodyContent || '').trim().length < 10) errs[1] = (errs[1] || []).concat('Content/Target department must be at least 10 characters')

        if (!questions || questions.length < 1) {
          errs[2] = (errs[2] || []).concat('Add at least one question')
        } else {
          questions.forEach((q, i) => {
            if ((q.questionText || '').trim().length < 3) errs[2] = (errs[2] || []).concat(`Question ${i + 1}: text must be at least 3 characters`)
            if ((q.questionType === 'MCQ' || q.questionType === 'CHECKBOX') && (!q.options || q.options.filter(Boolean).length < 1)) {
              errs[2] = (errs[2] || []).concat(`Question ${i + 1}: add at least one option`)
            }

            // duplicate options detection per question
            if (q.questionType === 'MCQ' || q.questionType === 'CHECKBOX') {
              const map: Record<string, number[]> = {}
              q.options.forEach((opt, idx) => {
                const v = (opt || '').trim().toLowerCase()
                if (!v) return
                map[v] = map[v] || []
                map[v].push(idx)
              })
              Object.values(map).forEach((arr) => {
                if (arr.length > 1) {
                  errs[2] = (errs[2] || []).concat(`Duplicate option found in question ${i + 1}`)
                  dupTargets[i] = (dupTargets[i] || []).concat(...arr)
                }
              })
            }
          })
        }

        // If any errors, show them grouped and highlight steps/fields
        if (Object.keys(errs).length > 0) {
          setStepErrors(errs)
          setDuplicateTargets(dupTargets)
          // mark non-errored steps as completed so they stay green
          setCompletedSteps((prev) => {
            const copy = { ...prev }
            for (let i = 1; i <= STEPS.length; i++) {
              if (!errs[i]) copy[i] = true
            }
            return copy
          })
          // jump to first step that has an error
          const first = Math.min(...Object.keys(errs).map((v) => Number(v)))
          setStep(first)
          // if it's a question error, scroll to first offending question
          if (first === 2 && Object.keys(dupTargets).length > 0) {
            const qIdx = Number(Object.keys(dupTargets)[0])
            setTimeout(() => {
              const el = document.getElementById(`question-${qIdx}`)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 120)
          }
          // attach server/validation message to the current step only
          setError("")
          setSaving(false)
          return
        }
      }
      // Create the survey
      const createRes = await fetch(`${API}/api/civic-partner/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          category,
          content: content || description,
          sourceType: "SURVEY",
          questions: questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: ["MCQ", "CHECKBOX"].includes(q.questionType) ? q.options.map(o => o.trim()).filter(Boolean) : [],
            isRequired: q.isRequired,
            order: q.order,
          })),
          startsAt: startsAt || undefined,
          endsAt: endsAt || undefined,
        }),
      })

      const data = await createRes.json()
      if (!createRes.ok) {
        // Backend returns structured zod errors on 400: { errors: { formErrors, fieldErrors }}
        if (data?.errors) {
          const fieldErrs = data.errors.fieldErrors || {}
          const msgs: string[] = []
          Object.values(fieldErrs).forEach((arr: any) => {
            if (Array.isArray(arr)) msgs.push(...arr.filter(Boolean))
          })
          if (msgs.length) {
            throw new Error(msgs.join('; '))
          }
        }
        throw new Error(data.message || "Failed to create survey")
      }

      // Optionally publish
      if (publish && data.survey?.id) {
        const pubRes = await fetch(`${API}/api/civic-partner/surveys/${data.survey.id}/publish`, {
          method: "POST",
          credentials: "include",
        })
        if (!pubRes.ok) {
          const pd = await pubRes.json()
          throw new Error(pd.message || "Created but failed to publish")
        }
      }

      router.push("/CivicPartner/surveys")
    } catch (err) {
      // show server errors in current step only
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const stepValid = (s = step) => {
    if (s === 1) return title.trim().length > 0 && description.trim().length > 0 && (content || description).trim().length >= 10
    if (s === 2) return questions.length > 0 && questions.every((q) => q.questionText.trim().length > 0)
    return true
  }

  const STEPS = ["Basic Info", "Questions", "Settings", "Launch"]

  return (
    <CivicPartnerLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2
              className="text-4xl font-extrabold text-[#003358] tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Create New Survey
            </h2>
            <p className="text-[#42474f] font-medium mt-1">
              Design and publish community engagement initiatives.
            </p>
          </div>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !title.trim()}
            className="px-6 py-2.5 bg-[#d5ecf8] text-[#003358] font-semibold rounded-xl hover:bg-[#cfe6f2] transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
        </header>

        {/* Stepper */}
        <div className="max-w-5xl mx-auto mb-12">
            <div className="relative flex justify-between items-center">
              <div className="absolute top-5 left-0 w-full h-0.5 bg-[#cfe6f2] -z-10" />
              <div
                className="absolute top-5 left-0 h-0.5 -z-10 transition-all duration-500"
                style={{
                  width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
                  background: "linear-gradient(90deg, #34d399 0%, #10b981 40%, #06b6d4 100%)",
                }}
              />
              {STEPS.map((s, i) => {
                const idx = i + 1
                const hasError = Boolean(stepErrors && stepErrors[idx] && stepErrors[idx].length)
                const isCurrent = idx === step
                const isCompleted = Boolean(completedSteps[idx]) || (idx < step && !hasError)
                let circleClass = 'text-white'
                let circleStyle: any = { background: '#004a7c' }
                if (hasError && idx === step) {
                  circleClass = 'text-white'
                  circleStyle = { background: '#ef4444' }
                } else if (isCompleted) {
                  circleClass = 'text-white'
                  circleStyle = { background: '#16a34a' }
                } else if (isCurrent) {
                  circleClass = 'text-white'
                  circleStyle = { background: 'linear-gradient(135deg, #003358 0%, #004a7c 100%)' }
                } else {
                  // default step circle: dark background with white number
                  circleClass = 'text-white'
                  circleStyle = { background: '#0f1724' }
                }

                return (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (idx > step) {
                          // moving forward: mark current as completed
                          setCompletedSteps((prev) => ({ ...prev, [step]: true }))
                        }
                        setStep(idx)
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${circleClass}`}
                      style={circleStyle}
                    >
                      {idx}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(idx)}
                      className={`text-sm ${isCurrent ? 'font-bold' : 'font-medium'} ${hasError ? 'text-rose-600' : idx <= step ? 'text-[#003358]' : 'text-[#727780]'}`}
                    >
                      {s}
                    </button>
                  </div>
                )
              })}
            </div>
        </div>

        {/* Per-step Error Message */}
        {( (stepErrors[step] && stepErrors[step].length > 0) || error ) && (
          <div className="max-w-5xl mx-auto mb-6 bg-[#ffdad6] text-[#93000a] p-4 rounded-xl text-sm font-medium">
            {stepErrors[step] && stepErrors[step].map((m, i) => <div key={i}>{m}</div>)}
            {error && <div>{error}</div>}
          </div>
        )}

        <div className="max-w-5xl mx-auto grid grid-cols-12 gap-8">
          {/* Left: Form */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <section
                className="bg-white p-10 rounded-xl"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <h3
                  className="text-2xl font-bold text-[#003358] mb-8 flex items-center gap-3"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <span
                    className="w-1.5 h-8 rounded-full"
                    style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                  />
                  Survey Essentials
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#003358] px-1">Survey Title</label>
                    <input
                      className={`w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] placeholder:text-[#727780] transition-all ${stepErrors[1] && title.trim().length < 3 ? 'ring-2 ring-rose-400' : ''}`}
                      placeholder="e.g. 2024 Urban Mobility Feedback"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        // clear step 1 errors and mark completed when user edits
                        setStepErrors((prev) => {
                          if (!prev || !prev[1]) return prev
                          const copy = { ...prev }
                          delete copy[1]
                          return copy
                        })
                        setCompletedSteps((prev) => ({ ...prev, 1: true }))
                      }}
                      suppressHydrationWarning
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#003358] px-1">Category</label>
                      <select
                        className="w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] appearance-none transition-all"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#003358] px-1">Target Department</label>
                      <input
                        className={`w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] transition-all ${stepErrors[1] && (content || description).trim().length < 10 ? 'ring-2 ring-rose-400' : ''}`}
                        placeholder="Planning & Dev"
                        value={content}
                        onChange={(e) => {
                          setContent(e.target.value)
                          setStepErrors((prev) => {
                            if (!prev || !prev[1]) return prev
                            const copy = { ...prev }
                            delete copy[1]
                            return copy
                          })
                          setCompletedSteps((prev) => ({ ...prev, 1: true }))
                        }}
                        suppressHydrationWarning
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#003358] px-1">Public Description</label>
                    <textarea
                      className={`w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] resize-none placeholder:text-[#727780] transition-all ${stepErrors[1] && description.trim().length < 10 ? 'ring-2 ring-rose-400' : ''}`}
                      placeholder="Briefly describe the purpose of this survey to citizens..."
                      rows={4}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value)
                        setStepErrors((prev) => {
                          if (!prev || !prev[1]) return prev
                          const copy = { ...prev }
                          delete copy[1]
                          return copy
                        })
                        setCompletedSteps((prev) => ({ ...prev, 1: true }))
                      }}
                      suppressHydrationWarning
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 2: Questions */}
            {step === 2 && (
              <section className="space-y-6">
                <div
                  className="bg-[#e6f6ff] p-10 rounded-xl"
                  style={{ border: "2px dashed rgba(193,199,208,0.5)" }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3
                        className="text-2xl font-bold text-[#003358]"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Question Builder
                      </h3>
                      <p className="text-sm text-[#42474f]">{questions.length} question{questions.length !== 1 ? "s" : ""} added</p>
                    </div>
                    <button
                      onClick={addQuestion}
                      className="bg-white text-[#006b5e] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#006b5e] hover:text-white transition-all"
                      style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      Add Question
                    </button>
                  </div>

                  {questions.length === 0 && (
                    <div className="py-12 flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full bg-[#cfe6f2] flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl text-[#727780]">edit_document</span>
                      </div>
                      <p className="text-[#727780] font-medium max-w-xs">
                        Start building your survey by adding Multiple Choice, Rating, or Text questions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Question Cards */}
                {questions.map((q, idx) => (
                  <div
                    id={`question-${idx}`}
                    key={idx}
                    className={`bg-white p-8 rounded-xl ${((duplicateTargets && duplicateTargets[idx] && duplicateTargets[idx].length) || (q.questionText || '').trim().length < 3 || ((q.questionType === 'MCQ' || q.questionType === 'CHECKBOX') && q.options.filter(Boolean).length < 1)) ? 'ring-2 ring-rose-400' : ''}`}
                    style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-[#003358]">
                          Question {idx + 1}
                        </span>
                      </div>
                      <button
                        onClick={() => removeQuestion(idx)}
                        className="p-1 hover:bg-[#ffdad6] rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[#ba1a1a]">delete</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <input
                        className="w-full px-5 py-3 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27] placeholder:text-[#727780]"
                        placeholder="Enter your question..."
                        value={q.questionText}
                        onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                      />

                      <div className="flex items-center gap-4">
                        <select
                          className="px-4 py-2.5 bg-[#e6f6ff] border-none rounded-xl text-sm font-medium text-[#003358] focus:ring-2 focus:ring-[#006b5e]/40"
                          value={q.questionType}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              questionType: e.target.value as QuestionType,
                              options: ["MCQ", "CHECKBOX"].includes(e.target.value) ? (q.options.length ? q.options : [""]) : [],
                            })
                          }
                        >
                          {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateQuestion(idx, { isRequired: e.target.checked })}
                            className="w-4 h-4 rounded text-[#006b5e] focus:ring-[#006b5e]/40"
                          />
                          <span className="text-[#003358] font-medium">Required</span>
                        </label>
                      </div>

                      {/* Options for MCQ / CHECKBOX */}
                      {["MCQ", "CHECKBOX"].includes(q.questionType) && (
                        <div className="space-y-2 pl-4">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border-2 border-[#c1c7d0] flex-shrink-0" />
                                      <input
                                        className={`flex-1 px-4 py-2 bg-[#f3faff] border-none rounded-lg text-sm text-[#071e27] placeholder:text-[#727780] focus:ring-1 focus:ring-[#006b5e]/30 ${duplicateTargets && duplicateTargets[idx] && duplicateTargets[idx].includes(oIdx) ? 'ring-2 ring-rose-400' : ''}`}
                                        placeholder={`Option ${oIdx + 1}`}
                                        value={opt}
                                        onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                      />
                              {q.options.length > 1 && (
                                <button
                                  onClick={() => removeOption(idx, oIdx)}
                                  className="text-[#727780] hover:text-[#ba1a1a] transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(idx)}
                            className="text-xs font-bold text-[#006b5e] hover:underline flex items-center gap-1 mt-1"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <section
                className="bg-white p-10 rounded-xl"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <h3
                  className="text-2xl font-bold text-[#003358] mb-8 flex items-center gap-3"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <span
                    className="w-1.5 h-8 rounded-full"
                    style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                  />
                  Survey Settings
                </h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#003358] px-1">Start Date (Optional)</label>
                      <input
                        type="datetime-local"
                        className="w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27]"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#003358] px-1">End Date (Optional)</label>
                      <input
                        type="datetime-local"
                        className="w-full px-6 py-4 bg-[#e6f6ff] border-none rounded-xl focus:ring-2 focus:ring-[#006b5e]/40 text-[#071e27]"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Step 4: Launch */}
            {step === 4 && (
              <section
                className="bg-white p-10 rounded-xl text-center"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <div className="w-20 h-20 rounded-full bg-[#94f0df] flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-[#006b5e]">rocket_launch</span>
                </div>
                <h3
                  className="text-2xl font-bold text-[#003358] mb-2"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Ready to Launch
                </h3>
                <p className="text-[#42474f] mb-6">
                  Your survey &quot;{title}&quot; has {questions.length} question{questions.length !== 1 ? "s" : ""}.
                  Publishing will make it available to respondents.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl bg-[#d5ecf8] text-[#003358] font-bold hover:bg-[#cfe6f2] transition-all disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl text-white font-bold hover:brightness-110 transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                  >
                    {saving ? "Publishing..." : "Publish Survey"}
                  </button>
                </div>
              </section>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="flex items-center gap-2 text-[#003358] font-bold px-6 py-3 hover:bg-[#dbf1fe] transition-colors rounded-xl disabled:opacity-30"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Back
              </button>
              {step < 4 && (
                <button
                  onClick={() => {
                    // mark current as completed when moving forward
                    setCompletedSteps((prev) => ({ ...prev, [step]: true }))
                    setStep(step + 1)
                  }}
                  disabled={!stepValid()}
                  className="text-white font-bold px-10 py-4 rounded-xl flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)", boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
                >
                  Next: {STEPS[step]}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Pro Tips */}
            <div className="bg-[#cfe6f2] p-8 rounded-xl relative overflow-hidden">
              <div className="relative z-10">
                <h4
                  className="text-lg font-bold text-[#003358] mb-4 flex items-center gap-2"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <span className="material-symbols-outlined text-[#ffb95f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    lightbulb
                  </span>
                  Pro Tips
                </h4>
                <ul className="space-y-4 text-sm text-[#071e27]/80">
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006b5e] mt-1.5 shrink-0" />
                    Keep titles concise to increase participation rates by up to 20%.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006b5e] mt-1.5 shrink-0" />
                    Mention privacy status clearly in the description to build trust.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006b5e] mt-1.5 shrink-0" />
                    Use &apos;Rating&apos; scales for subjective feedback like city service quality.
                  </li>
                </ul>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-[120px]">psychology_alt</span>
              </div>
            </div>

            {/* Survey Readiness */}
            <div
              className="p-8 rounded-xl text-white"
              style={{ background: "#003358", boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
            >
              <h4 className="text-lg font-bold mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Survey Readiness
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Basic Info</span>
                  <span className="material-symbols-outlined text-[#97f3e2]">
                    {title && description ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
                <div className="flex justify-between items-center" style={{ opacity: questions.length ? 1 : 0.5 }}>
                  <span className="text-sm">Questions ({questions.length})</span>
                  <span className="material-symbols-outlined text-[#97f3e2]">
                    {questions.length > 0 ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
                <div className="flex justify-between items-center" style={{ opacity: step >= 3 ? 1 : 0.5 }}>
                  <span className="text-sm">Settings</span>
                  <span className="material-symbols-outlined">
                    {step >= 3 ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </div>
                <div className="w-full bg-[#004a7c] h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className="bg-[#97f3e2] h-full rounded-full transition-all"
                    style={{
                      width: `${((Number(!!title && !!description) + Number(questions.length > 0) + Number(step >= 3)) / 3) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}

"use client";

import React from "react";
import { Star, Check, AlertCircle } from "lucide-react";
import type { SurveyQuestion, AnswerPayload } from "@/types/survey";

interface SurveyQuestionRendererProps {
  question: SurveyQuestion;
  index: number;
  value: AnswerPayload | undefined;
  onChange: (payload: AnswerPayload) => void;
  showValidation: boolean;
}

export default function SurveyQuestionRenderer({
  question,
  index,
  value,
  onChange,
  showValidation,
}: SurveyQuestionRendererProps) {
  const isEmpty = () => {
    if (!value) return true;
    switch (question.questionType) {
      case "TEXT":
        return !value.answerText || value.answerText.trim() === "";
      case "MCQ":
      case "YES_NO":
      case "CHECKBOX":
        return !value.selectedOpts || value.selectedOpts.length === 0;
      case "RATING":
        return value.ratingValue === undefined || value.ratingValue === null;
      default:
        return true;
    }
  };

  const renderInput = () => {
    switch (question.questionType) {
      case "TEXT":
        return (
          <textarea
            rows={3}
            placeholder="Type your answer here..."
            value={value?.answerText || ""}
            onChange={(e) =>
              onChange({
                questionId: question.id,
                answerText: e.target.value,
              })
            }
            className="text-sm rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none p-3 w-full resize-none transition-all"
          />
        );

      case "MCQ":
        return (
          <div className="space-y-2">
            {question.options.map((option, optIdx) => {
              const isSelected = value?.selectedOpts?.[0] === option;
              return (
                <button
                  key={`${question.id ?? "q"}-${optIdx}`}
                  type="button"
                  onClick={() =>
                    onChange({
                      questionId: question.id,
                      selectedOpts: [option],
                    })
                  }
                  className={`w-full text-left rounded-xl border p-3.5 text-sm transition-all ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold ring-2 ring-violet-100"
                      : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );

      case "YES_NO":
        const yesSelected = value?.selectedOpts?.[0] === "Yes";
        const noSelected = value?.selectedOpts?.[0] === "No";
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                onChange({
                  questionId: question.id,
                  selectedOpts: ["Yes"],
                })
              }
              className={`rounded-xl border p-4 text-sm font-semibold transition-all ${
                yesSelected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  questionId: question.id,
                  selectedOpts: ["No"],
                })
              }
              className={`rounded-xl border p-4 text-sm font-semibold transition-all ${
                noSelected
                  ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-100"
                  : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/40"
              }`}
            >
              No
            </button>
          </div>
        );

      case "CHECKBOX":
        return (
          <div className="space-y-2">
            {question.options.map((option, optIdx) => {
              const isSelected = value?.selectedOpts?.includes(option) || false;
              return (
                <button
                  key={`${question.id ?? "q"}-${optIdx}`}
                  type="button"
                  onClick={() => {
                    const current = value?.selectedOpts || [];
                    const newOpts = isSelected
                      ? current.filter((o) => o !== option)
                      : [...current, option];
                    onChange({
                      questionId: question.id,
                      selectedOpts: newOpts,
                    });
                  }}
                  className={`w-full text-left rounded-xl border p-3.5 text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-violet-500 bg-violet-50 font-semibold ring-1 ring-violet-200"
                      : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <Check className="w-4 h-4 text-violet-600" />}
                </button>
              );
            })}
          </div>
        );

      case "RATING":
        const rating = value?.ratingValue || 0;
        return (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    onChange({
                      questionId: question.id,
                      ratingValue: star,
                    })
                  }
                  className="transition-all hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 hover:text-amber-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              1 – Poor &nbsp;&nbsp;•&nbsp;&nbsp; 5 – Excellent
            </p>
          </div>
        );

      default:
        return <p className="text-sm text-slate-500">Unsupported question type</p>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
      <p className="text-sm font-semibold text-slate-800 mb-3">
        {index + 1}. {question.questionText}
        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
      </p>
      {renderInput()}
      {showValidation && question.isRequired && isEmpty() && (
        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> This question is required.
        </p>
      )}
    </div>
  );
}

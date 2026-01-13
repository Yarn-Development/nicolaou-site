"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Question {
  id: string
  questionText: string
  markSchemeText: string
  tier: "Higher" | "Foundation"
  level: "GCSE" | "A-Level"
  topic: string
  learningObjective: string
  calculatorAllowed: boolean
  difficulty: number // 1-5
  marks: number
}

interface QuestionCardProps {
  question: Question
  onAdd: (question: Question) => void
  disabled?: boolean
  isAdded?: boolean
}

export function QuestionCard({ question, onAdd, disabled, isAdded }: QuestionCardProps) {
  return (
    <div className="border-2 border-swiss-ink bg-swiss-paper p-4 hover:bg-swiss-concrete transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-swiss-signal">
              {question.id}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-swiss-ink text-white">
              {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-swiss-ink line-clamp-2 mb-3">
            {question.questionText}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.tier}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.level}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.topic}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-swiss-ink">
          {question.calculatorAllowed ? "Calculator" : "Non-Calc"}
        </span>
      </div>

      {/* Difficulty */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 ${
                i < question.difficulty ? "bg-swiss-signal" : "bg-swiss-concrete border border-swiss-ink"
              }`}
            />
          ))}
          <span className="text-xs font-bold uppercase tracking-wider text-swiss-lead ml-2">
            Difficulty
          </span>
        </div>

        {/* Add Button */}
        <Button
          onClick={() => onAdd(question)}
          disabled={disabled || isAdded}
          className={`${
            isAdded 
              ? "bg-swiss-ink/20 text-swiss-ink border-2 border-swiss-ink/40" 
              : "bg-swiss-signal text-white hover:bg-swiss-ink"
          } font-bold uppercase tracking-wider text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
        >
          <Plus className="h-4 w-4 mr-1" />
          {isAdded ? "Added" : "Add"}
        </Button>
      </div>

      {/* Learning Objective */}
      <div className="mt-3 pt-3 border-t border-swiss-ink">
        <p className="text-xs text-swiss-lead font-medium line-clamp-1">
          {question.learningObjective}
        </p>
      </div>
    </div>
  )
}

"use client"

import {
  BookOpen,
  GraduationCap,
  BarChart2,
  FileText,
  MessageSquare,
  Layers,
  Users,
  Mail,
} from "lucide-react"

const FEATURES = [
  {
    icon: BookOpen,
    title: "Past Paper Question Bank",
    description:
      "Access a structured library of GCSE and A Level questions from IYGB, Edexcel, AQA and more — organised by topic, difficulty, curriculum level, and specification era.",
    number: "01",
  },
  {
    icon: FileText,
    title: "AI Question & Paper Generation",
    description:
      "Generate new exam-style questions on any topic with full mark schemes in seconds, or build complete shadow papers using bank questions, AI questions, or a mix of both.",
    number: "02",
  },
  {
    icon: Layers,
    title: "Unused Question Booklets",
    description:
      "Automatically identify questions that have never appeared in any assignment for a class, then compile them into an Edexcel-style PDF booklet with integrated mark schemes.",
    number: "03",
  },
  {
    icon: BarChart2,
    title: "Marking & Performance Tracking",
    description:
      "Mark student submissions with a keyboard-driven grid interface. Track scores per question, identify weak topics, and view class-level performance over time.",
    number: "04",
  },
  {
    icon: MessageSquare,
    title: "AI-Powered Student Feedback",
    description:
      "Generate personalised feedback narratives for each student using Claude AI — covering strengths, areas to improve, learning objectives, and actionable next steps.",
    number: "05",
  },
  {
    icon: Mail,
    title: "Parent Portal & Email Reports",
    description:
      "Email feedback directly to parents with a secure magic-link parent portal. Attach PDF feedback reports and track which parents have viewed them.",
    number: "06",
  },
  {
    icon: GraduationCap,
    title: "Multi-Board & Spec Support",
    description:
      "Full support for Edexcel, AQA, OCR, MEI, WJEC, Cambridge (CIE), and IB. Handles new-specification, legacy modular, GCSE Foundation, Higher, and A Level content.",
    number: "07",
  },
  {
    icon: Users,
    title: "Class & Student Management",
    description:
      "Create classes, invite students via email or CSV, manage assignments, set online worksheet mode, and track individual student progress across every topic.",
    number: "08",
  },
]

export function FeatureSection() {
  return (
    <section id="features" className="py-24 bg-swiss-paper border-b border-swiss-ink">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-[0.25em] text-swiss-signal mb-4">
              Features
            </span>
          </div>
          <div className="col-span-12 md:col-span-8">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-6 text-swiss-ink">
              Everything a maths<br />teacher actually needs.
            </h2>
            <p className="text-lg leading-relaxed text-swiss-lead max-w-2xl">
              Built around the real workflow of a secondary school maths teacher — from ingesting past papers to delivering feedback to parents.
            </p>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-swiss-ink">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.number}
                className="border-r border-b border-swiss-ink p-8 relative group hover:bg-swiss-concrete transition-colors"
              >
                {/* Large number watermark */}
                <span className="absolute top-4 right-4 text-6xl font-black text-swiss-ink/5 group-hover:text-swiss-signal/10 transition-colors select-none">
                  {feature.number}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 bg-swiss-ink flex items-center justify-center mb-5 group-hover:bg-swiss-signal transition-colors">
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-sm font-black uppercase tracking-wide mb-3 text-swiss-ink">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-swiss-lead">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

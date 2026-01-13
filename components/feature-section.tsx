"use client"

import { BookOpen, GraduationCap, BarChart, FileText, MessageSquare, Sparkles } from "lucide-react"

export function FeatureSection() {
  const teacherFeatures = [
    {
      icon: <FileText className="h-8 w-8 text-white" />,
      title: "AI Worksheet Generator",
      description: "Create custom worksheets with AI assistance in seconds, not hours. Perfect for any GCSE topic.",
      number: "01"
    },
    {
      icon: <BarChart className="h-8 w-8 text-white" />,
      title: "Performance Analytics",
      description: "Track student progress with detailed insights, visual charts, and actionable recommendations.",
      number: "02"
    },
    {
      icon: <BookOpen className="h-8 w-8 text-white" />,
      title: "Scheme of Work Editor",
      description: "Plan your curriculum with an intuitive drag-and-drop interface and GCSE alignment.",
      number: "03"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-white" />,
      title: "AI Feedback Assistant",
      description: "Generate personalized, constructive feedback with AI suggestions for every student.",
      number: "04"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-white" />,
      title: "Smart Content Creation",
      description: "Generate engaging educational content, quizzes, and assessments with advanced AI.",
      number: "05"
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-white" />,
      title: "Class Management",
      description: "Organize classes, track individual progress, and manage assignments effortlessly.",
      number: "06"
    },
  ]

  return (
    <section className="py-24 bg-swiss-paper border-b border-swiss-ink">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header with Asymmetric Grid */}
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-4">
              Features
            </span>
          </div>
          <div className="col-span-12 md:col-span-9 lg:col-span-7">
            <h2 className="text-5xl font-extrabold tracking-tight leading-none mb-6 text-swiss-ink uppercase">
              Powerful tools<br />for everyone.
            </h2>
            <p className="text-xl leading-relaxed text-swiss-lead">
              Our platform adapts to your needs, whether you&apos;re a teacher creating content or a student mastering concepts.
            </p>
          </div>
        </div>

        {/* Features Grid with Large Numbers */}
        <div className="grid md:grid-cols-3 gap-0 border-t border-swiss-ink">
          {teacherFeatures.map((feature, index) => (
            <div 
              key={index}
              className="border-r border-b border-swiss-ink p-8 relative h-96 hover:bg-swiss-concrete transition-colors group cursor-pointer"
            >
              {/* Large Number Overlay */}
              <span className="absolute top-4 left-4 text-8xl font-black text-muted group-hover:text-swiss-signal/20 transition-colors -z-10">
                {feature.number}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 bg-swiss-ink flex items-center justify-center text-white mb-6 mt-20 group-hover:bg-swiss-signal transition-colors">
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-4 uppercase tracking-tight text-swiss-ink">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-swiss-lead">{feature.description}</p>

              {/* Bottom Divider */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="w-full h-px bg-swiss-ink"></div>
                <div className="pt-4 flex justify-between items-center font-bold text-sm uppercase">
                  <span className="text-swiss-lead">Learn More</span>
                  <span className="group-hover:translate-x-2 transition-transform text-swiss-ink">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

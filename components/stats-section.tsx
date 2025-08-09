"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const stats = [
    {
      number: "50,000+",
      label: "Students Learning",
      description: "Active learners using our platform daily",
    },
    {
      number: "2,000+",
      label: "Educators",
      description: "Teachers creating amazing content",
    },
    {
      number: "1M+",
      label: "Questions Generated",
      description: "AI-powered assessments created",
    },
    {
      number: "95%",
      label: "Improvement Rate",
      description: "Students show measurable progress",
    },
  ]

  return (
    <section className="py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              <span className="text-primary">Impact</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Transforming education worldwide</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Join thousands of educators and students who are already experiencing the future of learning
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-4 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center space-y-2 text-center"
            >
              <div className="glassmorphic rounded-lg p-6 w-full card-hover">
                <div className="text-3xl font-bold text-primary glow">{stat.number}</div>
                <div className="text-lg font-semibold mt-2">{stat.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

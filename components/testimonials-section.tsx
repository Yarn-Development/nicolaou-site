"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TestimonialsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "High School Math Teacher",
      school: "Lincoln High School",
      content:
        "Nicolaou's Maths has completely transformed how I create assessments. What used to take hours now takes minutes, and the quality is incredible.",
      rating: 5,
      avatar: "/placeholder.svg?height=64&width=64",
    },
    {
      name: "Michael Chen",
      role: "Student",
      school: "University of California",
      content:
        "The AI tutor helped me understand complex concepts that I struggled with for months. It's like having a personal teacher available 24/7.",
      rating: 5,
      avatar: "/placeholder.svg?height=64&width=64",
    },
    {
      name: "Dr. Emily Rodriguez",
      role: "Department Head",
      school: "Riverside Elementary",
      content:
        "Our test scores have improved by 23% since implementing Nicolaou's Maths. The personalized learning paths make all the difference.",
      rating: 5,
      avatar: "/placeholder.svg?height=64&width=64",
    },
  ]

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              <span className="text-primary">Testimonials</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Loved by educators and students</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              See what our community has to say about their experience with Nicolaou's Maths
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-4xl py-12">
          <div className="relative">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="glassmorphic rounded-xl p-8 text-center"
            >
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <blockquote className="text-lg md:text-xl mb-6">"{testimonials[currentTestimonial].content}"</blockquote>
              <div className="flex items-center justify-center space-x-4">
                <div
                  className="h-12 w-12 rounded-full bg-muted"
                  style={{
                    backgroundImage: `url(${testimonials[currentTestimonial].avatar})`,
                    backgroundSize: "cover",
                  }}
                />
                <div className="text-left">
                  <div className="font-semibold">{testimonials[currentTestimonial].name}</div>
                  <div className="text-sm text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                  <div className="text-sm text-muted-foreground">{testimonials[currentTestimonial].school}</div>
                </div>
              </div>
            </motion.div>
            <div className="flex justify-center items-center space-x-4 mt-8">
              <Button variant="outline" size="icon" onClick={prevTestimonial} className="glassmorphic border-muted/30">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      index === currentTestimonial ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={nextTestimonial} className="glassmorphic border-muted/30">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

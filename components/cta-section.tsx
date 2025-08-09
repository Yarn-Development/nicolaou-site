"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4 md:px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center space-y-8"
        >
          <div className="glassmorphic rounded-2xl p-8 md:p-12 animated-gradient">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight glow">
                  Ready to transform your teaching?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of educators who are already using AI to create better learning experiences. Start your
                  free trial today and see the difference in minutes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 glow-border text-lg px-8">
                  <Link href="/signup" className="flex items-center">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="glassmorphic border-muted/30 text-lg px-8">
                  <Link href="/demo" className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Watch Demo
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  No credit card required
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                  14-day free trial
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-secondary rounded-full mr-2"></div>
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

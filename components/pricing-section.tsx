"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      name: "Free",
      description: "Perfect for trying out Nicolaou's Maths",
      price: { monthly: 0, annual: 0 },
      features: [
        "Up to 5 AI-generated worksheets per month",
        "Basic AI tutor access",
        "Student progress tracking",
        "Email support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Pro",
      description: "For individual teachers and small classes",
      price: { monthly: 29, annual: 290 },
      features: [
        "Unlimited AI-generated content",
        "Advanced AI tutor with image analysis",
        "Detailed analytics and insights",
        "Custom worksheet templates",
        "Priority support",
        "Scheme of work planning",
      ],
      cta: "Start Pro Trial",
      popular: true,
    },
    {
      name: "Institution",
      description: "For schools and educational organizations",
      price: { monthly: 99, annual: 990 },
      features: [
        "Everything in Pro",
        "Multi-teacher collaboration",
        "Advanced admin controls",
        "Custom integrations",
        "Dedicated account manager",
        "Training and onboarding",
        "Custom branding",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  return (
    <section className="py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
              <span className="text-primary">Pricing</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Choose the perfect plan</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Start free and scale as you grow. All plans include our core AI features.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`text-sm ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
                Save 17%
              </Badge>
            </span>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative glassmorphic rounded-xl p-6 card-hover ${plan.popular ? "glow-border-violet" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-secondary text-secondary-foreground">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold">${isAnnual ? plan.price.annual : plan.price.monthly}</span>
                    <span className="text-muted-foreground">
                      {plan.price.monthly === 0 ? "forever" : isAnnual ? "/year" : "/month"}
                    </span>
                  </div>
                  {isAnnual && plan.price.monthly > 0 && (
                    <p className="text-sm text-muted-foreground">
                      ${Math.round(plan.price.annual / 12)}/month billed annually
                    </p>
                  )}
                </div>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-secondary hover:bg-secondary/90 glow-border-violet"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {plan.cta}
                </Button>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

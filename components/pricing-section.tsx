"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

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
    <section className="py-24 bg-swiss-concrete border-t border-swiss-ink">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-4">
              Pricing
            </span>
          </div>
          <div className="col-span-12 md:col-span-9 lg:col-span-7">
            <h2 className="text-5xl font-extrabold tracking-tight leading-none mb-6 text-swiss-ink uppercase">
              Choose the<br />perfect plan.
            </h2>
            <p className="text-xl leading-relaxed text-swiss-lead mb-8">
              Start free and scale as you grow. All plans include our core AI features.
            </p>

            {/* Toggle */}
            <div className="flex items-center space-x-4 border border-swiss-ink p-2 w-fit bg-swiss-paper">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  !isAnnual ? "bg-swiss-ink text-swiss-paper" : "bg-transparent text-swiss-ink"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
                  isAnnual ? "bg-swiss-ink text-swiss-paper" : "bg-transparent text-swiss-ink"
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-swiss-signal text-white px-2 py-1">Save 17%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid lg:grid-cols-3 gap-0 border-t border-swiss-ink">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border-r border-b border-swiss-ink p-8 bg-swiss-paper ${
                plan.popular ? "lg:-mt-8 lg:mb-8 bg-swiss-signal text-white border-4" : ""
              }`}
            >
              {plan.popular && (
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-widest bg-white text-swiss-signal px-3 py-1">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-3xl font-black uppercase tracking-tight mb-2 ${plan.popular ? "text-white" : "text-swiss-ink"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? "text-white opacity-90" : "text-swiss-lead"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className={`text-6xl font-black ${plan.popular ? "text-white" : "text-swiss-ink"}`}>
                    ${isAnnual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className={`text-sm font-bold uppercase ${plan.popular ? "text-white opacity-90" : "text-swiss-lead"}`}>
                    {plan.price.monthly === 0 ? "forever" : isAnnual ? "/year" : "/month"}
                  </span>
                </div>
                {isAnnual && plan.price.monthly > 0 && (
                  <p className={`text-sm font-medium ${plan.popular ? "text-white opacity-75" : "text-swiss-lead"}`}>
                    ${Math.round(plan.price.annual / 12)}/month billed annually
                  </p>
                )}
              </div>

              <Button
                className={`w-full mb-8 font-bold uppercase tracking-wider text-sm px-8 py-6 ${
                  plan.popular
                    ? "bg-white text-swiss-signal hover:bg-swiss-ink hover:text-white dark:hover:bg-black"
                    : "bg-swiss-signal text-white hover:bg-swiss-ink dark:hover:bg-white dark:hover:text-swiss-ink"
                }`}
              >
                {plan.cta}
              </Button>

              <div className={`w-full h-px mb-8 ${plan.popular ? "bg-white" : "bg-swiss-ink"}`}></div>

              <ul className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-white" : "text-swiss-ink"}`} />
                    <span className={`text-sm font-medium ${plan.popular ? "text-white" : "text-swiss-ink"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

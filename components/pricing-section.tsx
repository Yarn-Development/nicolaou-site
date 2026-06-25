"use client"

export function PricingSection() {
  const steps = [
    {
      num: "01",
      title: "Sign in with your school account",
      body: "Use Google Workspace or Microsoft Azure AD single sign-on. No separate password needed — your school credentials work directly.",
    },
    {
      num: "02",
      title: "Build your question bank",
      body: "Ingest IYGB practice papers and Edexcel past papers using the bulk ingestion tool. Tag questions by topic, difficulty, and spec era. Generate new AI questions on demand.",
    },
    {
      num: "03",
      title: "Create and assign papers",
      body: "Build assignments from bank questions, AI-generated questions, or upload scanned papers. Set calculator/non-calculator, publish to students, and track submissions.",
    },
    {
      num: "04",
      title: "Mark and give feedback",
      body: "Mark submissions using the keyboard-driven marking interface. Generate personalised AI feedback narratives and email them — with PDF attachments — to students and parents.",
    },
  ]

  return (
    <section className="py-24 bg-swiss-concrete border-b border-swiss-ink">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid grid-cols-12 gap-8 mb-16">
          <div className="col-span-12 md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-[0.25em] text-swiss-signal mb-4">
              How it works
            </span>
          </div>
          <div className="col-span-12 md:col-span-8">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-6 text-swiss-ink">
              From paper to<br />feedback in minutes.
            </h2>
            <p className="text-lg leading-relaxed text-swiss-lead max-w-2xl">
              A clear end-to-end workflow — from ingesting exam papers to delivering structured feedback to every student.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-swiss-ink">
          {steps.map((step) => (
            <div key={step.num} className="border-r border-b border-swiss-ink p-8 bg-swiss-paper">
              <div className="text-5xl font-black text-swiss-signal mb-6 leading-none">{step.num}</div>
              <h3 className="text-sm font-black uppercase tracking-wide mb-3 text-swiss-ink">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-swiss-lead">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

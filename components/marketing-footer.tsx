import Link from "next/link"
import { Github, Linkedin, Mail } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="bg-swiss-ink text-swiss-paper border-t-4 border-swiss-signal mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-8 pb-12 border-b-2 border-swiss-paper">
          {/* Brand Column */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4">
            <Link href="/" className="inline-block mb-6">
              <span className="text-3xl font-black tracking-tighter text-swiss-paper">
                NICOLAOU_
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-6 text-swiss-paper opacity-75 max-w-xs font-medium">
              A maths teaching platform for GCSE and A Level — question banks, AI paper generation, marking, and student feedback.
            </p>
            <div className="flex gap-4">
              <Link 
                href="https://github.com/Yarn-Development" 
                className="w-10 h-10 border-2 border-swiss-paper flex items-center justify-center hover:bg-swiss-signal hover:border-swiss-signal transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link 
                href="https://linkedin.com/company/yarndev" 
                className="w-10 h-10 border-2 border-swiss-paper flex items-center justify-center hover:bg-swiss-signal hover:border-swiss-signal transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
              <Link 
                href="mailto:admin@yarndev.co.uk" 
                className="w-10 h-10 border-2 border-swiss-paper flex items-center justify-center hover:bg-swiss-signal hover:border-swiss-signal transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Link>
            </div>
          </div>

          {/* Platform Column */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Platform</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Contact</h3>
            <ul className="space-y-3">
              <li>
                <Link href="mailto:admin@yarndev.co.uk" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Get in touch
                </Link>
              </li>
              <li>
                <Link href="https://yarndev.co.uk/privacy" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="https://yarndev.co.uk/terms" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Boards + Specs Column */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Supported Exam Boards</h3>
            <div className="flex flex-wrap gap-2">
              {["Edexcel", "AQA", "OCR", "MEI", "WJEC", "CIE / Cambridge", "IB"].map(board => (
                <span key={board} className="text-xs font-bold uppercase tracking-wider border border-swiss-paper/30 px-3 py-1.5 text-swiss-paper/60">
                  {board}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {["GCSE Foundation", "GCSE Higher", "A Level New Spec", "A Level Legacy"].map(spec => (
                <span key={spec} className="text-xs font-bold uppercase tracking-wider border border-swiss-paper/20 px-3 py-1.5 text-swiss-paper/40">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2">© 2026 Yarn Development</p>
            <p className="text-xs opacity-75">All rights reserved.</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="https://yarndev.co.uk/terms" className="text-xs font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors">
              Terms
            </Link>
            <Link href="https://yarndev.co.uk/privacy" className="text-xs font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors">
              Privacy
            </Link>
            <Link href="/cookies" className="text-xs font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors">
              Cookies
            </Link>
            <Link href="/sitemap" className="text-xs font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

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
              Revolutionizing education with AI-powered learning experiences for students and teachers worldwide.
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

          {/* Product Column */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/features" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Demo
                </Link>
              </li>
              <li>
                <Link href="/integrations" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/blog" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Community
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  About
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm font-bold uppercase tracking-wider hover:text-swiss-signal transition-colors block">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="col-span-12 md:col-span-6 lg:col-span-2">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-swiss-signal">Newsletter</h3>
            <p className="text-xs font-medium mb-4 opacity-75">Get updates on new features and releases.</p>
            <div className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="bg-transparent border-2 border-swiss-paper px-4 py-2 text-sm font-bold placeholder:text-swiss-paper placeholder:opacity-50 focus:border-swiss-signal focus:outline-none transition-colors"
              />
              <button className="bg-swiss-signal text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-swiss-ink transition-colors">
                Subscribe
              </button>
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

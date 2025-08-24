import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { GeistSans } from "geist/font/sans"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata = {
  title: "Nicolaou's Maths | Next-Generation Learning Platform",
  description: "AI-enhanced educational platform for students and teachers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                border: "1px solid hsl(var(--border))",
                backdropFilter: "blur(10px)",
              },
              className: "glassmorphic",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
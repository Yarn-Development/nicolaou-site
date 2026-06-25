import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ConvexClientProvider } from "@/components/providers/convex-provider"
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
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Mulish:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ConvexClientProvider>
          {hasClerk ? (
            <ClerkWrapper>
              <ThemeProvider>
                {children}
                <Toaster position="top-right" />
              </ThemeProvider>
            </ClerkWrapper>
          ) : (
            <ThemeProvider>
              {children}
              <Toaster position="top-right" />
            </ThemeProvider>
          )}
        </ConvexClientProvider>
      </body>
    </html>
  )
}

async function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const { ClerkProvider } = await import("@clerk/nextjs")
  return <ClerkProvider>{children}</ClerkProvider>
}

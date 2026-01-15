"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Swiss Focus Design System Toast Component
 * 
 * Characteristics:
 * - No rounded corners (sharp rectangles)
 * - 2px solid borders
 * - Bold uppercase text
 * - Flat design (no shadows)
 * - High contrast colors
 * - Theme-aware (light/dark)
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-2 group-[.toaster]:border-swiss-ink dark:group-[.toaster]:border-swiss-paper group-[.toaster]:bg-swiss-paper dark:group-[.toaster]:bg-swiss-ink group-[.toaster]:text-swiss-ink dark:group-[.toaster]:text-swiss-paper group-[.toaster]:shadow-none group-[.toaster]:rounded-none group-[.toaster]:font-bold group-[.toaster]:tracking-wide",
          description: "group-[.toast]:text-swiss-ink/70 dark:group-[.toast]:text-swiss-paper/70 group-[.toast]:font-normal group-[.toast]:tracking-normal",
          actionButton:
            "group-[.toast]:bg-swiss-ink dark:group-[.toast]:bg-swiss-paper group-[.toast]:text-swiss-paper dark:group-[.toast]:text-swiss-ink group-[.toast]:border-2 group-[.toast]:border-swiss-ink dark:group-[.toast]:border-swiss-paper group-[.toast]:rounded-none group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:tracking-widest group-[.toast]:text-xs hover:group-[.toast]:bg-swiss-ink/90 dark:hover:group-[.toast]:bg-swiss-paper/90",
          cancelButton:
            "group-[.toast]:bg-swiss-paper dark:group-[.toast]:bg-swiss-ink group-[.toast]:text-swiss-ink dark:group-[.toast]:text-swiss-paper group-[.toast]:border-2 group-[.toast]:border-swiss-ink dark:group-[.toast]:border-swiss-paper group-[.toast]:rounded-none group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:tracking-widest group-[.toast]:text-xs hover:group-[.toast]:bg-swiss-ink/5 dark:hover:group-[.toast]:bg-swiss-paper/5",
          success:
            "group-[.toaster]:border-green-600 dark:group-[.toaster]:border-green-400 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950 group-[.toaster]:text-green-900 dark:group-[.toaster]:text-green-100",
          error:
            "group-[.toaster]:border-red-600 dark:group-[.toaster]:border-red-400 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950 group-[.toaster]:text-red-900 dark:group-[.toaster]:text-red-100",
          warning:
            "group-[.toaster]:border-yellow-600 dark:group-[.toaster]:border-yellow-400 group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:bg-yellow-950 group-[.toaster]:text-yellow-900 dark:group-[.toaster]:text-yellow-100",
          info:
            "group-[.toaster]:border-blue-600 dark:group-[.toaster]:border-blue-400 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950 group-[.toaster]:text-blue-900 dark:group-[.toaster]:text-blue-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

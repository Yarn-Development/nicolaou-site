import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Swiss Focus: No rounded corners, bold text, uppercase, wide tracking, flat design
  "inline-flex items-center justify-center border-2 px-3 py-1 text-xs font-bold uppercase tracking-widest w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-swiss-ink dark:border-swiss-paper bg-swiss-ink dark:bg-swiss-paper text-swiss-paper dark:text-swiss-ink [a&]:hover:bg-swiss-ink/90 dark:[a&]:hover:bg-swiss-paper/90 focus-visible:ring-swiss-ink dark:focus-visible:ring-swiss-paper",
        secondary:
          "border-swiss-ink/30 dark:border-swiss-paper/30 bg-swiss-ink/10 dark:bg-swiss-paper/10 text-swiss-ink dark:text-swiss-paper [a&]:hover:bg-swiss-ink/20 dark:[a&]:hover:bg-swiss-paper/20 focus-visible:ring-swiss-ink dark:focus-visible:ring-swiss-paper",
        destructive:
          "border-red-600 dark:border-red-400 bg-red-600 dark:bg-red-400 text-white dark:text-red-950 [a&]:hover:bg-red-700 dark:[a&]:hover:bg-red-500 focus-visible:ring-red-600 dark:focus-visible:ring-red-400",
        outline:
          "border-swiss-ink dark:border-swiss-paper bg-transparent text-swiss-ink dark:text-swiss-paper [a&]:hover:bg-swiss-ink/5 dark:[a&]:hover:bg-swiss-paper/5 focus-visible:ring-swiss-ink dark:focus-visible:ring-swiss-paper",
        success:
          "border-green-600 dark:border-green-400 bg-green-600 dark:bg-green-400 text-white dark:text-green-950 [a&]:hover:bg-green-700 dark:[a&]:hover:bg-green-500 focus-visible:ring-green-600 dark:focus-visible:ring-green-400",
        warning:
          "border-yellow-600 dark:border-yellow-400 bg-yellow-600 dark:bg-yellow-400 text-yellow-950 dark:text-yellow-950 [a&]:hover:bg-yellow-700 dark:[a&]:hover:bg-yellow-500 focus-visible:ring-yellow-600 dark:focus-visible:ring-yellow-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

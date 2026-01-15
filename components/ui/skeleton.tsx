import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-swiss-ink/10 dark:bg-swiss-paper/10", className)}
      {...props}
    />
  )
}

export { Skeleton }

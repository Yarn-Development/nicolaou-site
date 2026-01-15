import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Swiss Focus: No rounded corners, 2px border, bold text, flat design
        "flex h-10 w-full min-w-0 border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink px-4 py-2 text-sm font-medium text-swiss-ink dark:text-swiss-paper transition-colors outline-none",
        "placeholder:text-swiss-ink/50 dark:placeholder:text-swiss-paper/50 placeholder:font-normal",
        "focus-visible:border-swiss-ink dark:focus-visible:border-swiss-paper focus-visible:bg-swiss-ink/5 dark:focus-visible:bg-swiss-paper/5",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-bold file:uppercase file:text-swiss-ink dark:file:text-swiss-paper",
        "selection:bg-swiss-ink selection:text-swiss-paper dark:selection:bg-swiss-paper dark:selection:text-swiss-ink",
        "aria-invalid:border-red-600 dark:aria-invalid:border-red-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }

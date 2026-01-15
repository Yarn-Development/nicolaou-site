import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Swiss Focus: No rounded corners, 2px border, bold text, flat design
        "flex field-sizing-content min-h-24 w-full border-2 border-swiss-ink dark:border-swiss-paper bg-swiss-paper dark:bg-swiss-ink px-4 py-3 text-sm font-medium text-swiss-ink dark:text-swiss-paper transition-colors outline-none resize-y",
        "placeholder:text-swiss-ink/50 dark:placeholder:text-swiss-paper/50 placeholder:font-normal",
        "focus-visible:border-swiss-ink dark:focus-visible:border-swiss-paper focus-visible:bg-swiss-ink/5 dark:focus-visible:bg-swiss-paper/5",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "selection:bg-swiss-ink selection:text-swiss-paper dark:selection:bg-swiss-paper dark:selection:text-swiss-ink",
        "aria-invalid:border-red-600 dark:aria-invalid:border-red-400",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

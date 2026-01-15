"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Swiss Focus: No rounded corners, 2px border, flat design
        "inline-flex h-auto w-fit items-center justify-start gap-0 bg-transparent p-0 border-b-2 border-swiss-ink dark:border-swiss-paper",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Swiss Focus: Sharp rectangles, bold text, high contrast
        "inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors",
        "bg-transparent text-swiss-ink/60 dark:text-swiss-paper/60",
        "border-b-2 border-transparent -mb-[2px]",
        "hover:text-swiss-ink dark:hover:text-swiss-paper hover:bg-swiss-ink/5 dark:hover:bg-swiss-paper/5",
        "data-[state=active]:text-swiss-ink dark:data-[state=active]:text-swiss-paper data-[state=active]:border-swiss-ink dark:data-[state=active]:border-swiss-paper data-[state=active]:bg-swiss-ink/10 dark:data-[state=active]:bg-swiss-paper/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swiss-ink dark:focus-visible:ring-swiss-paper focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none mt-4", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

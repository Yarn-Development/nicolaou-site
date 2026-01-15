"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 border-2 border-swiss-ink dark:border-swiss-paper hover:bg-swiss-concrete dark:hover:bg-swiss-ink/20 transition-colors"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-swiss-paper dark:bg-swiss-ink/90 border-2 border-swiss-ink dark:border-swiss-paper min-w-[160px] p-2">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={`cursor-pointer transition-colors font-bold uppercase tracking-wider text-xs py-3 ${
            theme === "light" ? "bg-swiss-signal text-swiss-paper" : "hover:bg-swiss-concrete dark:hover:bg-swiss-paper/10"
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={`cursor-pointer transition-colors font-bold uppercase tracking-wider text-xs py-3 ${
            theme === "dark" ? "bg-swiss-signal text-swiss-paper" : "hover:bg-swiss-concrete dark:hover:bg-swiss-paper/10"
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={`cursor-pointer transition-colors font-bold uppercase tracking-wider text-xs py-3 ${
            theme === "system" ? "bg-swiss-signal text-swiss-paper" : "hover:bg-swiss-concrete dark:hover:bg-swiss-paper/10"
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

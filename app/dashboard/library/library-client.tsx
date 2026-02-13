"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  FileText,
  Ghost,
  BookOpen,
  Printer,
  Eye,
  Trash2,
  MoreVertical,
  Library,
  PlusCircle,
  Calendar,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LibraryItem, LibraryItemType } from "@/app/actions/library"
import { deleteAssignment } from "@/app/actions/assignments"
import { deleteRevisionList } from "@/app/actions/revision-lists"

// =====================================================
// Props & Filter Types
// =====================================================

interface LibraryClientProps {
  items: LibraryItem[]
}

type FilterType = "all" | "exam" | "shadow_paper" | "revision_list"

// =====================================================
// Type config: icons, colors, labels
// =====================================================

const TYPE_CONFIG: Record<
  LibraryItemType,
  {
    label: string
    icon: typeof FileText
    badgeClass: string
    filterActiveClass: string
  }
> = {
  exam: {
    label: "Exam",
    icon: FileText,
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    filterActiveClass: "bg-blue-600 text-white border-blue-600",
  },
  shadow_paper: {
    label: "Shadow Paper",
    icon: Ghost,
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    filterActiveClass: "bg-purple-600 text-white border-purple-600",
  },
  revision_list: {
    label: "Revision List",
    icon: BookOpen,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    filterActiveClass: "bg-amber-600 text-white border-amber-600",
  },
}

// =====================================================
// Component
// =====================================================

export function LibraryClient({ items }: LibraryClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  // Filter and search
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.class_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filter === "all" || item.type === filter

    return matchesSearch && matchesFilter
  })

  // Stats
  const totalItems = items.length
  const examCount = items.filter((i) => i.type === "exam").length
  const shadowCount = items.filter((i) => i.type === "shadow_paper").length
  const revisionCount = items.filter((i) => i.type === "revision_list").length

  // Click handler — route to the right place
  const handleItemClick = (item: LibraryItem) => {
    if (item.type === "shadow_paper") {
      // Shadow papers go directly to print preview
      router.push(`/dashboard/assignments/${item.id}/print`)
    } else if (item.type === "revision_list") {
      // Revision lists go to the dedicated detail page
      router.push(`/dashboard/library/revision/${item.id}`)
    } else {
      // Regular exams go to the assignment detail page
      router.push(`/dashboard/assignments/${item.id}`)
    }
  }

  // Delete handler
  const handleDelete = async (item: LibraryItem) => {
    const typeLabel = TYPE_CONFIG[item.type].label.toLowerCase()
    if (
      !confirm(
        `Are you sure you want to delete "${item.title}"? This ${typeLabel} will be permanently removed.`
      )
    ) {
      return
    }

    if (item.type === "revision_list") {
      const result = await deleteRevisionList(item.id)
      if (!result.success) {
        console.error("Failed to delete revision list:", result.error)
      }
    } else {
      const result = await deleteAssignment(item.id)
      if (!result.success) {
        console.error("Failed to delete assignment:", result.error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              Resources
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
                  My Library
                </h1>
                <p className="text-swiss-lead font-medium">
                  All your exams, shadow papers, and revision lists in one place
                </p>
              </div>
              <Link href="/dashboard/assignments/create">
                <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider border-2 border-swiss-signal">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-0 md:grid-cols-4 border-2 border-swiss-ink">
        <div className="border-r-2 border-swiss-ink p-6 bg-swiss-paper">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
              Total
            </span>
            <Library className="h-5 w-5 text-swiss-ink" />
          </div>
          <div className="text-4xl font-black">{totalItems}</div>
          <p className="text-xs text-swiss-lead font-bold uppercase tracking-wider mt-1">
            resources
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Exams
            </span>
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-4xl font-black text-blue-700">{examCount}</div>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1">
            created papers
          </p>
        </div>

        <div className="border-r-2 border-swiss-ink p-6 bg-purple-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-700">
              Shadow
            </span>
            <Ghost className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-4xl font-black text-purple-700">
            {shadowCount}
          </div>
          <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mt-1">
            AI-generated
          </p>
        </div>

        <div className="p-6 bg-amber-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Revision
            </span>
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-4xl font-black text-amber-700">
            {revisionCount}
          </div>
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-1">
            revision lists
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-swiss-lead" />
          <Input
            placeholder="Search library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-swiss-ink font-medium"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "all" ? "bg-swiss-ink text-swiss-paper" : ""
            }`}
          >
            <Filter className="h-3 w-3 mr-1" />
            All
          </Button>
          <Button
            variant={filter === "exam" ? "default" : "outline"}
            onClick={() => setFilter("exam")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "exam"
                ? TYPE_CONFIG.exam.filterActiveClass
                : ""
            }`}
          >
            <FileText className="h-3 w-3 mr-1" />
            Exams
          </Button>
          <Button
            variant={filter === "shadow_paper" ? "default" : "outline"}
            onClick={() => setFilter("shadow_paper")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "shadow_paper"
                ? TYPE_CONFIG.shadow_paper.filterActiveClass
                : ""
            }`}
          >
            <Ghost className="h-3 w-3 mr-1" />
            Shadow Papers
          </Button>
          <Button
            variant={filter === "revision_list" ? "default" : "outline"}
            onClick={() => setFilter("revision_list")}
            className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
              filter === "revision_list"
                ? TYPE_CONFIG.revision_list.filterActiveClass
                : ""
            }`}
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Revision Lists
          </Button>
        </div>
      </div>

      {/* Resource List */}
      {filteredItems.length === 0 ? (
        <Card className="border-2 border-swiss-ink">
          <CardContent className="p-12 text-center">
            <Library className="h-12 w-12 mx-auto mb-4 text-swiss-lead" />
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">
              {items.length === 0 ? "Library Empty" : "No Results"}
            </h3>
            <p className="text-swiss-lead font-medium mb-6">
              {items.length === 0
                ? "Create an assignment or generate a shadow paper to get started."
                : "Try adjusting your search or filter."}
            </p>
            {items.length === 0 && (
              <Link href="/dashboard/assignments/create">
                <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Assignment
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-swiss-ink">
          <CardHeader className="border-b-2 border-swiss-ink">
            <CardTitle className="text-lg font-black uppercase tracking-wider">
              All Resources
              <span className="text-swiss-lead font-bold ml-2">
                ({filteredItems.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-swiss-ink/20">
              {filteredItems.map((item) => (
                <LibraryRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onClick={() => handleItemClick(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =====================================================
// Library Row Component
// =====================================================

function LibraryRow({
  item,
  onClick,
  onDelete,
}: {
  item: LibraryItem
  onClick: () => void
  onDelete: () => void
}) {
  const config = TYPE_CONFIG[item.type]
  const TypeIcon = config.icon

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-swiss-concrete/50 transition-colors group">
      {/* Type Icon */}
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-swiss-ink cursor-pointer"
        onClick={onClick}
      >
        <TypeIcon className="h-5 w-5" />
      </div>

      {/* Title & Meta */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold text-swiss-ink truncate">{item.title}</h3>
          <Badge
            className={`${config.badgeClass} text-[10px] font-bold uppercase tracking-wider border`}
          >
            {config.label}
          </Badge>
          {item.status && (
            <Badge
              className={`text-[10px] font-bold uppercase tracking-wider border ${
                item.status === "published"
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-gray-100 text-gray-600 border-gray-300"
              }`}
            >
              {item.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-swiss-lead font-medium">
          <span>{item.class_name}</span>
          <span className="text-swiss-ink/30">|</span>
          <span>{item.subject}</span>
          <span className="text-swiss-ink/30">|</span>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {item.question_count} questions
          </span>
          <span className="text-swiss-ink/30">|</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Primary action button */}
        {item.type === "shadow_paper" ? (
          <Link href={`/dashboard/assignments/${item.id}/print`}>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
          </Link>
        ) : item.type === "revision_list" ? (
          <Link href={`/dashboard/library/revision/${item.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
        ) : (
          <Link href={`/dashboard/assignments/${item.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-2 border-swiss-ink">
            {item.type !== "revision_list" && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `/dashboard/assignments/${item.id}`,
                      "_self"
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `/dashboard/assignments/${item.id}/print`,
                      "_self"
                    )
                  }
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

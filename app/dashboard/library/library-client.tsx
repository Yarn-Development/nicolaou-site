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
  Link2,
  Video,
  FileUp,
  StickyNote,
  Plus,
  X,
  Check,
  ExternalLink,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LibraryItem, LibraryItemType } from "@/app/actions/library"
import type { Class } from "@/app/actions/classes"
import type { ClassResource, ResourceType } from "@/app/actions/resources"
import { createResource, deleteResource } from "@/app/actions/resources"
import { deleteAssignment } from "@/app/actions/assignments"
import { deleteRevisionList } from "@/app/actions/revision-lists"

// =====================================================
// Props & Filter Types
// =====================================================

interface LibraryClientProps {
  items: LibraryItem[]
  classes: Class[]
  resources: ClassResource[]
}

type FilterType = "all" | "exam" | "shadow_paper" | "revision_list"
type TabType = "assignments" | "resources"

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

const RESOURCE_TYPE_CONFIG: Record<
  ResourceType,
  { label: string; icon: typeof Link2; badgeClass: string }
> = {
  video_link: {
    label: "Video",
    icon: Video,
    badgeClass: "bg-red-100 text-red-800 border-red-300",
  },
  pdf: {
    label: "PDF",
    icon: FileUp,
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
  },
  note: {
    label: "Note",
    icon: StickyNote,
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  link: {
    label: "Link",
    icon: Link2,
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
  },
}

// =====================================================
// Component
// =====================================================

export function LibraryClient({ items, classes, resources: initialResources }: LibraryClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<TabType>("assignments")
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")

  // Resources state
  const [resources, setResources] = useState<ClassResource[]>(initialResources)
  const [showAddResource, setShowAddResource] = useState(false)
  const [resourceClassFilter, setResourceClassFilter] = useState<string>("all")
  const [newResource, setNewResource] = useState({
    title: "",
    type: "link" as ResourceType,
    url: "",
    description: "",
    class_id: "",
    topic_tags: [] as string[],
    tagInput: "",
  })
  const [savingResource, setSavingResource] = useState(false)
  const [resourceError, setResourceError] = useState<string | null>(null)

  // Filter and search
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.class_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || item.type === filter
    return matchesSearch && matchesFilter
  })

  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass =
      resourceClassFilter === "all" || r.class_id === resourceClassFilter
    return matchesSearch && matchesClass
  })

  // Stats
  const totalItems = items.length
  const examCount = items.filter((i) => i.type === "exam").length
  const shadowCount = items.filter((i) => i.type === "shadow_paper").length
  const revisionCount = items.filter((i) => i.type === "revision_list").length

  // Assignment click handler
  const handleItemClick = (item: LibraryItem) => {
    if (item.type === "shadow_paper") {
      router.push(`/dashboard/assignments/${item.id}/print`)
    } else if (item.type === "revision_list") {
      router.push(`/dashboard/library/revision/${item.id}`)
    } else {
      router.push(`/dashboard/assignments/${item.id}`)
    }
  }

  const handleDeleteAssignment = async (item: LibraryItem) => {
    const typeLabel = TYPE_CONFIG[item.type].label.toLowerCase()
    if (!confirm(`Are you sure you want to delete "${item.title}"? This ${typeLabel} will be permanently removed.`)) return
    if (item.type === "revision_list") {
      await deleteRevisionList(item.id)
    } else {
      await deleteAssignment(item.id)
    }
  }

  // Resource handlers
  const handleAddResource = async () => {
    if (!newResource.title.trim()) return
    setSavingResource(true)
    setResourceError(null)
    const result = await createResource({
      title: newResource.title.trim(),
      type: newResource.type,
      url: newResource.url.trim() || undefined,
      description: newResource.description.trim() || undefined,
      class_id: newResource.class_id || undefined,
      topic_tags: newResource.topic_tags,
    })
    setSavingResource(false)
    if (!result.success) {
      setResourceError(result.error || "Failed to add resource")
      return
    }
    setResources((prev) => [result.data!, ...prev])
    setNewResource({ title: "", type: "link", url: "", description: "", class_id: "", topic_tags: [], tagInput: "" })
    setShowAddResource(false)
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return
    const result = await deleteResource(id)
    if (result.success) {
      setResources((prev) => prev.filter((r) => r.id !== id))
    }
  }

  const handleAddTag = () => {
    const tag = newResource.tagInput.trim()
    if (tag && !newResource.topic_tags.includes(tag)) {
      setNewResource((prev) => ({ ...prev, topic_tags: [...prev.topic_tags, tag], tagInput: "" }))
    }
  }

  const handleRemoveTag = (tag: string) => {
    setNewResource((prev) => ({ ...prev, topic_tags: prev.topic_tags.filter((t) => t !== tag) }))
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
                  All your exams, shadow papers, revision lists, and class resources
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/library/booklet">
                  <Button variant="outline" className="font-bold uppercase tracking-wider border-2 border-swiss-ink">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Generate Booklet
                  </Button>
                </Link>
                {tab === "assignments" ? (
                  <Link href="/dashboard/assignments/create">
                    <Button className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider border-2 border-swiss-signal">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create New
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => setShowAddResource(true)}
                    className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider border-2 border-swiss-signal"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                )}
              </div>
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
            assignments
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
          <div className="text-4xl font-black text-purple-700">{shadowCount}</div>
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
          <div className="text-4xl font-black text-amber-700">{revisionCount}</div>
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-1">
            revision lists
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-swiss-ink">
        <button
          onClick={() => setTab("assignments")}
          className={`px-6 py-3 font-bold uppercase text-sm tracking-widest border-b-4 transition-colors ${
            tab === "assignments"
              ? "border-swiss-signal text-swiss-signal"
              : "border-transparent text-swiss-lead hover:text-swiss-ink"
          }`}
        >
          Assignments & Papers
        </button>
        <button
          onClick={() => setTab("resources")}
          className={`px-6 py-3 font-bold uppercase text-sm tracking-widest border-b-4 transition-colors ${
            tab === "resources"
              ? "border-swiss-signal text-swiss-signal"
              : "border-transparent text-swiss-lead hover:text-swiss-ink"
          }`}
        >
          Class Resources
          {resources.length > 0 && (
            <span className="ml-2 bg-swiss-ink text-swiss-paper text-[10px] font-bold px-1.5 py-0.5">
              {resources.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-swiss-lead" />
          <Input
            placeholder={tab === "assignments" ? "Search library..." : "Search resources..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-swiss-ink font-medium"
          />
        </div>

        {tab === "assignments" && (
          <div className="flex gap-2 flex-wrap">
            {(["all", "exam", "shadow_paper", "revision_list"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={`border-2 border-swiss-ink font-bold uppercase text-xs ${
                  filter === f
                    ? f === "all"
                      ? "bg-swiss-ink text-swiss-paper"
                      : TYPE_CONFIG[f as LibraryItemType]?.filterActiveClass || "bg-swiss-ink text-swiss-paper"
                    : ""
                }`}
              >
                {f === "all" ? (
                  <><Filter className="h-3 w-3 mr-1" />All</>
                ) : f === "exam" ? (
                  <><FileText className="h-3 w-3 mr-1" />Exams</>
                ) : f === "shadow_paper" ? (
                  <><Ghost className="h-3 w-3 mr-1" />Shadow</>
                ) : (
                  <><BookOpen className="h-3 w-3 mr-1" />Revision</>
                )}
              </Button>
            ))}
          </div>
        )}

        {tab === "resources" && classes.length > 0 && (
          <Select value={resourceClassFilter} onValueChange={setResourceClassFilter}>
            <SelectTrigger className="w-48 border-2 border-swiss-ink font-medium">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* === ASSIGNMENTS TAB === */}
      {tab === "assignments" && (
        filteredItems.length === 0 ? (
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
                    onDelete={() => handleDeleteAssignment(item)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* === RESOURCES TAB === */}
      {tab === "resources" && (
        <div className="space-y-4">
          {/* Add Resource Form */}
          {showAddResource && (
            <Card className="border-2 border-swiss-signal">
              <CardHeader className="border-b-2 border-swiss-ink pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-black uppercase tracking-wider">
                    Add Resource
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setShowAddResource(false); setResourceError(null) }}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Title *</label>
                    <Input
                      value={newResource.title}
                      onChange={(e) => setNewResource((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Quadratics Revision Video"
                      className="border-2 border-swiss-ink font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Type</label>
                    <Select
                      value={newResource.type}
                      onValueChange={(v) => setNewResource((p) => ({ ...p, type: v as ResourceType }))}
                    >
                      <SelectTrigger className="border-2 border-swiss-ink font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video_link">Video Link</SelectItem>
                        <SelectItem value="pdf">PDF / Document</SelectItem>
                        <SelectItem value="link">Website Link</SelectItem>
                        <SelectItem value="note">Text Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    {newResource.type === "note" ? "Content" : "URL"}
                  </label>
                  {newResource.type === "note" ? (
                    <Textarea
                      value={newResource.url}
                      onChange={(e) => setNewResource((p) => ({ ...p, url: e.target.value }))}
                      placeholder="Enter your note content..."
                      rows={3}
                      className="border-2 border-swiss-ink font-medium"
                    />
                  ) : (
                    <Input
                      value={newResource.url}
                      onChange={(e) => setNewResource((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://..."
                      className="border-2 border-swiss-ink font-medium"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Description (optional)</label>
                    <Input
                      value={newResource.description}
                      onChange={(e) => setNewResource((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description..."
                      className="border-2 border-swiss-ink font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">Assign to class (optional)</label>
                    <Select
                      value={newResource.class_id || "none"}
                      onValueChange={(v) => setNewResource((p) => ({ ...p, class_id: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger className="border-2 border-swiss-ink font-medium">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All classes (school-wide)</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Topic tags */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-swiss-lead">
                    Topic Tags
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newResource.tagInput}
                      onChange={(e) => setNewResource((p) => ({ ...p, tagInput: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag() } }}
                      placeholder="Type a topic and press Enter..."
                      className="border-2 border-swiss-ink font-medium flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddTag}
                      className="border-2 border-swiss-ink font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newResource.topic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newResource.topic_tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 bg-swiss-concrete border border-swiss-ink/30 text-xs font-bold px-2 py-1"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {resourceError && (
                  <p className="text-sm text-red-600 font-medium">{resourceError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowAddResource(false); setResourceError(null) }}
                    className="border-2 border-swiss-ink font-bold uppercase text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddResource}
                    disabled={savingResource || !newResource.title.trim()}
                    className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase text-xs tracking-wider"
                  >
                    {savingResource ? "Saving..." : (
                      <><Check className="h-3 w-3 mr-1" />Save Resource</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resource List */}
          {filteredResources.length === 0 ? (
            <Card className="border-2 border-swiss-ink">
              <CardContent className="p-12 text-center">
                <Link2 className="h-12 w-12 mx-auto mb-4 text-swiss-lead" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">
                  {resources.length === 0 ? "No Resources Yet" : "No Results"}
                </h3>
                <p className="text-swiss-lead font-medium mb-6">
                  {resources.length === 0
                    ? "Share videos, PDFs, and links with your classes."
                    : "Try adjusting your search or class filter."}
                </p>
                {resources.length === 0 && !showAddResource && (
                  <Button
                    onClick={() => setShowAddResource(true)}
                    className="bg-swiss-signal hover:bg-swiss-signal/90 text-white font-bold uppercase tracking-wider"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Resource
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-swiss-ink">
              <CardHeader className="border-b-2 border-swiss-ink">
                <CardTitle className="text-lg font-black uppercase tracking-wider">
                  Class Resources
                  <span className="text-swiss-lead font-bold ml-2">
                    ({filteredResources.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-swiss-ink/20">
                  {filteredResources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      classes={classes}
                      onDelete={() => handleDeleteResource(resource.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-swiss-ink cursor-pointer"
        onClick={onClick}
      >
        <TypeIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold text-swiss-ink truncate">{item.title}</h3>
          <Badge className={`${config.badgeClass} text-[10px] font-bold uppercase tracking-wider border`}>
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

      <div className="flex-shrink-0 flex items-center gap-2">
        {item.type === "shadow_paper" ? (
          <Link href={`/dashboard/assignments/${item.id}/print`}>
            <Button variant="outline" size="sm" className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider">
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
          </Link>
        ) : item.type === "revision_list" ? (
          <div className="flex items-center gap-1">
            <Link href={`/dashboard/library/revision/${item.id}`}>
              <Button variant="outline" size="sm" className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            <Link href={`/revision-list/${item.id}`}>
              <Button variant="outline" size="sm" className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider">
                <Printer className="h-3 w-3 mr-1" />
                Print
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={`/dashboard/assignments/${item.id}`}>
            <Button variant="outline" size="sm" className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-2 border-swiss-ink">
            {item.type === "revision_list" ? (
              <>
                <DropdownMenuItem onClick={() => window.open(`/dashboard/library/revision/${item.id}`, "_self")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/revision-list/${item.id}`, "_self")}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => window.open(`/dashboard/assignments/${item.id}`, "_self")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`/dashboard/assignments/${item.id}/print`, "_self")}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// =====================================================
// Resource Row Component
// =====================================================

function ResourceRow({
  resource,
  classes,
  onDelete,
}: {
  resource: ClassResource
  classes: Class[]
  onDelete: () => void
}) {
  const config = RESOURCE_TYPE_CONFIG[resource.type]
  const TypeIcon = config.icon
  const className = classes.find((c) => c.id === resource.class_id)?.name

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-swiss-concrete/50 transition-colors group">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-swiss-ink">
        <TypeIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold text-swiss-ink">{resource.title}</h3>
          <Badge className={`${config.badgeClass} text-[10px] font-bold uppercase tracking-wider border`}>
            {config.label}
          </Badge>
          {className && (
            <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-[10px] font-bold uppercase tracking-wider border">
              {className}
            </Badge>
          )}
          {!resource.class_id && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider border">
              School-wide
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-swiss-lead font-medium flex-wrap">
          {resource.description && (
            <span className="truncate max-w-xs">{resource.description}</span>
          )}
          {resource.topic_tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3" />
              {resource.topic_tags.map((t) => (
                <span key={t} className="bg-swiss-concrete border border-swiss-ink/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {t}
                </span>
              ))}
            </div>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(resource.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {resource.url && resource.type !== "note" && (
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-2 border-swiss-ink font-bold uppercase text-xs tracking-wider">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          </a>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Search,
} from "lucide-react"
import { updateUserRole, removeUser, inviteUser, type AdminUser } from "@/app/actions/admin"

const EXAM_BOARDS = [
  "Edexcel GCSE Maths (Foundation & Higher)",
  "OCR GCSE Maths (Foundation & Higher)",
  "AQA GCSE Maths (Foundation & Higher)",
  "Edexcel A Level Maths",
  "OCR A Level Maths",
  "Edexcel IGCSE Maths",
  "IB Maths (SL & HL)",
  "Madas Maths IYGB",
]

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-swiss-signal text-white",
  teacher: "bg-blue-100 text-blue-800",
  student: "bg-green-100 text-green-800",
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="w-3 h-3" />,
  teacher: <BookOpen className="w-3 h-3" />,
  student: <GraduationCap className="w-3 h-3" />,
}

interface AdminClientProps {
  users: AdminUser[]
  currentUserId: string
  currentUserRole: string
}

export function AdminClient({ users: initialUsers, currentUserId, currentUserRole }: AdminClientProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [tab, setTab] = useState<"users" | "boards">("users")

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState<"teacher" | "student">("teacher")

  // Edit role dialog
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [newRole, setNewRole] = useState<"student" | "teacher" | "admin">("teacher")

  // Remove confirm
  const [removingUser, setRemovingUser] = useState<AdminUser | null>(null)

  const [isPending, startTransition] = useTransition()
  const isAdmin = currentUserRole === "admin"

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleEditRole(user: AdminUser) {
    setEditingUser(user)
    setNewRole(user.role)
  }

  function handleSaveRole() {
    if (!editingUser) return
    startTransition(async () => {
      const { error } = await updateUserRole(editingUser.id, newRole)
      if (error) {
        toast.error(error)
        return
      }
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: newRole } : u))
      toast.success("Role updated")
      setEditingUser(null)
    })
  }

  function handleRemove() {
    if (!removingUser) return
    startTransition(async () => {
      const { error } = await removeUser(removingUser.id)
      if (error) {
        toast.error(error)
        return
      }
      setUsers(prev => prev.filter(u => u.id !== removingUser.id))
      toast.success("User removed")
      setRemovingUser(null)
    })
  }

  function handleInvite() {
    if (!inviteEmail || !inviteName) {
      toast.error("Please fill in all fields")
      return
    }
    startTransition(async () => {
      const { error } = await inviteUser(inviteEmail, inviteName, inviteRole)
      if (error) {
        toast.error(error)
        return
      }
      toast.success(`Invitation sent to ${inviteEmail}`)
      setShowInvite(false)
      setInviteEmail("")
      setInviteName("")
      setInviteRole("teacher")
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-4 border-swiss-ink pb-6">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="block text-sm font-bold uppercase tracking-widest text-swiss-signal mb-2">
              ADMIN
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h1 className="text-5xl font-black uppercase tracking-tight text-swiss-ink mb-4">
              SCHOOL MANAGEMENT
            </h1>
            <p className="text-swiss-lead text-lg">
              Manage users, roles, and school configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-2 border-swiss-ink">
        <button
          onClick={() => setTab("users")}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 font-black uppercase tracking-wider transition-colors ${
            tab === "users"
              ? "bg-swiss-signal text-white"
              : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
          }`}
        >
          <Users className="w-5 h-5" />
          USERS
        </button>
        <button
          onClick={() => setTab("boards")}
          className={`flex-1 px-6 py-4 flex items-center justify-center gap-3 font-black uppercase tracking-wider transition-colors border-l-2 border-swiss-ink ${
            tab === "boards"
              ? "bg-swiss-signal text-white"
              : "bg-swiss-paper text-swiss-ink hover:bg-swiss-concrete"
          }`}
        >
          <BookOpen className="w-5 h-5" />
          EXAM BOARDS
        </button>
      </div>

      {tab === "users" && (
        <div className="space-y-6">
          {/* Search + Invite */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-swiss-lead" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-swiss-ink"
              />
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowInvite(true)}
                className="bg-swiss-signal text-white font-black uppercase tracking-wider hover:bg-swiss-ink border-2 border-swiss-ink"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                INVITE
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {["admin", "teacher", "student"].map(role => (
              <div key={role} className="border-2 border-swiss-ink p-4">
                <div className="text-3xl font-black text-swiss-ink">
                  {users.filter(u => u.role === role).length}
                </div>
                <div className="text-sm font-bold uppercase tracking-wider text-swiss-lead capitalize">
                  {role}s
                </div>
              </div>
            ))}
          </div>

          {/* Users Table */}
          <div className="border-2 border-swiss-ink overflow-hidden">
            <div className="grid grid-cols-12 bg-swiss-ink text-white px-4 py-3 text-xs font-black uppercase tracking-wider">
              <div className="col-span-4">Name</div>
              <div className="col-span-4">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-1">Status</div>
              {isAdmin && <div className="col-span-1 text-right">Actions</div>}
            </div>

            {filteredUsers.length === 0 ? (
              <div className="px-4 py-12 text-center text-swiss-lead">
                No users found.
              </div>
            ) : (
              filteredUsers.map((user, i) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-12 items-center px-4 py-3 text-sm ${
                    i % 2 === 0 ? "bg-swiss-paper" : "bg-white"
                  } ${user.id === currentUserId ? "border-l-4 border-swiss-signal" : ""}`}
                >
                  <div className="col-span-4 font-medium text-swiss-ink">
                    {user.full_name ?? "—"}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-swiss-lead">(you)</span>
                    )}
                  </div>
                  <div className="col-span-4 text-swiss-lead text-xs truncate">
                    {user.email}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_ICONS[user.role]}
                      {user.role}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${user.onboarding_completed ? "bg-green-500" : "bg-yellow-400"}`} />
                  </div>
                  {isAdmin && (
                    <div className="col-span-1 flex gap-1 justify-end">
                      {user.id !== currentUserId && (
                        <>
                          <button
                            onClick={() => handleEditRole(user)}
                            className="p-1 hover:text-swiss-signal transition-colors"
                            title="Change role"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRemovingUser(user)}
                            className="p-1 hover:text-red-600 transition-colors"
                            title="Remove user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "boards" && (
        <div className="space-y-6">
          <p className="text-swiss-lead">
            Active exam boards determine which syllabus topic trees are available for classes and question tagging.
          </p>
          <div className="border-2 border-swiss-ink divide-y divide-swiss-ink/20">
            {EXAM_BOARDS.map(board => (
              <div key={board} className="flex items-center justify-between px-6 py-4">
                <span className="font-medium text-swiss-ink">{board}</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-sm text-swiss-lead">
            All exam boards are currently active. Contact Yarn Development to adjust the board scope.
          </p>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation email. The user will sign in with their Google account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Full name</Label>
              <Input
                placeholder="e.g. Emma Turner"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="mt-1 border-2 border-swiss-ink"
              />
            </div>
            <div>
              <Label>Email address</Label>
              <Input
                type="email"
                placeholder="e.g. emma@school.edu"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="mt-1 border-2 border-swiss-ink"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as "teacher" | "student")}>
                <SelectTrigger className="mt-1 border-2 border-swiss-ink">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={isPending}
              className="bg-swiss-signal text-white font-black"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {editingUser?.full_name ?? editingUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New role</Label>
            <Select value={newRole} onValueChange={v => setNewRole(v as typeof newRole)}>
              <SelectTrigger className="mt-1 border-2 border-swiss-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              onClick={handleSaveRole}
              disabled={isPending}
              className="bg-swiss-signal text-white font-black"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={!!removingUser} onOpenChange={() => setRemovingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Remove User</DialogTitle>
            <DialogDescription>
              This will permanently delete {removingUser?.full_name ?? removingUser?.email} from the platform.
              Their data (classes, submissions) will remain. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingUser(null)}>Cancel</Button>
            <Button
              onClick={handleRemove}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-black"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

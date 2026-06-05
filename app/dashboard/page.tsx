'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
  Plus,
  Upload,
  ImageIcon,
  FolderKanban,
  Users,
  HardDrive,
  Settings as SettingsIcon,
  Mail,
  User,
  Server,
  Activity,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowUpRight,
  ArrowDownUp,
  Search,
  MoreVertical,
  Trash2,
  Shield,
  Eye,
  Edit3,
  Building2,
  Globe,
  Briefcase,
  UserPlus,
  UserCheck,
  Clock,
  Crown,
  Lock,
  Bell,
  BellOff,
  AlertTriangle,
  CheckCircle2,
  Send,
  ExternalLink,
  Loader2,
  Camera,
  CreditCard,
  Zap,
  Link2,
  Files,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ImageCard } from '@/components/dashboard/ImageCard'
import { UploadModal } from '@/components/dashboard/UploadModal'
import { cn } from '@/lib/utils'
import { useRef } from 'react'

interface ProjectData {
  id: string
  title: string
  publicToken: string
  createdAt: string
  imageCount: number
  commentCount: number
  thumbnail: string | null
  status?: string
  statuses?: string[]
}

interface TeamMemberData {
  id: string
  email: string
  name: string
  role: string
  status: string
  invitedAt: string
  acceptedAt: string | null
}

interface OrganizationData {
  id?: string
  name: string
  website: string
  industry: string
  teamSize: string
  description: string
  logoUrl: string
  brandColor: string
  tagline: string
  phone: string
  address: string
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
      <div className="aspect-video animate-skeleton bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 animate-skeleton rounded-lg bg-muted" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-1/3 animate-skeleton rounded-lg bg-muted" />
          <div className="flex gap-1">
            <div className="h-8 w-8 animate-skeleton rounded-lg bg-muted" />
            <div className="h-8 w-8 animate-skeleton rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Role badge component
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Owner: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-500', icon: <Crown className="h-3 w-3" /> },
    Admin: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-500', icon: <Shield className="h-3 w-3" /> },
    Collaborator: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500', icon: <Edit3 className="h-3 w-3" /> },
    Reviewer: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500', icon: <Eye className="h-3 w-3" /> },
  }
  const c = config[role] || config.Collaborator
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border', c.bg, c.text)}>
      {c.icon}
      {role}
    </span>
  )
}

// Status dot component
function StatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
      <span className={cn(
        'h-2 w-2 rounded-full',
        status === 'Active' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 animate-pulse shadow-sm shadow-amber-500/50'
      )} />
      <span className={status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}>
        {status}
      </span>
    </span>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'projects' | 'teams' | 'storage' | 'admin' | 'settings'>('projects')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [projectView, setProjectView] = useState<'my' | 'company'>('my')
  const [teamProjects, setTeamProjects] = useState<(ProjectData & { owner?: { id: string; name: string; email: string; isMe: boolean } })[]>([])
  const [isLoadingTeamProjects, setIsLoadingTeamProjects] = useState(false)
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false)
  const { toast } = useToast()
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'size'>('newest')
  const [groupBy, setGroupBy] = useState<'none' | 'status'>('none')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived'>('active')
  const [isBulkActionPending, setIsBulkActionPending] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Stats State
  const [stats, setStats] = useState({
    projectsCount: 0,
    imagesCount: 0,
    commentsCount: 0,
    unreadNotificationsCount: 0,
    storageUsedMB: 0,
    storageLimitMB: 100,
    userRole: 'Owner',
  })

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Collaborator')
  const [isInviting, setIsInviting] = useState(false)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [memberActionMenu, setMemberActionMenu] = useState<string | null>(null)

  // Organization State
  const [organization, setOrganization] = useState<OrganizationData>({
    name: '', website: '', industry: '', teamSize: '', description: '', logoUrl: '',
    brandColor: '#6366f1', tagline: '', phone: '', address: ''
  })
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [isEditingOrg, setIsEditingOrg] = useState(false)

  // Settings form states
  const [profileName, setProfileName] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingOrgLogo, setIsUploadingOrgLogo] = useState(false)
  const userAvatarInputRef = useRef<HTMLInputElement>(null)
  const orgLogoInputRef = useRef<HTMLInputElement>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [smtpSettings, setSmtpSettings] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    user: '',
    from: 'PixelPin <noreply@pixelpin.app>',
  })
  const [notifSettings, setNotifSettings] = useState({
    emailOnComment: true,
    emailOnInvite: true,
    emailOnMention: true,
    browserNotifications: false,
  })

  // Admin tab states
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', action: 'User login', user: 'admin@pixelpin.app', ip: '192.168.1.12', time: '2026-06-04 01:23' },
    { id: '2', action: 'Created project "Homepage Redesign"', user: 'admin@pixelpin.app', ip: '192.168.1.12', time: '2026-06-04 01:10' },
    { id: '3', action: 'Invited team member "designer@pixelpin.app"', user: 'admin@pixelpin.app', ip: '192.168.1.12', time: '2026-06-03 23:45' },
    { id: '4', action: 'Updated branding custom colors', user: 'admin@pixelpin.app', ip: '192.168.1.12', time: '2026-06-03 22:15' },
  ])
  const [ssoConfig, setSsoConfig] = useState({
    provider: 'Okta',
    idpUrl: 'https://idp.okta.com/app/exk12345/sso/saml',
    entityId: 'pixelpin-enterprise-sp',
    active: false,
  })
  const [apiKey, setApiKey] = useState('')
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)

  const handleGenerateApiKey = () => {
    setIsGeneratingKey(true)
    setTimeout(() => {
      const key = 'pp_live_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      setApiKey(key)
      setIsGeneratingKey(false)
      toast('success', 'New API key generated successfully!')
    }, 600)
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopiedKey(true)
    toast('success', 'API key copied to clipboard!')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  // Set default profile name when session loads
  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name)
    }
    if (session?.user?.email) {
      setSmtpSettings(prev => ({ ...prev, user: session.user!.email! }))
    }
  }, [session])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/images')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch {
      toast('error', 'Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        if (data.bio !== undefined) setProfileBio(data.bio)
        if (data.userImage) setProfileImage(data.userImage)
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    }
  }, [])

  const fetchTeamMembers = useCallback(async () => {
    setIsLoadingTeam(true)
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data)
      }
    } catch (err) {
      console.error('Error fetching team members:', err)
    } finally {
      setIsLoadingTeam(false)
    }
  }, [])

  const fetchOrganization = useCallback(async () => {
    try {
      const res = await fetch('/api/organization')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setOrganization(data)
        }
      }
    } catch (err) {
      console.error('Error fetching organization:', err)
    }
  }, [])

  const fetchTeamProjects = useCallback(async () => {
    setIsLoadingTeamProjects(true)
    try {
      const res = await fetch('/api/projects/team')
      if (res.ok) {
        const data = await res.json()
        setTeamProjects(data.projects)
        setIsWorkspaceOwner(data.isWorkspaceOwner)
      }
    } catch (err) {
      console.error('Error fetching team projects:', err)
    } finally {
      setIsLoadingTeamProjects(false)
    }
  }, [])

  const sortProjects = useCallback(<T extends ProjectData>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'name-asc': return a.title.localeCompare(b.title)
        case 'name-desc': return b.title.localeCompare(a.title)
        case 'size': return b.imageCount - a.imageCount
        default: return 0
      }
    })
  }, [sortBy])

  const sortedProjects = sortProjects(projects)
  const sortedTeamProjects = sortProjects(teamProjects)

  const filteredProjects = useMemo(() => {
    return sortedProjects.filter((project) => {
      const isArchived = project.title.startsWith('[ARCHIVED] ')
      return archiveFilter === 'active' ? !isArchived : isArchived
    })
  }, [sortedProjects, archiveFilter])

  const filteredTeamProjects = useMemo(() => {
    return sortedTeamProjects.filter((project) => {
      const isArchived = project.title.startsWith('[ARCHIVED] ')
      return archiveFilter === 'active' ? !isArchived : isArchived
    })
  }, [sortedTeamProjects, archiveFilter])

  const getGroupedProjects = useCallback(<T extends ProjectData>(items: T[]) => {
    const uniqueStatuses = Array.from(
      new Set(items.map((p) => p.status || 'In Progress'))
    )
    const order = ['In Progress', 'In Review', 'Revision Needed', 'Approved']
    uniqueStatuses.sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
    return uniqueStatuses.map((st) => ({
      statusName: st,
      projects: items.filter((p) => (p.status || 'In Progress') === st),
    }))
  }, [])

  const groupedProjects = useMemo(() => {
    if (groupBy !== 'status') return []
    return getGroupedProjects(filteredProjects)
  }, [filteredProjects, groupBy, getGroupedProjects])

  const groupedTeamProjects = useMemo(() => {
    if (groupBy !== 'status') return []
    return getGroupedProjects(filteredTeamProjects)
  }, [filteredTeamProjects, groupBy, getGroupedProjects])

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const handleBulkDelete = async () => {
    if (selectedProjectIds.length === 0) return

    // Restriction for collaborators and reviewers
    if (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer') {
      if (projectView === 'company') {
        const selectedProjects = teamProjects.filter(p => selectedProjectIds.includes(p.id))
        const hasOtherUserProjects = selectedProjects.some(p => p.owner && !p.owner.isMe)
        if (hasOtherUserProjects) {
          toast('error', 'You can only delete your own projects.')
          return
        }
      }
    }

    setIsBulkActionPending(true)
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProjectIds }),
      })

      if (!res.ok) throw new Error('Bulk delete failed')

      toast('success', `Successfully deleted ${selectedProjectIds.length} projects`)
      setSelectedProjectIds([])
      fetchProjects()
      if (projectView === 'company') {
        fetchTeamProjects()
      }
      fetchStats()
    } catch {
      toast('error', 'Failed to delete selected projects')
    } finally {
      setIsBulkActionPending(false)
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleBulkArchiveToggle = async () => {
    if (selectedProjectIds.length === 0) return

    // Restriction for collaborators and reviewers
    if (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer') {
      if (projectView === 'company') {
        const selectedProjects = teamProjects.filter(p => selectedProjectIds.includes(p.id))
        const hasOtherUserProjects = selectedProjects.some(p => p.owner && !p.owner.isMe)
        if (hasOtherUserProjects) {
          toast('error', 'You can only archive your own projects.')
          return
        }
      }
    }

    setIsBulkActionPending(true)
    const action = archiveFilter === 'active' ? 'archive' : 'unarchive'
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProjectIds, action }),
      })

      if (!res.ok) throw new Error('Bulk archive/unarchive failed')

      toast('success', `Successfully ${action === 'archive' ? 'archived' : 'restored'} ${selectedProjectIds.length} projects`)
      setSelectedProjectIds([])
      fetchProjects()
      if (projectView === 'company') {
        fetchTeamProjects()
      }
      fetchStats()
    } catch {
      toast('error', `Failed to ${action} selected projects`)
    } finally {
      setIsBulkActionPending(false)
    }
  }

  const handleBulkDuplicate = async () => {
    if (selectedProjectIds.length === 0) return

    // Restriction for collaborators and reviewers
    if (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer') {
      if (projectView === 'company') {
        const selectedProjects = teamProjects.filter(p => selectedProjectIds.includes(p.id))
        const hasOtherUserProjects = selectedProjects.some(p => p.owner && !p.owner.isMe)
        if (hasOtherUserProjects) {
          toast('error', 'You can only duplicate your own projects.')
          return
        }
      }
    }

    setIsBulkActionPending(true)
    try {
      const res = await fetch('/api/projects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProjectIds }),
      })

      if (!res.ok) throw new Error('Bulk duplicate failed')

      toast('success', `Successfully duplicated ${selectedProjectIds.length} projects`)
      setSelectedProjectIds([])
      fetchProjects()
      if (projectView === 'company') {
        fetchTeamProjects()
      }
      fetchStats()
    } catch {
      toast('error', 'Failed to duplicate selected projects')
    } finally {
      setIsBulkActionPending(false)
    }
  }

  const handleBulkCopyLinks = async () => {
    if (selectedProjectIds.length === 0) return
    const activeList = projectView === 'my' ? projects : teamProjects
    const selectedProjects = activeList.filter(p => selectedProjectIds.includes(p.id))
    const links = selectedProjects.map(p => `${window.location.origin}/view/${p.publicToken}`).join('\n')
    
    try {
      await navigator.clipboard.writeText(links)
      toast('success', `Copied ${selectedProjects.length} public share links to clipboard!`)
    } catch {
      toast('error', 'Failed to copy links to clipboard')
    }
  }

  const handleBulkExportMetadata = () => {
    if (selectedProjectIds.length === 0) return
    const activeList = projectView === 'my' ? projects : teamProjects
    const selectedProjects = activeList.filter(p => selectedProjectIds.includes(p.id))
    
    const exportData = selectedProjects.map(p => ({
      id: p.id,
      title: p.title.replace('[ARCHIVED] ', ''),
      publicLink: `${window.location.origin}/view/${p.publicToken}`,
      createdAt: p.createdAt,
      imageCount: p.imageCount,
      commentCount: p.commentCount
    }))

    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pixelpin-export-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast('success', `Successfully exported metadata for ${selectedProjects.length} projects`)
    } catch {
      toast('error', 'Failed to export project metadata')
    }
  }


  useEffect(() => {
    fetchProjects()
    fetchStats()
  }, [fetchProjects, fetchStats])

  useEffect(() => {
    if (projectView === 'company') {
      fetchTeamProjects()
    }
  }, [projectView, fetchTeamProjects])

  useEffect(() => {
    if (activeTab === 'teams') {
      fetchTeamMembers()
      fetchOrganization()
    }
  }, [activeTab, fetchTeamMembers, fetchOrganization])

  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((proj) => proj.id !== id))
    fetchStats()
  }

  const handleUploadComplete = () => {
    fetchProjects()
    fetchStats()
  }

  const handleCreateProjectClick = () => {
    if (stats.storageLimitMB <= 100 && projects.length >= 3) {
      toast('error', 'You have reached the limit of 3 projects on the Free plan. Please upgrade your plan.')
      return
    }
    setIsUploadOpen(true)
  }

  const [isOpeningBilling, setIsOpeningBilling] = useState(false)
  const handleManageBilling = async () => {
    setIsOpeningBilling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast('error', data.error || 'Failed to open billing portal')
      }
    } catch {
      toast('error', 'Failed to open billing portal')
    } finally {
      setIsOpeningBilling(false)
    }
  }

  const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false)
  const handleLeaveWorkspace = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this workspace? You will lose access to all shared company projects and will be reset to your own personal workspace."
    )
    if (!confirmed) return

    setIsLeavingWorkspace(true)
    try {
      const res = await fetch('/api/teams/leave', { method: 'POST' })
      if (res.ok) {
        toast('success', 'You have successfully left the workspace. You are now the owner of your own personal workspace.')
        fetchStats()
        fetchProjects()
        setActiveTab('projects')
      } else {
        const err = await res.json()
        toast('error', err.error || 'Failed to leave workspace')
      }
    } catch {
      toast('error', 'Failed to leave workspace')
    } finally {
      setIsLeavingWorkspace(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast('error', 'Please enter a valid email address.')
      return
    }

    setIsInviting(true)
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to send invitation')
      }

      const data = await res.json()
      if (data.member) {
        setTeamMembers(prev => [...prev, data.member])
      }
      if (data.emailSent) {
        toast('success', `Invitation email sent to ${inviteEmail}!`)
      } else {
        toast('success', `Member added! (Email logged — configure SMTP to deliver)`)
      }
      setInviteEmail('')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to send invitation. Please try again.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId }),
      })
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== memberId))
        toast('success', 'Team member removed.')
      }
    } catch {
      toast('error', 'Failed to remove member.')
    }
    setMemberActionMenu(null)
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/teams/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
        toast('success', `Role updated to ${newRole}.`)
      }
    } catch {
      toast('error', 'Failed to update role.')
    }
    setMemberActionMenu(null)
  }

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingOrg(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organization),
      })
      if (res.ok) {
        const data = await res.json()
        setOrganization(data)
        setIsEditingOrg(false)
        toast('success', 'Organization profile saved!')
      }
    } catch {
      toast('error', 'Failed to save organization.')
    } finally {
      setIsSavingOrg(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, bio: profileBio }),
      })
      if (res.ok) {
        toast('success', 'Profile updated successfully!')
      } else {
        throw new Error()
      }
    } catch {
      toast('error', 'Failed to save profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'organization') => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast('error', 'Invalid file type. Use JPEG, PNG, GIF, WebP, or SVG.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'File is too large. Maximum size is 5MB.')
      return
    }

    if (type === 'user') setIsUploadingAvatar(true)
    else setIsUploadingOrgLogo(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (type === 'user') {
          setProfileImage(data.url)
          toast('success', 'Profile picture updated!')
        } else {
          setOrganization(prev => ({ ...prev, logoUrl: data.url }))
          toast('success', 'Organization logo updated!')
        }
      } else {
        const err = await res.json()
        toast('error', err.error || 'Failed to upload image.')
      }
    } catch {
      toast('error', 'Failed to upload image.')
    } finally {
      if (type === 'user') setIsUploadingAvatar(false)
      else setIsUploadingOrgLogo(false)
      // Reset the input so the same file can be selected again
      e.target.value = ''
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast('error', 'New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast('error', 'Password must be at least 6 characters.')
      return
    }
    setIsChangingPassword(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        toast('success', 'Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        toast('error', data.error || 'Failed to change password.')
      }
    } catch {
      toast('error', 'Failed to change password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "WARNING: Are you absolutely sure you want to permanently delete your account? This will erase all of your projects, comments, organization settings, and subscription data. This action CANNOT be undone."
    )
    if (!confirmed) return

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'DELETE',
      })
      if (res.ok) {
        toast('success', 'Your account has been deleted.')
        signOut({ callbackUrl: '/sign-in' })
      } else {
        const err = await res.json()
        toast('error', err.error || 'Failed to delete account.')
      }
    } catch {
      toast('error', 'Failed to delete account.')
    }
  }

  const handleExportData = () => {
    window.location.href = '/api/settings/export'
  }

  const storagePercentage = Math.min(100, (stats.storageUsedMB / stats.storageLimitMB) * 100)

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(teamSearchQuery.toLowerCase())
  )

  const activeCount = teamMembers.filter(m => m.status === 'Active').length
  const pendingCount = teamMembers.filter(m => m.status === 'Pending').length

  // Navigation Links
  const navItems = [
    { id: 'projects' as const, label: 'Projects', icon: FolderKanban },
    { id: 'teams' as const, label: 'Teams', icon: Users },
    { id: 'storage' as const, label: 'Storage', icon: HardDrive },
    { id: 'admin' as const, label: 'Admin Console', icon: Shield },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
  ]

  const roleDescriptions: Record<string, string> = {
    Collaborator: 'Can edit projects and leave comments',
    Reviewer: 'Can view projects and leave comments only',
    Admin: 'Full access including team management',
  }

  return (
    <div className="flex h-screen overflow-hidden flex-col bg-background text-foreground" suppressHydrationWarning>
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Hamburger Trigger */}
        <div className="absolute top-4 left-4 z-40 md:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card shadow-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Backdrop overlay for mobile sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar Component (Desktop + Mobile slide-over) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-45 flex flex-col h-full border-r border-border bg-card transition-all duration-300 ease-in-out md:sticky md:top-0 shrink-0",
            isSidebarCollapsed ? "w-18" : "w-64",
            isMobileSidebarOpen
              ? "translate-x-0 w-64"
              : "-translate-x-full md:translate-x-0"
          )}
        >
          {/* Header section of Sidebar */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-border">
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all duration-200",
                isSidebarCollapsed && "opacity-0 w-0 overflow-hidden"
              )}
            >
              Workspace
            </span>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Desktop Toggle Collapse Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              const isLockedTab = (item.id === 'admin' && stats.storageLimitMB <= 10240) || (item.id === 'admin' && (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer'))

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'admin' && (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer')) {
                      toast('error', 'Access Restricted: Only workspace owners and administrators have access to the Admin Console.')
                      return
                    }
                    setActiveTab(item.id)
                    setIsMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all cursor-pointer group active:scale-98",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "" : "group-hover:scale-105 transition-transform")} />
                    <span
                      className={cn(
                        "transition-all duration-200",
                        isSidebarCollapsed && "opacity-0 w-0 overflow-hidden"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  {isLockedTab && !isSidebarCollapsed && (
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0 group-hover:text-amber-500 transition-colors animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Storage Summary Footprint (only if expanded) */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between text-tiny-10 font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                <span>{stats.storageLimitMB <= 100 ? 'Free' : stats.storageLimitMB <= 5120 ? 'Starter' : stats.storageLimitMB <= 10240 ? 'Pro' : 'Business'} Plan</span>
                <span>{stats.storageUsedMB} / {stats.storageLimitMB >= 1024 ? `${(stats.storageLimitMB / 1024).toFixed(0)} GB` : `${stats.storageLimitMB} MB`}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    storagePercentage > 85
                      ? "bg-gradient-to-r from-rose-500 to-red-500"
                      : "bg-gradient-to-r from-primary to-accent"
                  )}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {storagePercentage.toFixed(1)}% used
              </p>
              {stats.storageLimitMB <= 100 ? (
                <a
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 text-[11px] font-bold text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade Plan
                </a>
              ) : stats.storageLimitMB <= 5120 ? (
                <a
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 text-[11px] font-bold text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade to Pro
                </a>
              ) : stats.storageLimitMB <= 10240 ? (
                <a
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 text-[11px] font-bold text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade to Business
                </a>
              ) : (
                <button
                  onClick={handleManageBilling}
                  disabled={isOpeningBilling}
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-secondary px-3 py-2 text-[11px] font-bold text-foreground border border-border shadow-sm hover:bg-muted/80 transition-all cursor-pointer"
                >
                  {isOpeningBilling ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : (
                    <CreditCard className="h-3 w-3" />
                  )}
                  Manage Billing
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-5xl">
            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pl-10 md:pl-0">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      Projects
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {projectView === 'my'
                        ? `Your personal projects: ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`
                        : `All team workspace projects: ${teamProjects.length} ${teamProjects.length === 1 ? 'project' : 'projects'}`
                      }
                    </p>
                  </div>
                  {stats.userRole !== 'Reviewer' && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleCreateProjectClick}
                      className="shadow-md shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Create Project
                    </Button>
                  )}
                </div>

                {/* My Space / Company & Active / Archived Toggles */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* My Space / Company Toggle */}
                  <div className="flex items-center gap-1 rounded-xl bg-muted/40 border border-border p-1 w-fit">
                    <button
                      onClick={() => {
                        setProjectView('my')
                        setSelectedProjectIds([])
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        projectView === 'my'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <User className="h-3.5 w-3.5" />
                      My Space
                    </button>
                    <button
                      onClick={() => {
                        setProjectView('company')
                        setSelectedProjectIds([])
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        projectView === 'company'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      Company
                    </button>
                  </div>

                  {/* Active / Archived Toggle */}
                  <div className="flex items-center gap-1 rounded-xl bg-muted/40 border border-border p-1 w-fit animate-fade-in">
                    <button
                      onClick={() => {
                        setArchiveFilter('active')
                        setSelectedProjectIds([])
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        archiveFilter === 'active'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        setArchiveFilter('archived')
                        setSelectedProjectIds([])
                      }}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        archiveFilter === 'archived'
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      Archived
                    </button>
                  </div>
                </div>

                {/* Sort & Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Select All Checkbox */}
                    {stats.userRole !== 'Reviewer' && 
                      ((projectView === 'my' && filteredProjects.length > 0) || 
                       (projectView === 'company' && filteredTeamProjects.length > 0)) && (
                      <div className="flex items-center gap-2 select-none animate-fade-in">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-muted/30 cursor-pointer"
                            checked={
                              projectView === 'my'
                                ? filteredProjects.length > 0 && selectedProjectIds.length === filteredProjects.length
                                : filteredTeamProjects.length > 0 && selectedProjectIds.length === filteredTeamProjects.length
                            }
                            onChange={(e) => {
                              const checked = e.target.checked
                              if (checked) {
                                let currentIds = projectView === 'my'
                                  ? filteredProjects.map(p => p.id)
                                  : filteredTeamProjects.map(p => p.id)
                                // Restrict for collaborators (Reviewers are hidden)
                                if (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer') {
                                  if (projectView === 'my') {
                                    currentIds = filteredProjects.map(p => p.id)
                                  } else {
                                    currentIds = filteredTeamProjects.filter(p => p.owner?.isMe).map(p => p.id)
                                  }
                                }
                                setSelectedProjectIds(currentIds)
                              } else {
                                setSelectedProjectIds([])
                              }
                            }}
                          />
                          <span>Select All</span>
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort by</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name-asc">Name (A→Z)</option>
                        <option value="name-desc">Name (Z→A)</option>
                        <option value="size">Most Images</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group by</span>
                      <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as 'none' | 'status')}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                      >
                        <option value="none">None</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {projectView === 'my' ? filteredProjects.length : filteredTeamProjects.length} projects
                  </p>
                </div>

                {/* My Space View */}
                {projectView === 'my' && (
                  <>
                    {isLoading ? (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ) : groupBy === 'status' ? (
                      <div className="space-y-8">
                        {groupedProjects.map(({ statusName, projects: statusProjs }) => (
                          <div key={statusName} className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                              <span className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-black border uppercase tracking-wider",
                                statusName === "Approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                                statusName === "Revision Needed" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                                statusName === "In Review" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                                statusName === "In Progress" && "bg-slate-500/10 border-slate-500/20 text-slate-400 dark:text-slate-300",
                                !["Approved", "Revision Needed", "In Review", "In Progress"].includes(statusName) && "bg-primary/10 border-primary/20 text-primary"
                              )}>
                                {statusName}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-bold">
                                ({statusProjs.length})
                              </span>
                            </div>
                            
                            {statusProjs.length === 0 ? (
                              <p className="text-xs text-muted-foreground/60 italic pl-2">No projects in this status.</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {statusProjs.map((project) => (
                                  <ImageCard 
                                    key={project.id} 
                                    image={project} 
                                    onDelete={stats.userRole !== 'Reviewer' ? handleDelete : undefined}
                                    selected={selectedProjectIds.includes(project.id)}
                                    onSelectToggle={stats.userRole !== 'Reviewer' ? handleSelectToggle : undefined}
                                    isSelectionActive={selectedProjectIds.length > 0}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => (
                          <ImageCard 
                            key={project.id} 
                            image={project} 
                            onDelete={stats.userRole !== 'Reviewer' ? handleDelete : undefined}
                            selected={selectedProjectIds.includes(project.id)}
                            onSelectToggle={stats.userRole !== 'Reviewer' ? handleSelectToggle : undefined}
                            isSelectionActive={selectedProjectIds.length > 0}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Company View */}
                {projectView === 'company' && (
                  <>
                    {isLoadingTeamProjects ? (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ) : filteredTeamProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-border/80 bg-card/40 backdrop-blur-xl animate-fade-in">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/10 text-accent animate-float mb-6">
                          {archiveFilter === 'active' ? <Building2 className="h-9 w-9" /> : <FolderKanban className="h-9 w-9" />}
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                          {archiveFilter === 'active' ? 'No company projects yet' : 'No archived company projects'}
                        </h2>
                        <p className="mt-2 max-w-sm text-center text-xs text-muted-foreground leading-relaxed">
                          {archiveFilter === 'active'
                            ? 'Invite team members from the Teams tab and start uploading projects. All workspace members will see shared projects here.'
                            : 'Select active company projects and click "Archive" in the bulk action bar to move them here.'
                          }
                        </p>
                      </div>
                    ) : groupBy === 'status' ? (
                      <div className="space-y-8">
                        {groupedTeamProjects.map(({ statusName, projects: statusProjs }) => (
                          <div key={statusName} className="space-y-4 animate-fade-in">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                              <span className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-black border uppercase tracking-wider",
                                statusName === "Approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                                statusName === "Revision Needed" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                                statusName === "In Review" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                                statusName === "In Progress" && "bg-slate-500/10 border-slate-500/20 text-slate-400 dark:text-slate-300",
                                !["Approved", "Revision Needed", "In Review", "In Progress"].includes(statusName) && "bg-primary/10 border-primary/20 text-primary"
                              )}>
                                {statusName}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-bold">
                                ({statusProjs.length})
                              </span>
                            </div>
                            
                            {statusProjs.length === 0 ? (
                              <p className="text-xs text-muted-foreground/60 italic pl-2">No company projects in this status.</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {statusProjs.map((project) => (
                                  <div key={project.id} className="relative group">
                                    <ImageCard 
                                      image={project} 
                                      onDelete={(stats.userRole === 'Owner' || stats.userRole === 'Admin' || (stats.userRole === 'Collaborator' && project.owner?.isMe)) ? handleDelete : undefined}
                                      selected={selectedProjectIds.includes(project.id)}
                                      onSelectToggle={(stats.userRole === 'Owner' || stats.userRole === 'Admin' || (stats.userRole === 'Collaborator' && project.owner?.isMe)) ? handleSelectToggle : undefined}
                                      isSelectionActive={selectedProjectIds.length > 0}
                                    />
                                    {/* Owner Badge */}
                                    {project.owner && (
                                      <div className={cn(
                                        "absolute top-3 z-10 transition-all duration-300",
                                        selectedProjectIds.length > 0 || selectedProjectIds.includes(project.id) ? "left-12" : "left-3 group-hover:left-12"
                                      )}>
                                        <div className={cn(
                                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-md',
                                          project.owner.isMe
                                            ? 'bg-primary/90 text-white'
                                            : 'bg-card/90 border border-border text-foreground'
                                        )}>
                                          <div className={cn(
                                            'h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black',
                                            project.owner.isMe ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
                                          )}>
                                            {project.owner.name.charAt(0).toUpperCase()}
                                          </div>
                                          {project.owner.isMe ? 'You' : project.owner.name}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTeamProjects.map((project) => (
                          <div key={project.id} className="relative group">
                            <ImageCard 
                              image={project} 
                              onDelete={(stats.userRole === 'Owner' || stats.userRole === 'Admin' || (stats.userRole === 'Collaborator' && project.owner?.isMe)) ? handleDelete : undefined}
                              selected={selectedProjectIds.includes(project.id)}
                              onSelectToggle={(stats.userRole === 'Owner' || stats.userRole === 'Admin' || (stats.userRole === 'Collaborator' && project.owner?.isMe)) ? handleSelectToggle : undefined}
                              isSelectionActive={selectedProjectIds.length > 0}
                            />
                            {/* Owner Badge */}
                            {project.owner && (
                              <div className={cn(
                                "absolute top-3 z-10 transition-all duration-300",
                                selectedProjectIds.length > 0 || selectedProjectIds.includes(project.id) ? "left-12" : "left-3 group-hover:left-12"
                              )}>
                                <div className={cn(
                                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-md',
                                  project.owner.isMe
                                    ? 'bg-primary/90 text-white'
                                    : 'bg-card/90 border border-border text-foreground'
                                )}>
                                  <div className={cn(
                                    'h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black',
                                    project.owner.isMe ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
                                  )}>
                                    {project.owner.name.charAt(0).toUpperCase()}
                                  </div>
                                  {project.owner.isMe ? 'You' : project.owner.name}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ===================== TEAMS TAB ===================== */}
            {activeTab === 'teams' && (
              stats.storageLimitMB <= 100 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-border bg-card/50 backdrop-blur-xl text-center max-w-2xl mx-auto space-y-6 my-8 shadow-sm">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-500/10 to-purple-600/10 text-primary">
                    <Users className="h-10 w-10 text-violet-500" />
                    <div className="absolute -top-1 -right-1 bg-violet-600 text-white rounded-full p-1 shadow-md">
                      <Lock className="h-3.5 w-3.5 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Unlock Team Collaboration</h2>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Get access to workspace sharing, custom client roles (Collaborators, Admins, Reviewers), organization branding, and shared company design boards.
                    </p>
                  </div>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-102 transition-all cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    Upgrade to Starter or Higher
                  </a>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  {/* Header */}
                  <div className="pl-10 md:pl-0">
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      Team & Organization
                    </h1>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Manage your team members, roles, and organization profile for your workspace.
                  </p>
                </div>

                {/* Quick Stats Bar */}
                {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 flex items-center gap-3.5 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Members</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{teamMembers.length}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 flex items-center gap-3.5 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{activeCount}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 flex items-center gap-3.5 shadow-sm">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending</p>
                        <p className="text-lg font-black text-foreground mt-0.5">{pendingCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization Profile Card */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  {/* Gradient Header */}
                  <div className="h-24 relative overflow-hidden rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${organization.brandColor || '#6366f1'}cc, ${organization.brandColor || '#6366f1'}88, ${organization.brandColor || '#6366f1'}55)` }}>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTAgMGgydjM0SDB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                  </div>
                  <div className="px-6 pb-6 -mt-10">
                    <div className="flex items-end justify-between mb-6">
                      <div className="flex items-end gap-4">
                        {/* Logo */}
                        <div
                          className={cn(
                            "h-20 w-20 rounded-2xl border-4 border-card bg-card shadow-lg flex items-center justify-center overflow-hidden relative",
                            (stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer') ? "group/logo cursor-pointer" : ""
                          )}
                          onClick={() => {
                            if (stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer') {
                              orgLogoInputRef.current?.click()
                            }
                          }}
                          title={stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' ? "Click to change logo" : undefined}
                        >
                          {organization.logoUrl ? (
                            <img src={organization.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          )}
                          {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                            <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                              {isUploadingOrgLogo ? (
                                <Loader2 className="h-5 w-5 text-white animate-spin" />
                              ) : (
                                <Camera className="h-5 w-5 text-white" />
                              )}
                            </div>
                          )}
                          {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                            <input
                              ref={orgLogoInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                              className="hidden"
                              onChange={(e) => handleAvatarUpload(e, 'organization')}
                            />
                          )}
                        </div>
                        <div className="mb-1">
                          <h3 className="text-lg font-black text-foreground">
                            {organization.name || 'Your Organization'}
                          </h3>
                          {organization.website && (
                            <a href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5">
                              <Globe className="h-3 w-3" />
                              {organization.website}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                        <Button
                          variant={isEditingOrg ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setIsEditingOrg(!isEditingOrg)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isEditingOrg ? 'Cancel' : 'Edit'}
                        </Button>
                      )}
                    </div>

                    {/* Org Info Display */}
                    {!isEditingOrg ? (
                      <div className="space-y-4">
                        {/* Tagline */}
                        {organization.tagline && (
                          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                            &ldquo;{organization.tagline}&rdquo;
                          </p>
                        )}

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Industry</p>
                            <p className="text-xs font-semibold text-foreground">{organization.industry || '—'}</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Team Size</p>
                            <p className="text-xs font-semibold text-foreground">{organization.teamSize || '—'}</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone</p>
                            <p className="text-xs font-semibold text-foreground">{organization.phone || '—'}</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Brand Color</p>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: organization.brandColor || '#6366f1' }} />
                              <p className="text-xs font-semibold text-foreground">{organization.brandColor || '#6366f1'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Description & Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                            <p className="text-xs text-foreground leading-relaxed">{organization.description || '—'}</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Address</p>
                            <p className="text-xs text-foreground leading-relaxed">{organization.address || '—'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Org Edit Form */
                      <form onSubmit={handleSaveOrganization} className="space-y-5">
                        {/* Company Info Section */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                            <Building2 className="h-3 w-3" /> Company Information
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Company Name</label>
                              <input
                                type="text"
                                value={organization.name}
                                onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                                placeholder="Acme Design Agency"
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Tagline</label>
                              <input
                                type="text"
                                value={organization.tagline}
                                onChange={(e) => setOrganization({ ...organization, tagline: e.target.value })}
                                placeholder="Crafting digital experiences"
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Website</label>
                              <input
                                type="text"
                                value={organization.website}
                                onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                                placeholder="https://acme.design"
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Industry</label>
                              <select
                                value={organization.industry}
                                onChange={(e) => setOrganization({ ...organization, industry: e.target.value })}
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              >
                                <option value="">Select industry...</option>
                                <option value="Design Agency">Design Agency</option>
                                <option value="Software Development">Software Development</option>
                                <option value="Marketing Agency">Marketing Agency</option>
                                <option value="Freelance / Consulting">Freelance / Consulting</option>
                                <option value="E-commerce">E-commerce</option>
                                <option value="Media & Entertainment">Media & Entertainment</option>
                                <option value="Education">Education</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Finance">Finance</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Team Size</label>
                              <select
                                value={organization.teamSize}
                                onChange={(e) => setOrganization({ ...organization, teamSize: e.target.value })}
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              >
                                <option value="">Select size...</option>
                                <option value="Solo (1)">Solo (1)</option>
                                <option value="Small (2-5)">Small (2-5)</option>
                                <option value="Medium (6-20)">Medium (6-20)</option>
                                <option value="Large (21-50)">Large (21-50)</option>
                                <option value="Enterprise (50+)">Enterprise (50+)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Logo</label>
                              <div className="flex items-center gap-3">
                                <div
                                  className="h-12 w-12 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors group/logoedit shrink-0 relative"
                                  onClick={() => orgLogoInputRef.current?.click()}
                                >
                                  {organization.logoUrl ? (
                                    <img src={organization.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                                  ) : (
                                    <Camera className="h-4 w-4 text-muted-foreground group-hover/logoedit:text-primary transition-colors" />
                                  )}
                                  {isUploadingOrgLogo && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={organization.logoUrl}
                                    onChange={(e) => setOrganization({ ...organization, logoUrl: e.target.value })}
                                    placeholder="Upload or paste URL"
                                    className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  />
                                  <p className="text-[9px] text-muted-foreground mt-1">Click the icon to upload or paste a URL</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Branding Section */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: organization.brandColor || '#6366f1' }} /> Branding
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Brand Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={organization.brandColor || '#6366f1'}
                                  onChange={(e) => setOrganization({ ...organization, brandColor: e.target.value })}
                                  className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={organization.brandColor || '#6366f1'}
                                  onChange={(e) => setOrganization({ ...organization, brandColor: e.target.value })}
                                  className="flex-1 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Brand Preview</label>
                              <div
                                className="h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                style={{ backgroundColor: organization.brandColor || '#6366f1' }}
                              >
                                {organization.name || 'Company Name'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contact Section */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> Contact Information
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Phone</label>
                              <input
                                type="text"
                                value={organization.phone}
                                onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Address</label>
                              <input
                                type="text"
                                value={organization.address}
                                onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                                placeholder="123 Design Street, Suite 100"
                                className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Description</label>
                          <textarea
                            value={organization.description}
                            onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                            placeholder="Tell us about your organization..."
                            rows={3}
                            className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" size="md" onClick={() => setIsEditingOrg(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" variant="primary" size="md" loading={isSavingOrg} className="shadow-lg shadow-primary/20">
                            <CheckCircle2 className="h-4 w-4" />
                            Save Organization
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Invite + Members Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Left Invite Box */}
                  {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm h-fit">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <UserPlus className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Invite Member</h3>
                          <p className="text-[10px] text-muted-foreground">Send email invitations</p>
                        </div>
                      </div>

                      {stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer' ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl bg-muted/20 border border-dashed border-border/80">
                          <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-xs font-semibold text-foreground">Access Restricted</p>
                          <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                            Only owners and administrators can invite new members to the workspace.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleInviteMember} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              Email Address
                            </label>
                            <div className="relative">
                              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="email"
                                placeholder="teammate@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="w-full rounded-xl border border-border bg-muted/30 px-9 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              Workspace Role
                            </label>
                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="Collaborator">Collaborator</option>
                              <option value="Reviewer">Reviewer</option>
                              <option value="Admin">Admin</option>
                            </select>
                            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                              {roleDescriptions[inviteRole]}
                            </p>
                          </div>

                          <Button type="submit" variant="primary" className="w-full gap-2" loading={isInviting}>
                            <Send className="h-4 w-4" />
                            Send Invitation
                          </Button>
                        </form>
                      )}

                      {/* Recent Activity */}
                      {pendingCount > 0 && (
                        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
                          <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {pendingCount} pending {pendingCount === 1 ? 'invitation' : 'invitations'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right Members List */}
                  <div className={cn(
                    "rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-sm",
                    (stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer') ? "lg:col-span-3" : "lg:col-span-2"
                  )}>
                    {/* Header with Search */}
                    <div className="flex items-center justify-between p-5 border-b border-border/80">
                      <h3 className="text-sm font-bold text-foreground">Workspace Members</h3>
                      <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={teamSearchQuery}
                          onChange={(e) => setTeamSearchQuery(e.target.value)}
                          className="w-48 rounded-lg border border-border bg-muted/30 pl-8 pr-3 py-1.5 text-[11px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-muted/20 border-b border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="col-span-5">Member</div>
                      <div className="col-span-3">Role</div>
                      {stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer' ? (
                        <div className="col-span-4">Status</div>
                      ) : (
                        <>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-2 text-right">Actions</div>
                        </>
                      )}
                    </div>

                    {/* Members List */}
                    <div className="divide-y divide-border/40 max-h-96 overflow-y-auto" style={{ overflow: 'visible', maxHeight: 'none' }}>
                      {isLoadingTeam ? (
                        <div className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                          <p className="text-xs text-muted-foreground mt-2">Loading team members...</p>
                        </div>
                      ) : filteredMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                            <Users className="h-7 w-7" />
                          </div>
                          <p className="text-sm font-bold text-foreground">No team members yet</p>
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs text-center">
                            Invite your teammates using the form to start collaborating on projects together.
                          </p>
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                          <div key={member.id} className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 group hover:bg-muted/20 transition-colors">
                            {/* Member Info */}
                            <div className="col-span-5 flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-2",
                                member.role === 'Admin' ? 'bg-blue-500/15 text-blue-500 ring-blue-500/20' :
                                member.role === 'Collaborator' ? 'bg-emerald-500/15 text-emerald-500 ring-emerald-500/20' :
                                'bg-amber-500/15 text-amber-500 ring-amber-500/20'
                              )}>
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{member.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                              </div>
                            </div>

                            {/* Role */}
                            <div className="col-span-3">
                              <RoleBadge role={member.role} />
                            </div>

                            {/* Status */}
                            <div className={stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer' ? "col-span-4" : "col-span-2"}>
                              <StatusDot status={member.status} />
                            </div>

                            {/* Actions */}
                            {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                              <div className="col-span-2 flex justify-end relative">
                                <button
                                  onClick={() => setMemberActionMenu(memberActionMenu === member.id ? null : member.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {/* Action Dropdown */}
                                {memberActionMenu === member.id && (
                                  <div className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-xl border border-border bg-card shadow-xl py-1.5 animate-fade-in">
                                    <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Change Role</p>
                                    {['Admin', 'Collaborator', 'Reviewer'].filter(r => r !== member.role).map(role => (
                                      <button
                                        key={role}
                                        onClick={() => handleChangeRole(member.id, role)}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                                      >
                                        <RoleBadge role={role} />
                                      </button>
                                    ))}
                                    <div className="border-t border-border/60 my-1" />
                                    <button
                                      onClick={() => handleRemoveMember(member.id)}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Remove Member
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

            {/* ===================== STORAGE TAB ===================== */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Storage & Usage
                  </h1>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Check your uploaded design assets, database sizes, and active workspace limits.
                  </p>
                </div>

                {/* Storage Gauge / Progress */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4.5">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-secondary">
                      <div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary"
                        style={{ transform: `rotate(${storagePercentage * 3.6}deg)`, transition: 'transform 1s ease' }}
                      />
                      <div className="text-center">
                        <span className="text-base font-black text-foreground">{storagePercentage.toFixed(1)}%</span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">used</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-foreground">{stats.storageUsedMB} MB</span>
                        <span className="text-xs text-muted-foreground">/ {stats.storageLimitMB} MB used</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                        Your free workspace includes 100 MB of space. We optimize and compress uploaded design files (PNG, JPG, SVG) to save storage.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workspace Statistics Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4.5 flex items-center gap-3.5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Projects</p>
                      <p className="text-lg font-black text-foreground mt-0.5">{stats.projectsCount}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4.5 flex items-center gap-3.5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-500">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Designs</p>
                      <p className="text-lg font-black text-foreground mt-0.5">{stats.imagesCount}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4.5 flex items-center gap-3.5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comments</p>
                      <p className="text-lg font-black text-foreground mt-0.5">{stats.commentsCount}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4.5 flex items-center gap-3.5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Alerts</p>
                      <p className="text-lg font-black text-foreground mt-0.5">{stats.unreadNotificationsCount}</p>
                    </div>
                  </div>
                </div>

                {/* Upgrade Callout Card */}
                {stats.storageLimitMB < 30720 && (
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-indigo-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                      {stats.storageLimitMB <= 100 ? 'Upgrade to a Paid Plan' : stats.storageLimitMB <= 5120 ? 'Upgrade to Pro' : 'Upgrade to Business'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                      {stats.storageLimitMB <= 100
                        ? 'Unlock unlimited projects, team collaboration, custom branding, and up to 30 GB of storage. Plans start at $10/mo.'
                        : stats.storageLimitMB <= 5120
                          ? 'Get 10 GB storage, advanced team roles, annotation tools, and version history. Only $17/mo.'
                          : 'Get 30 GB storage, admin dashboard, SSO, audit logs, API access, and dedicated support. Only $45/mo.'}
                    </p>
                  </div>
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-105 transition-all cursor-pointer shrink-0"
                  >
                    View Pricing
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                )}
              </div>
            )}

            {/* ===================== ADMIN CONSOLE TAB ===================== */}
            {activeTab === 'admin' && (
              stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer' ? (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      Admin Console
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Enterprise features for workspace administrators.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-border bg-card/50 backdrop-blur-xl text-center max-w-2xl mx-auto space-y-6 shadow-sm my-8 animate-fade-in">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-blue-600/10 text-primary">
                      <Shield className="h-10 w-10 text-muted-foreground" />
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-foreground">Access Restricted</h2>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Only workspace owners and administrators have access to the Admin Console features.
                      </p>
                    </div>
                  </div>
                </div>
              ) : stats.storageLimitMB <= 10240 ? (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      Admin Console
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Enterprise features for workspace administrators.
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-border bg-card/50 backdrop-blur-xl text-center max-w-2xl mx-auto space-y-6 shadow-sm my-8">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-blue-600/10 text-primary">
                      <Shield className="h-10 w-10 text-indigo-500" />
                      <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight text-foreground">Upgrade to Business</h2>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Unlock premium compliance, identity, integration, and security tools built for professional teams and organizations.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left w-full max-w-md mt-4">
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Globe className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-foreground">SAML & OIDC SSO</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Integrate Okta, Azure AD, or Google Workspace.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Activity className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Workspace Audit Logs</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Track sign-ins, creation, updates, and deletes.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Server className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-foreground">Developer API & Keys</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Automate and sync design boards dynamically.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <Crown className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-foreground">White-Label Customization</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Fully mask branding under your organization's style.</p>
                        </div>
                      </div>
                    </div>

                    <a
                      href="/pricing"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:scale-102 transition-all cursor-pointer"
                    >
                      <Zap className="h-4 w-4" />
                      Upgrade to Business
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                      Admin Console
                    </h1>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Manage organization SSO credentials, audit system activities, and generate API access tokens.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Globe className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Single Sign-On (SSO)</h3>
                        <p className="text-[10px] text-muted-foreground">Enforce SAML 2.0 Identity Provider authentication</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">SSO Identity Provider</label>
                        <select
                          value={ssoConfig.provider}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, provider: e.target.value })}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="Okta">Okta</option>
                          <option value="Azure AD">Microsoft Azure AD / Entra ID</option>
                          <option value="Google">Google Workspace</option>
                          <option value="PingIdentity">Ping Identity</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">SAML Entity ID</label>
                        <input
                          type="text"
                          value={ssoConfig.entityId}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, entityId: e.target.value })}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">IDP SSO URL</label>
                        <input
                          type="text"
                          value={ssoConfig.idpUrl}
                          onChange={(e) => setSsoConfig({ ...ssoConfig, idpUrl: e.target.value })}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                      <div>
                        <p className="text-xs font-bold text-foreground">Activate Single Sign-On</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Force all non-admin members to authenticate via SSO IDP.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSsoConfig(prev => ({ ...prev, active: !prev.active }))
                          toast('success', `SSO authentication ${!ssoConfig.active ? 'enabled' : 'disabled'}`)
                        }}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer",
                          ssoConfig.active ? 'bg-primary' : 'bg-muted'
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                          ssoConfig.active ? 'translate-x-5.5' : 'translate-x-0.5'
                        )} />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Server className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Developer API Tokens</h3>
                        <p className="text-[10px] text-muted-foreground">Manage keys for accessing PixelPin programmatically</p>
                      </div>
                    </div>

                    {apiKey ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">API Key</p>
                            <p className="text-xs font-mono text-foreground select-all truncate bg-muted px-2 py-1 rounded">{apiKey}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleCopyKey} variant="secondary" size="sm">
                              {copiedKey ? 'Copied' : 'Copy'}
                            </Button>
                            <Button onClick={() => { setApiKey(''); toast('info', 'API key revoked') }} variant="danger" size="sm">
                              Revoke
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-500 leading-relaxed font-semibold">
                          WARNING: Keep this key secret. Anyone with access can view/delete organization designs and comment boards.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-muted-foreground mb-4">No developer API keys active. Generate one to start integrating.</p>
                        <Button onClick={handleGenerateApiKey} loading={isGeneratingKey} variant="primary" size="md">
                          Generate API Key
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Activity className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Audit Activity Logs</h3>
                          <p className="text-[10px] text-muted-foreground">Track security changes, logins, and workspace events</p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-border/50">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3 text-xs gap-2 hover:bg-muted/10 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground">Actor: {log.user} • IP: {log.ip}</p>
                          </div>
                          <div className="text-[10px] text-muted-foreground sm:text-right shrink-0">
                            {log.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ===================== SETTINGS TAB ===================== */}
            {activeTab === 'settings' && (
              <div className="space-y-8 animate-fade-in">
                <div className="pl-10 md:pl-0">
                  <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                    Settings
                  </h1>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Manage your profile, security, notifications, and workspace configuration.
                  </p>
                </div>

                {/* ---- Subscription / Plan Section ---- */}
                <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl overflow-hidden shadow-sm">
                  <div className="h-16 bg-gradient-to-r from-violet-500/80 via-purple-500/60 to-indigo-500/40 relative">
                    <div className="absolute inset-0 flex items-center px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">Subscription & Billing</h3>
                          <p className="text-[10px] text-white/70">Manage your plan and storage</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'h-14 w-14 rounded-2xl flex items-center justify-center shadow-md',
                          'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                        )}>
                          <span className="text-lg font-black text-foreground uppercase">
                            {stats.storageLimitMB <= 100 ? 'F' : stats.storageLimitMB <= 5120 ? 'S' : stats.storageLimitMB <= 10240 ? 'P' : 'B'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-foreground">
                            {stats.storageLimitMB <= 100 ? 'Free Plan' : stats.storageLimitMB <= 5120 ? 'Starter Plan' : stats.storageLimitMB <= 10240 ? 'Pro Plan' : 'Business Plan'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {stats.storageUsedMB} MB of {stats.storageLimitMB >= 1024 ? `${(stats.storageLimitMB / 1024).toFixed(0)} GB` : `${stats.storageLimitMB} MB`} used
                          </p>
                          <div className="h-1.5 w-40 rounded-full bg-secondary mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                              style={{ width: `${Math.min((stats.storageUsedMB / stats.storageLimitMB) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {stats.userRole !== 'Collaborator' && stats.userRole !== 'Reviewer' && (
                        <div className="flex items-center gap-2">
                          <a
                            href="/pricing"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {stats.storageLimitMB <= 100 ? 'Upgrade Plan' : 'Change Plan'}
                          </a>
                          {stats.storageLimitMB > 100 && (
                            <button
                              onClick={handleManageBilling}
                              disabled={isOpeningBilling}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary border border-border px-4 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-muted/80 transition-all cursor-pointer"
                            >
                              {isOpeningBilling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5" />
                              )}
                              Manage Billing
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mock Development Plan Switcher */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-6 pt-6 border-t border-border/60">
                        {stats.userRole === 'Collaborator' || stats.userRole === 'Reviewer' ? (
                          <div className="rounded-xl bg-muted/20 border border-dashed border-border/80 p-4 flex flex-col sm:flex-row items-center gap-3 justify-center text-center w-full">
                            <Lock className="h-4 w-4 text-muted-foreground animate-pulse" />
                            <p className="text-[11px] text-muted-foreground">
                              Only owners and administrators can modify the subscription plan.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                            <div>
                              <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 animate-pulse" />
                                Development Tool: Mock Plan Switcher
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                                Instantly switch subscription tiers in your database to test layout restrictions, Admin Console features, and drawing tool locks.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <select
                                value={stats.storageLimitMB <= 100 ? 'free' : stats.storageLimitMB <= 5120 ? 'starter' : stats.storageLimitMB <= 10240 ? 'pro' : 'business'}
                                onChange={async (e) => {
                                  const selectedPlan = e.target.value;
                                  try {
                                    const res = await fetch('/api/dev/change-plan', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ plan: selectedPlan }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      setStats(prev => ({
                                        ...prev,
                                        storageLimitMB: data.storageLimitMB
                                      }));
                                      toast('success', `Plan switched to ${selectedPlan.toUpperCase()}! Please refresh or toggle tabs to view changes.`);
                                    }
                                  } catch {
                                    toast('error', 'Failed to change mock plan');
                                  }
                                }}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer w-full sm:w-36"
                              >
                                <option value="free">Free (100MB)</option>
                                <option value="starter">Starter (5GB)</option>
                                <option value="pro">Pro (10GB)</option>
                                <option value="business">Business (30GB)</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* For invited users: Option to leave workspace and start their own plan */}
                    {stats.userRole !== 'Owner' && (
                      <div className="mt-6 pt-6 border-t border-border/60">
                        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5" />
                              Start Your Own Workspace
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                              You are currently a member of this workspace. If you want to purchase your own subscription plan and invite your own team, you can leave this workspace.
                            </p>
                          </div>
                          <button
                            onClick={handleLeaveWorkspace}
                            disabled={isLeavingWorkspace}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-destructive text-white px-4 py-2.5 text-xs font-bold shadow-md hover:bg-destructive/90 transition-all cursor-pointer shrink-0"
                          >
                            {isLeavingWorkspace ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                            Leave Workspace & Start Own
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ---- Profile Section ---- */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  {/* Profile Header Gradient */}
                  <div className="h-28 bg-gradient-to-br from-primary/60 via-accent/40 to-emerald-500/30 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTAgMGgydjM0SDB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                  </div>
                  <div className="px-6 pb-6 -mt-12">
                    <div className="flex items-end gap-5 mb-6">
                      {/* Avatar */}
                      <div className="relative group">
                        <div
                          className="h-24 w-24 rounded-2xl border-4 border-card bg-card shadow-lg flex items-center justify-center overflow-hidden cursor-pointer"
                          onClick={() => userAvatarInputRef.current?.click()}
                          title="Click to change profile picture"
                        >
                          {profileImage ? (
                            <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                              <span className="text-3xl font-black text-white">
                                {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => userAvatarInputRef.current?.click()}
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          ) : (
                            <Camera className="h-5 w-5 text-white" />
                          )}
                        </button>
                        <input
                          ref={userAvatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => handleAvatarUpload(e, 'user')}
                        />
                      </div>
                      <div className="mb-2">
                        <h3 className="text-lg font-black text-foreground">
                          {session?.user?.name || 'Your Name'}
                        </h3>
                        <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="email"
                              value={session?.user?.email || ''}
                              disabled
                              className="w-full rounded-xl border border-border bg-muted/60 pl-9 pr-3.5 py-2.5 text-xs text-muted-foreground cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Bio
                        </label>
                        <textarea
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="Tell us a bit about yourself..."
                          rows={3}
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" variant="primary" size="md" loading={isSavingProfile} className="shadow-lg shadow-primary/20">
                          <CheckCircle2 className="h-4 w-4" />
                          Save Profile
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* ---- Security / Password Section ---- */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Security & Password</h3>
                      <p className="text-[10px] text-muted-foreground">Update your password to keep your account secure</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" variant="secondary" size="md" loading={isChangingPassword}>
                        <Lock className="h-4 w-4" />
                        Update Password
                      </Button>
                    </div>
                  </form>
                </div>

                {/* ---- Notification Preferences ---- */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Notification Preferences</h3>
                      <p className="text-[10px] text-muted-foreground">Choose how and when you want to be notified</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'emailOnComment', label: 'New comments on your designs', desc: 'Get notified when someone leaves feedback on your work', icon: <Mail className="h-4 w-4" /> },
                      { key: 'emailOnInvite', label: 'Team invitations', desc: 'Receive emails when you are invited to a new workspace', icon: <UserPlus className="h-4 w-4" /> },
                      { key: 'emailOnMention', label: 'Mentions & replies', desc: 'Get notified when someone mentions you in a comment', icon: <Bell className="h-4 w-4" /> },
                      { key: 'browserNotifications', label: 'Browser notifications', desc: 'Show desktop notifications for important updates', icon: <BellOff className="h-4 w-4" /> },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4 group hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer",
                            notifSettings[item.key as keyof typeof notifSettings] ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            notifSettings[item.key as keyof typeof notifSettings] ? 'translate-x-5.5' : 'translate-x-0.5'
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---- SMTP Configuration ---- */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-border/80 pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Server className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Email Delivery (SMTP)</h3>
                      <p className="text-[10px] text-muted-foreground">Configure custom SMTP settings for sending invitation and notification emails</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3.5 flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      SMTP is configured and active. Emails will be delivered via Gmail SMTP.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={smtpSettings.host}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        value={smtpSettings.port}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        value={smtpSettings.user}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                        From Address
                      </label>
                      <input
                        type="text"
                        value={smtpSettings.from}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                        className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* ---- Danger Zone ---- */}
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-destructive">Danger Zone</h3>
                      <p className="text-[10px] text-muted-foreground">Irreversible and destructive actions</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-card p-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Delete Account</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
                      Delete Account
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-card p-4">
                    <div>
                      <p className="text-xs font-bold text-foreground">Export Data</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Download a copy of all your projects, images, and comments before deleting.
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleExportData}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Floating Bulk Actions Toolbar */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-4xl -translate-x-1/2 px-4 animate-slide-up">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/90 px-6 py-4 shadow-2xl backdrop-blur-xl md:flex-nowrap">
            {/* Selected Count */}
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground animate-scale-in">
                {selectedProjectIds.length}
              </div>
              <span className="text-xs font-bold text-foreground select-none">
                {selectedProjectIds.length === 1 ? 'project selected' : 'projects selected'}
              </span>
              <button
                onClick={() => setSelectedProjectIds([])}
                className="text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors ml-2 cursor-pointer select-none"
              >
                Clear
              </button>
            </div>

            {/* Bulk Operation Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBulkCopyLinks}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary border border-border cursor-pointer select-none"
                title="Copy public links"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy Links</span>
              </button>

              <button
                onClick={handleBulkDuplicate}
                disabled={isBulkActionPending}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary border border-border disabled:opacity-50 cursor-pointer select-none"
                title="Duplicate selected projects"
              >
                {isBulkActionPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Files className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              <button
                onClick={handleBulkExportMetadata}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary border border-border cursor-pointer select-none"
                title="Export projects metadata"
              >
                <Upload className="h-3.5 w-3.5 rotate-180" />
                <span className="hidden sm:inline">Export JSON</span>
              </button>

              <button
                onClick={handleBulkArchiveToggle}
                disabled={isBulkActionPending}
                className="flex items-center gap-1.5 rounded-xl bg-secondary/80 px-3.5 py-2 text-xs font-bold text-secondary-foreground transition-all hover:bg-secondary border border-border disabled:opacity-50 cursor-pointer select-none"
                title={archiveFilter === 'active' ? 'Archive projects' : 'Restore projects'}
              >
                {isBulkActionPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderKanban className="h-3.5 w-3.5" />
                )}
                <span>{archiveFilter === 'active' ? 'Archive' : 'Restore'}</span>
              </button>

              {/* Bulk Delete with Inline Confirmation */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkDeleteConfirm(!showBulkDeleteConfirm)}
                  disabled={isBulkActionPending}
                  className="flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3.5 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 border border-destructive/20 disabled:opacity-50 cursor-pointer select-none"
                  title="Delete selected projects"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>

                {showBulkDeleteConfirm && (
                  <div className="absolute bottom-full right-0 z-50 mb-3 w-56 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl animate-fade-in">
                    <p className="mb-3 text-xs text-foreground leading-relaxed">
                      Are you sure you want to delete these {selectedProjectIds.length} projects? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBulkDeleteConfirm(false)}
                        className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={isBulkActionPending}
                        className="flex-1 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-white hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isBulkActionPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

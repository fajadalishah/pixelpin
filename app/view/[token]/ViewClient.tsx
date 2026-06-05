'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin,
  ArrowLeft,
  MessageSquare,
  Eye,
  EyeOff,
  CheckCircle,
  Share2,
  Lock,
  User as UserIcon,
  Files,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpRight,
  Square,
  Circle as CircleIcon,
  Pencil,
  Zap,
  Globe,
  FileText,
  Hand,
  Copy,
  Check,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'green', hex: '#22c55e' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'purple', hex: '#a855f7' },
]
import { useToast } from '@/components/ui/Toast'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { AnnotationCanvas } from '@/components/annotation/AnnotationCanvas'
import { CommentSidebar } from '@/components/annotation/CommentSidebar'
import { GuestNamePrompt } from '@/components/annotation/GuestNamePrompt'
import { EditProjectModal } from '@/components/dashboard/EditProjectModal'
import { getImageUrl } from '@/lib/image-url'
import { Modal } from '@/components/ui/Modal'

interface Comment {
  id: string
  content: string
  xPercent: number
  yPercent: number
  guestName: string | null
  userId: string | null
  user: { id: string; name: string } | null
  resolved: boolean
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  createdAt: string
  annotationType?: string
  annotationData?: string | null
}

interface ImageDetails {
  id: string
  title: string
  filename: string
  originalName: string
  width: number
  height: number
  projectId: string
  createdAt: string
  comments: Comment[]
}

interface ProjectDetails {
  id: string
  title: string
  publicToken: string
  userId: string
  createdAt: string
  user: { id: string; name: string }
  images: ImageDetails[]
  allowDownload: boolean
  status: string
  statuses: string[]
}

interface ViewClientProps {
  initialProject: ProjectDetails
  isOwner: boolean
  session: any
  ownerPlan: string
  ownerOrganization: {
    name: string
    logoUrl: string
    brandColor: string
    tagline: string
  } | null
}

export function ViewClient({
  initialProject,
  isOwner,
  session,
  ownerPlan = 'free',
  ownerOrganization = null,
}: ViewClientProps) {
  const [project, setProject] = useState<ProjectDetails>(initialProject)
  const [activeImageId, setActiveImageId] = useState<string>(
    initialProject.images[0]?.id || ''
  )
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [isCommentMode, setIsCommentMode] = useState(true)
  const [guestName, setGuestName] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<'designs' | 'revisions'>('designs')
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [localStatuses, setLocalStatuses] = useState<string[]>([])
  const [localStatus, setLocalStatus] = useState<string>('')
  const [newStatusName, setNewStatusName] = useState('')
  const [isSavingStatuses, setIsSavingStatuses] = useState(false)

  // Sync manage status states
  useEffect(() => {
    if (isStatusModalOpen) {
      setLocalStatuses(project.statuses || ["In Progress", "In Review", "Revision Needed", "Approved"])
      setLocalStatus(project.status || 'In Progress')
      setNewStatusName('')
    }
  }, [isStatusModalOpen, project.statuses, project.status])
  const [activeTool, setActiveTool] = useState<'pin' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand' | 'pan'>('pin')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [showComments, setShowComments] = useState(true)

  // Share settings states
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSavingShareSettings, setIsSavingShareSettings] = useState(false)
  
  // Redrawing existing comment shapes states
  const [redrawingCommentId, setRedrawingCommentId] = useState<string | null>(null)
  const [redrawingTool, setRedrawingTool] = useState<'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand' | 'pin' | null>(null)
  
  const { toast } = useToast()

  // Handle guest name retrieval on client side
  useEffect(() => {
    if (!session?.user) {
      const stored = localStorage.getItem('pixelpin-guest-name')
      if (stored) {
        setGuestName(stored)
      }
    }
  }, [session])

  // Handle auto-focusing image and comment from query parameters (e.g. from notification link)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const imageParam = searchParams.get('image')
      const commentParam = searchParams.get('comment')
      
      if (imageParam && project.images.some((img) => img.id === imageParam)) {
        setActiveImageId(imageParam)
      }
      if (commentParam) {
        setSelectedCommentId(commentParam)
      }
    }
  }, [project.images])

  // Auto-show comments if a comment is selected
  useEffect(() => {
    if (selectedCommentId) {
      setShowComments(true)
    }
  }, [selectedCommentId])

  // Helper: find active image in state
  const activeImage = project.images.find((img) => img.id === activeImageId)
  const comments = activeImage?.comments || []

  const handleProjectUpdated = useCallback((updatedProject: ProjectDetails) => {
    setProject(updatedProject)
    
    // Check if the current active image was deleted or needs fallback
    const activeExists = updatedProject.images.some((img) => img.id === activeImageId)
    if (!activeExists && updatedProject.images.length > 0) {
      setActiveImageId(updatedProject.images[0].id)
    }
  }, [activeImageId])

  const handleAddComment = useCallback(
    async (
      xPercent: number,
      yPercent: number,
      content: string,
      file: File | null,
      annotationType = 'pin',
      annotationData: string | null = null,
      linkUrl?: string,
      linkTitle?: string
    ) => {
      if (!activeImage) return

      const activeName = session?.user?.name || guestName || 'Anonymous'

      try {
        const formData = new FormData()
        formData.append('imageId', activeImage.id)
        formData.append('content', content)
        formData.append('xPercent', xPercent.toString())
        formData.append('yPercent', yPercent.toString())
        formData.append('guestName', session?.user ? '' : activeName)
        formData.append('annotationType', annotationType)
        if (annotationData) {
          formData.append('annotationData', annotationData)
        }
        if (file) {
          formData.append('file', file)
        }
        if (linkUrl) {
          formData.append('linkUrl', linkUrl)
        }
        if (linkTitle) {
          formData.append('linkTitle', linkTitle)
        }

        const res = await fetch('/api/comments', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to save comment')
        }

        const newComment = await res.json()

        // Append comment to the active image in project state
        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? { ...img, comments: [...img.comments, newComment] }
              : img
          ),
        }))

        setSelectedCommentId(newComment.id)
        toast('success', 'Comment pinned successfully!')
      } catch (err: any) {
        console.error(err)
        toast('error', err.message || 'Could not post comment. Please try again.')
      }
    },
    [activeImage, activeImageId, guestName, session, toast]
  )

  const handleEditComment = useCallback(
    async (id: string, newContent: string, file: File | null = null, removeFile = false, linkUrl?: string, linkTitle?: string) => {
      try {
        const formData = new FormData()
        formData.append('content', newContent)
        if (file) {
          formData.append('file', file)
        }
        if (removeFile) {
          formData.append('removeFile', 'true')
        }
        if (linkUrl !== undefined) {
          formData.append('linkUrl', linkUrl || '')
        }
        if (linkTitle !== undefined) {
          formData.append('linkTitle', linkTitle || '')
        }

        const res = await fetch(`/api/comments/${id}?guestName=${guestName || ''}`, {
          method: 'PATCH',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to edit comment')
        }

        const updated = await res.json()

        // Update comment in project state
        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  comments: img.comments.map((c) =>
                    c.id === id
                      ? {
                          ...c,
                          content: updated.content,
                          fileUrl: updated.fileUrl,
                          fileName: updated.fileName,
                          fileType: updated.fileType,
                        }
                      : c
                  ),
                }
              : img
          ),
        }))

        toast('success', 'Comment updated!')
      } catch (err: any) {
        console.error(err)
        toast('error', err.message || 'Failed to save edits.')
      }
    },
    [activeImageId, guestName, toast]
  )

  const handleResolveComment = useCallback(
    async (id: string) => {
      const commentToUpdate = project.images
        .flatMap((img) => img.comments)
        .find((c) => c.id === id)
      const nextResolved = !(commentToUpdate?.resolved ?? false)

      try {
        const res = await fetch(`/api/comments/${id}?guestName=${guestName || ''}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resolved: nextResolved,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to resolve comment')
        }

        const updated = await res.json()

        // Update resolved status in project state
        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  comments: img.comments.map((c) =>
                    c.id === id ? { ...c, resolved: updated.resolved } : c
                  ),
                }
              : img
          ),
        }))

        toast(
          'success',
          updated.resolved ? 'Comment resolved!' : 'Comment reopened!'
        )
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to update comment status.')
      }
    },
    [project.images, activeImageId, guestName, toast]
  )

  const handleDeleteComment = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/comments/${id}?guestName=${guestName || ''}`, {
          method: 'DELETE',
        })

        if (!res.ok) {
          throw new Error('Failed to delete comment')
        }

        // Remove comment from project state
        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  comments: img.comments.filter((c) => c.id !== id),
                }
              : img
          ),
        }))

        if (selectedCommentId === id) {
          setSelectedCommentId(null)
        }

        toast('success', 'Comment deleted!')
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to delete comment.')
      }
    },
    [activeImageId, guestName, selectedCommentId, toast]
  )

  // Actions context dropdown handlers for comments shape reselection
  const handleShapeSelect = useCallback(
    (commentId: string, shapeType: any) => {
      setRedrawingCommentId(commentId)
      setRedrawingTool(shapeType)
      setIsCommentMode(true) // force comment mode to draw
      toast('info', `Draw a new ${shapeType} annotation on the image to update.`)
    },
    [toast]
  )

  const handleRedrawComplete = useCallback(
    async (commentId: string, type: string, data: string) => {
      try {
        const res = await fetch(`/api/comments/${commentId}?guestName=${guestName || ''}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            annotationType: type,
            annotationData: data,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to update shape')
        }

        const updated = await res.json()

        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  comments: img.comments.map((c) =>
                    c.id === commentId
                      ? {
                          ...c,
                          annotationType: updated.annotationType,
                          annotationData: updated.annotationData,
                        }
                      : c
                  ),
                }
              : img
          ),
        }))

        toast('success', 'Annotation shape updated!')
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to update annotation shape.')
      } finally {
        setRedrawingCommentId(null)
        setRedrawingTool(null)
      }
    },
    [activeImageId, guestName, toast]
  )

  const handleCommentColorChange = useCallback(
    async (commentId: string, colorHex: string) => {
      const comment = comments.find((c) => c.id === commentId)
      if (!comment) return

      let parsedData = {}
      try {
        if (comment.annotationData) {
          parsedData = JSON.parse(comment.annotationData)
        }
      } catch {}

      const updatedData = JSON.stringify({
        ...parsedData,
        color: colorHex,
      })

      try {
        const res = await fetch(`/api/comments/${commentId}?guestName=${guestName || ''}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            annotationData: updatedData,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to update color')
        }

        const updated = await res.json()

        setProject((prev) => ({
          ...prev,
          images: prev.images.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  comments: img.comments.map((c) =>
                    c.id === commentId ? { ...c, annotationData: updated.annotationData } : c
                  ),
                }
              : img
          ),
        }))

        toast('success', 'Annotation color updated!')
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to update color.')
      }
    },
    [comments, activeImageId, guestName, toast]
  )

  const handleGuestSubmit = (name: string) => {
    setGuestName(name)
    toast('success', `Commenting as "${name}"`)
  }

  const handleShare = () => {
    setIsShareOpen(true)
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href.split('?')[0]
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast('success', 'Project share link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleToggleDownload = async (newValue: boolean) => {
    setIsSavingShareSettings(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowDownload: newValue,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update download settings')
      }

      const updatedProject = await res.json()
      setProject(updatedProject)
      toast('success', newValue ? 'Downloads allowed for guests' : 'Downloads disallowed for guests')
    } catch (err) {
      console.error(err)
      toast('error', 'Failed to update download settings.')
    } finally {
      setIsSavingShareSettings(false)
    }
  }

  const handleImageSwitch = (imgId: string) => {
    setActiveImageId(imgId)
    setSelectedCommentId(null)
  }

  const brandAccentStyle = (ownerPlan === 'business' && ownerOrganization?.brandColor)
    ? { '--primary': ownerOrganization.brandColor } as React.CSSProperties
    : undefined

  return (
    <div
      className="flex h-screen overflow-hidden flex-col bg-background text-foreground animate-fade-in"
      style={brandAccentStyle}
    >
      {/* View Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={session ? '/dashboard' : '/'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Organization Branding Identity */}
            {ownerOrganization && (ownerPlan === 'business' || ownerPlan === 'pro' || ownerPlan === 'starter') && (
              <div className="flex items-center gap-2 border-r border-border pr-3 h-8 mr-1 shrink-0">
                {ownerOrganization.logoUrl ? (
                  <img src={ownerOrganization.logoUrl} alt="Logo" className="h-6 w-6 rounded object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                    {ownerOrganization.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col select-none leading-none">
                  <span className="text-[11px] font-bold text-foreground truncate max-w-[80px]" title={ownerOrganization.name}>
                    {ownerOrganization.name}
                  </span>
                  {ownerPlan !== 'business' && (
                    <span className="text-[8px] text-muted-foreground mt-0.5">via PixelPin</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div>
                <h1 className="max-w-[160px] truncate text-sm font-semibold sm:max-w-[260px]" title={project.title}>
                  {project.title}
                </h1>
                <p className="hidden text-tiny-10 text-muted-foreground sm:block">
                  Project shared by {project.user?.name}
                </p>
              </div>

              {/* Status Select Badge */}
              {project.status && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative select-none">
                    <select
                      value={project.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value
                        try {
                          const res = await fetch(`/api/view/${project.publicToken}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: newStatus }),
                          })
                          if (!res.ok) {
                            throw new Error('Failed to update status')
                          }
                          const updatedProject = await res.json()
                          setProject(updatedProject)
                          toast('success', `Project status updated to "${newStatus}"`)
                        } catch (err) {
                          console.error(err)
                          toast('error', 'Failed to update project status')
                        }
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20",
                        project.status === "Approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20",
                        project.status === "Revision Needed" && "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20",
                        project.status === "In Review" && "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20",
                        project.status === "In Progress" && "bg-slate-500/10 border-slate-500/20 text-slate-400 dark:text-slate-300 hover:bg-slate-500/20",
                        !["Approved", "Revision Needed", "In Review", "In Progress"].includes(project.status) && "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                      )}
                      title="Change project status"
                    >
                      {(project.statuses || ["In Progress", "In Review", "Revision Needed", "Approved"]).map((st) => (
                        <option key={st} value={st} className="bg-background text-foreground font-semibold">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Settings Pencil Trigger */}
                  <button
                    onClick={() => setIsStatusModalOpen(true)}
                    className="p-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                    title="Manage Status Choices"
                  >
                    <Pencil className="h-3 w-3 text-primary" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Controls: Add Comment & Show/Hide Comments */}
          <div className="flex items-center gap-2">
            {/* Add a Comment Mode Switcher */}
            <div className="relative flex flex-col items-center">
            <button
              onClick={() => {
                setIsCommentMode(!isCommentMode)
                setRedrawingCommentId(null)
                setRedrawingTool(null)
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold border transition-all hover:scale-105 active:scale-95 shadow-sm",
                isCommentMode
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/25 animate-pulse"
                  : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {activeTool === 'pin' && <MapPin className="h-4 w-4 text-rose-500" />}
              {activeTool === 'arrow' && <ArrowUpRight className="h-4 w-4" />}
              {activeTool === 'rectangle' && <Square className="h-4 w-4" />}
              {activeTool === 'circle' && <CircleIcon className="h-4 w-4" />}
              {activeTool === 'freehand' && <Pencil className="h-4 w-4" />}
              {activeTool === 'pan' && <Hand className="h-4 w-4 text-indigo-500" />}
              <span>Add a Comment</span>
            </button>

            {/* Annotation Dropdown Panel from the Button */}
            {isCommentMode && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 z-55 flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-auto">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('pin')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      activeTool === 'pin'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Dot Pin"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('arrow')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all relative",
                      activeTool === 'arrow'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Arrow Pointer"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('rectangle')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all relative",
                      activeTool === 'rectangle'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Rectangle Outline"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('circle')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all relative",
                      activeTool === 'circle'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Circle Outline"
                  >
                    <CircleIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('freehand')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all relative",
                      activeTool === 'freehand'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Pencil Draw"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTool('pan')
                    }}
                    className={cn(
                      "p-1.5 rounded-lg transition-all relative",
                      activeTool === 'pan'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    title="Hand Move"
                  >
                    <Hand className="h-4 w-4" />
                  </button>
                </div>

                <div className="h-5 w-px bg-border" />

                {/* Color swatches */}
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveColor(c.hex)
                      }}
                      className={cn(
                        "h-4.5 w-4.5 rounded-full border transition-all",
                        activeColor === c.hex
                          ? 'ring-2 ring-primary ring-offset-2 scale-110 border-transparent'
                          : 'border-border hover:scale-105'
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={`Color ${c.id}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Show/Hide Comments Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold border transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer",
              showComments
                ? "bg-card border-border text-foreground hover:bg-accent hover:text-foreground"
                : "bg-muted border-border/80 text-muted-foreground hover:text-foreground"
            )}
            title={showComments ? "Hide Comment Pins" : "Show Comment Pins"}
          >
            {showComments ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            <span>{showComments ? "Hide Pins" : "Show Pins"}</span>
          </button>
        </div>

          <div className="flex items-center gap-2">
            {activeImage && (() => {
              const lowerFilename = activeImage.filename.toLowerCase().split('?')[0]
              const isPDF = lowerFilename.endsWith('.pdf')
              const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(lowerFilename) || activeImage.filename.includes('blob.vercel-storage.com')
              const isLink = (activeImage.filename.startsWith('http://') || activeImage.filename.startsWith('https://')) && !isImage && !isPDF

              const canDownload = project.allowDownload || isOwner

              if (isLink) {
                return (
                  <a
                    href={activeImage.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm animate-fade-in"
                    title="Open Link"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Open Link</span>
                  </a>
                )
              }

              if (!canDownload) {
                return null
              }

              return (
                <a
                  href={getImageUrl(activeImage.filename)}
                  download={activeImage.originalName}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm animate-fade-in"
                  title="Download Active Design"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              )
            })()}
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5 flex"
              >
                <Settings className="h-3.5 w-3.5 text-primary" />
                Edit Project
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="hidden gap-1.5 sm:flex"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Project
            </Button>
            <ThemeToggle />
            {!session?.user && (
              <Link href="/sign-in" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Annotation Workspace */}
      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row relative">
        {/* Collapsible Left Designs Sidebar */}
        <div
          className={cn(
            "relative flex flex-col h-full border-r-4 border-border bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0",
            isSidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
          )}
        >
          {/* Tab Switcher: Designs vs Revisions */}
          <div className="flex border-b border-border text-xs font-bold shrink-0 bg-muted/20 select-none">
            <button
              onClick={() => setSidebarTab('designs')}
              className={cn(
                "flex-1 py-3 text-center border-b-2 transition-all cursor-pointer",
                sidebarTab === 'designs'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Designs ({project.images.length})
            </button>
            <button
              onClick={() => setSidebarTab('revisions')}
              className={cn(
                "flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                sidebarTab === 'revisions'
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Revisions
            </button>
          </div>

          {/* Sidebar Tab Contents */}
          {sidebarTab === 'designs' ? (
            /* Grid list of designs */
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {project.images.map((img) => {
                const isActive = img.id === activeImageId
                return (
                  <div
                    key={img.id}
                    onClick={() => handleImageSwitch(img.id)}
                    className={cn(
                      "group relative cursor-pointer rounded-xl border overflow-hidden bg-muted/20 transition-all p-1.5",
                      isActive
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "border-border/60 hover:border-primary/50 hover:bg-accent/40"
                    )}
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/80 bg-muted flex items-center justify-center">
                      {(() => {
                        const lowerFilename = img.filename.toLowerCase().split('?')[0]
                        const isPDF = lowerFilename.endsWith('.pdf')
                        const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(lowerFilename) || img.filename.includes('blob.vercel-storage.com')
                        const isLink = (img.filename.startsWith('http://') || img.filename.startsWith('https://')) && !isImage && !isPDF

                        if (isLink) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full w-full bg-primary/10 text-primary p-2">
                              <Globe className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black mt-1 uppercase select-none">Link</span>
                            </div>
                          )
                        }

                        if (isPDF) {
                          return (
                            <div className="flex flex-col items-center justify-center h-full w-full bg-rose-500/10 text-rose-500 p-2">
                              <FileText className="h-6 w-6 text-rose-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] bg-rose-500/20 text-rose-600 px-1.5 py-0.5 rounded font-black mt-1 uppercase select-none">PDF</span>
                            </div>
                          )
                        }

                        return (
                          <img
                            src={getImageUrl(img.filename)}
                            alt={img.title}
                            className="h-full w-full object-contain bg-background/50 group-hover:scale-105 transition-transform duration-300"
                          />
                        )
                      })()}
                      {img.comments.length > 0 && (
                        <div className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-tiny-10 font-bold text-white shadow-md">
                          {img.comments.length}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 px-1">
                      <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors" title={img.title}>
                        {img.originalName}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Revisions / Version History timeline */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in select-none">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-2 shrink-0">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Revision History</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">Active</span>
              </div>
              <div className="relative pl-4 border-l border-border/80 ml-2 space-y-6">
                {/* Mock Revisions Timeline based on uploaded designs */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <span className="text-[10px] font-bold text-primary">v1.1 - Current Version</span>
                  <p className="text-[11px] text-foreground mt-1">Design upload iteration completed.</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Uploaded {new Date(project.createdAt).toLocaleDateString()} · by {project.user?.name}</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/55 ring-4 ring-background" />
                  <span className="text-[10px] font-bold text-muted-foreground">v1.0 - Initial Upload</span>
                  <p className="text-[11px] text-foreground mt-1">Project created with {project.images.length} images.</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Created {new Date(project.createdAt).toLocaleDateString()} · by {project.user?.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Circular Slide Toggle Button placed right on the border/dragging line */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:bg-accent text-foreground hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            left: isSidebarOpen ? 'calc(16rem - 14px)' : '4px',
            transitionProperty: 'left, transform',
            transitionDuration: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          title={isSidebarOpen ? "Collapse Designs" : "Expand Designs"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-primary" />
          )}
        </button>

        {/* Workspace Canvas Area */}
        <div className="flex-1 bg-muted/5 relative overflow-hidden h-full flex items-center justify-center">
          <div className="w-full h-full relative">
            {activeImage ? (
              <AnnotationCanvas
                imageUrl={
                  activeImage.filename.startsWith('http://') || activeImage.filename.startsWith('https://')
                    ? activeImage.filename
                    : getImageUrl(activeImage.filename)
                }
                boardTitle={activeImage.originalName}
                comments={showComments ? comments : []}
                onAddComment={handleAddComment}
                isCommentMode={isCommentMode}
                selectedCommentId={selectedCommentId}
                onSelectComment={setSelectedCommentId}
                onResolve={handleResolveComment}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                isOwner={isOwner}
                currentUserId={session?.user?.id}
                currentGuestName={guestName}
                redrawingCommentId={redrawingCommentId}
                redrawingTool={redrawingTool}
                onRedrawComplete={handleRedrawComplete}
                onShapeSelect={handleShapeSelect}
                onColorSelect={handleCommentColorChange}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                activeColor={activeColor}
                setActiveColor={setActiveColor}
                ownerPlan={ownerPlan}
              />
            ) : (
              <div className="text-center text-muted-foreground py-10">
                Please upload design images to this project.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Comments Panel */}
        <aside className="w-full shrink-0 border-t border-border bg-card/50 lg:border-l lg:border-t-0 lg:w-96">
          <div className="h-[40vh] p-4 lg:h-[calc(100vh-4rem)] lg:p-4">
            <CommentSidebar
              comments={comments}
              selectedCommentId={selectedCommentId}
              onSelectComment={setSelectedCommentId}
              onResolve={handleResolveComment}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              isOwner={isOwner}
              currentUserId={session?.user?.id}
              currentGuestName={guestName}
            />
          </div>
        </aside>
      </main>

      {/* Guest Name Modal */}
      {!session?.user && !guestName && (
        <GuestNamePrompt onSubmit={handleGuestSubmit} />
      )}

      {/* Edit Project Modal */}
      {isOwner && (
        <EditProjectModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          project={project}
          onProjectUpdated={handleProjectUpdated}
        />
      )}

      {/* Share Project Modal */}
      <Modal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Share Project"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Anyone with this link can view this project and leave comments.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={typeof window !== 'undefined' ? window.location.href.split('?')[0] : ''}
              className="flex-1 bg-muted/50 border border-border/80 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none select-all truncate"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1 px-3.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {isOwner && (
            <div className="border-t border-border/50 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">
                    Allow Image Downloads
                  </h4>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Let guest viewers download the original design files.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={project.allowDownload ?? true}
                    onChange={(e) => handleToggleDownload(e.target.checked)}
                    disabled={isSavingShareSettings}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end border-t border-border/50 pt-4">
            <Button variant="primary" size="md" onClick={() => setIsShareOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Statuses Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Manage Status Choices"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Customize the list of status choices for this project.
          </p>

          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground">
              Current Choices
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {localStatuses.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={st}
                    onChange={(e) => {
                      const updated = [...localStatuses]
                      const oldName = updated[idx]
                      updated[idx] = e.target.value
                      setLocalStatuses(updated)
                      if (localStatus === oldName) {
                        setLocalStatus(e.target.value)
                      }
                    }}
                    className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (localStatuses.length <= 1) {
                        toast('error', 'Project must have at least one status.')
                        return
                      }
                      const updated = localStatuses.filter((_, i) => i !== idx)
                      setLocalStatuses(updated)
                      if (localStatus === st) {
                        setLocalStatus(updated[0])
                      }
                    }}
                    disabled={localStatuses.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Add New Option
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New status name..."
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const trimmed = newStatusName.trim()
                    if (!trimmed) return
                    if (localStatuses.includes(trimmed)) {
                      toast('error', 'Status already exists.')
                      return
                    }
                    setLocalStatuses([...localStatuses, trimmed])
                    setNewStatusName('')
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const trimmed = newStatusName.trim()
                  if (!trimmed) return
                  if (localStatuses.includes(trimmed)) {
                    toast('error', 'Status already exists.')
                    return
                  }
                  setLocalStatuses([...localStatuses, trimmed])
                  setNewStatusName('')
                }}
                className="h-7 text-xs"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSavingStatuses}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSavingStatuses}
              onClick={async () => {
                const cleanStatuses = localStatuses.map(s => s.trim()).filter(Boolean)
                if (cleanStatuses.length === 0) {
                  toast('error', 'At least one status option is required.')
                  return
                }
                
                setIsSavingStatuses(true)
                try {
                  const res = await fetch(`/api/view/${project.publicToken}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      status: localStatus.trim(),
                      statuses: cleanStatuses,
                    }),
                  })
                  if (!res.ok) {
                    throw new Error('Failed to update status settings')
                  }
                  const updatedProject = await res.json()
                  setProject(updatedProject)
                  toast('success', 'Project status configurations updated!')
                  setIsStatusModalOpen(false)
                } catch (err) {
                  console.error(err)
                  toast('error', 'Failed to update status settings.')
                } finally {
                  setIsSavingStatuses(false)
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

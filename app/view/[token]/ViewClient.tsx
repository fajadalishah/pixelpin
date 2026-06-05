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
  Plus,
  Zap,
  Globe,
  FileText,
  Hand,
  Copy,
  Check,
  Trash2,
} from 'lucide-react'
import { cn, forceDownload, getAttachmentUrl } from '@/lib/utils'

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
  versions?: ImageDetails[]
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
  const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(true)

  // Collapse designs sidebar on mobile viewports initially
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev
      if (next && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsCommentsSidebarOpen(false)
      }
      return next
    })
  }, [])

  const toggleCommentsSidebar = useCallback(() => {
    setIsCommentsSidebarOpen((prev) => {
      const next = !prev
      if (next && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false)
      }
      return next
    })
  }, [])
  const [sidebarTab, setSidebarTab] = useState<'designs' | 'revisions'>('designs')
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [localStatuses, setLocalStatuses] = useState<string[]>([])
  const [localStatus, setLocalStatus] = useState<string>('')
  const [newStatusName, setNewStatusName] = useState('')
  const [isSavingStatuses, setIsSavingStatuses] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string
    name: string
    type: string
  } | null>(null)

  const handleViewAttachment = useCallback((url: string, fileName: string, fileType: string) => {
    setPreviewAttachment({ url, name: fileName, type: fileType })
  }, [])

  const [viewingImageId, setViewingImageId] = useState<string | null>(null)

  // Reset viewingImageId when switching images/designs
  useEffect(() => {
    setViewingImageId(null)
  }, [activeImageId])

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
  
  const currentDisplayedImage = (() => {
    if (!activeImage) return null
    if (viewingImageId) {
      if (activeImage.id === viewingImageId) return activeImage
      return activeImage.versions?.find((v) => v.id === viewingImageId) || activeImage
    }
    return activeImage
  })()

  const comments = currentDisplayedImage?.comments || []

  // Shared helper to update comments inside project state (both main and versions)
  const updateProjectCommentsState = useCallback((commentId: string, updateFn: (comment: Comment) => Comment | null) => {
    setProject((prev) => ({
      ...prev,
      images: prev.images.map((img) => {
        if (img.id === activeImageId) {
          const hasComment = img.comments.some((c) => c.id === commentId)
          if (hasComment) {
            return {
              ...img,
              comments: img.comments.map((c) => c.id === commentId ? updateFn(c) : c).filter(Boolean) as Comment[],
            }
          }
          const updatedVersions = img.versions?.map((v) => {
            const hasCommentInVersion = v.comments.some((c) => c.id === commentId)
            if (hasCommentInVersion) {
              return {
                ...v,
                comments: v.comments.map((c) => c.id === commentId ? updateFn(c) : c).filter(Boolean) as Comment[],
              }
            }
            return v
          })
          return {
            ...img,
            versions: updatedVersions,
          }
        }
        return img
      })
    }))
  }, [activeImageId])

  // Handle uploading revised version of the active image
  const handleUploadRevision = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeImage) return

    const formData = new FormData()
    formData.append('files', file)
    formData.append('versionOfId', activeImage.id)
    formData.append('projectId', project.id)

    toast('info', 'Uploading revised version...')
    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to upload revised version')
      }

      const updatedProj = await res.json()
      setProject(updatedProj)

      // Find the new active image ID (the one that contains the old activeImageId in its versions list)
      const oldImageId = activeImage.id
      const newActiveImage = updatedProj.images.find((img: any) =>
        img.id === oldImageId || img.versions?.some((v: any) => v.id === oldImageId)
      )

      if (newActiveImage) {
        setActiveImageId(newActiveImage.id)
        setViewingImageId(null) // display the latest active version
      }

      toast('success', 'Revised version uploaded successfully!')
    } catch (err: any) {
      console.error(err)
      toast('error', err.message || 'Upload failed.')
    } finally {
      if (e.target) e.target.value = ''
    }
  }, [activeImage, project.id, toast])

  // Handle deleting previous version (revision)
  const handleDeleteRevision = useCallback(async (revisionId: string) => {
    if (!confirm('Are you sure you want to delete this revision? This will permanently delete this version and all comments pinned to it.')) {
      return
    }

    try {
      const res = await fetch(`/api/images/${revisionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete revision')
      }

      if (viewingImageId === revisionId) {
        setViewingImageId(null)
      }

      setProject((prev) => ({
        ...prev,
        images: prev.images.map((img) =>
          img.id === activeImageId
            ? {
                ...img,
                versions: img.versions?.filter((v) => v.id !== revisionId) || [],
              }
            : img
        ),
      }))

      toast('success', 'Revision deleted successfully.')
    } catch (err) {
      console.error(err)
      toast('error', 'Failed to delete revision.')
    }
  }, [activeImageId, viewingImageId, toast])

  // Handle deleting all previous versions (revisions) at once
  const handleDeleteAllRevisions = useCallback(async () => {
    if (!activeImage) return
    if (
      !confirm(
        'Are you sure you want to delete all previous versions? This will permanently delete all historical revisions and all comments pinned to them.'
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/images/${activeImage.id}?versionsOnly=true`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete all revisions')
      }

      if (viewingImageId && viewingImageId !== activeImage.id) {
        setViewingImageId(null)
      }

      setProject((prev) => ({
        ...prev,
        images: prev.images.map((img) =>
          img.id === activeImageId
            ? {
                ...img,
                versions: [],
              }
            : img
        ),
      }))

      toast('success', 'All previous versions deleted successfully.')
    } catch (err) {
      console.error(err)
      toast('error', 'Failed to delete previous versions.')
    }
  }, [activeImage, activeImageId, viewingImageId, toast])

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

        updateProjectCommentsState(id, (c) => ({
          ...c,
          content: updated.content,
          fileUrl: updated.fileUrl,
          fileName: updated.fileName,
          fileType: updated.fileType,
        }))

        toast('success', 'Comment updated!')
      } catch (err: any) {
        console.error(err)
        toast('error', err.message || 'Failed to save edits.')
      }
    },
    [guestName, updateProjectCommentsState, toast]
  )

  const handleResolveComment = useCallback(
    async (id: string) => {
      // Find comment in main comments or version comments
      const allComments = [
        ...project.images.flatMap((img) => img.comments),
        ...project.images.flatMap((img) => img.versions || []).flatMap((v) => v.comments),
      ]
      const commentToUpdate = allComments.find((c) => c.id === id)
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

        updateProjectCommentsState(id, (c) => ({
          ...c,
          resolved: updated.resolved,
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
    [project.images, guestName, updateProjectCommentsState, toast]
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

        updateProjectCommentsState(id, () => null)

        if (selectedCommentId === id) {
          setSelectedCommentId(null)
        }

        toast('success', 'Comment deleted!')
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to delete comment.')
      }
    },
    [guestName, selectedCommentId, updateProjectCommentsState, toast]
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

        updateProjectCommentsState(commentId, (c) => ({
          ...c,
          annotationType: updated.annotationType,
          annotationData: updated.annotationData,
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
    [guestName, updateProjectCommentsState, toast]
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

        updateProjectCommentsState(commentId, (c) => ({
          ...c,
          annotationData: updated.annotationData,
        }))

        toast('success', 'Annotation color updated!')
      } catch (err) {
        console.error(err)
        toast('error', 'Failed to update color.')
      }
    },
    [comments, guestName, updateProjectCommentsState, toast]
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
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl flex flex-col justify-center">
        {/* Top Row (Desktop Header / Mobile Main Header) */}
        <div className="mx-auto flex h-14 lg:h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Left: Back Arrow, Brand, Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={session ? '/dashboard' : '/'}
              className="flex h-8 w-8 lg:h-9 lg:w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Organization Branding Identity */}
            {ownerOrganization && (ownerPlan === 'business' || ownerPlan === 'pro' || ownerPlan === 'starter') && (
              <div className="flex items-center gap-1.5 sm:gap-2 border-r border-border pr-2 sm:pr-3 h-8 mr-0.5 sm:mr-1 shrink-0">
                {ownerOrganization.logoUrl ? (
                  <img src={ownerOrganization.logoUrl} alt="Logo" className="h-5 w-5 sm:h-6 sm:w-6 rounded object-cover" />
                ) : (
                  <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                    {ownerOrganization.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden xs:flex flex-col select-none leading-none">
                  <span className="text-[10px] sm:text-[11px] font-bold text-foreground truncate max-w-[70px] sm:max-w-[80px]" title={ownerOrganization.name}>
                    {ownerOrganization.name}
                  </span>
                  {ownerPlan !== 'business' && (
                    <span className="text-[8px] text-muted-foreground mt-0.5">via PixelPin</span>
                  )}
                </div>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="max-w-[120px] xs:max-w-[160px] sm:max-w-[260px] truncate text-xs sm:text-sm font-semibold" title={project.title}>
                {project.title}
              </h1>
              <p className="hidden text-[9px] text-muted-foreground sm:block leading-none mt-0.5">
                Shared by {project.user?.name}
              </p>
            </div>
            
            {/* Desktop Status Select */}
            {project.status && (
              <div className="hidden lg:flex items-center gap-1.5 shrink-0 ml-2">
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

          {/* Desktop Toolbar (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Add Comment, Show/Hide comments, Mobile sidebars */}
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

              {/* Desktop Annotation Dropdown Panel */}
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

          {/* Right side controls (Desktop + Mobile essentials) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
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
                    className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm"
                    title="Open Link"
                  >
                    <ArrowUpRight className="h-4 w-4 text-primary" />
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
                  className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm"
                  title="Download Active Design"
                >
                  <Download className="h-4 w-4 text-primary" />
                </a>
              )
            })()}
            {isOwner && (
              <>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm"
                  title="Edit Project"
                >
                  <Settings className="h-4 w-4 text-primary" />
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 shadow-sm"
                  title="Share Project"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </>
            )}
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

        {/* Bottom Row (Mobile Only Toolbar) */}
        <div className="flex lg:hidden h-10 border-t border-border/40 bg-muted/5 items-center justify-between px-3 w-full">
          {/* Mobile Sidebar toggles (Designs and Comments) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSidebar}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm cursor-pointer",
                isSidebarOpen
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                  : "bg-card border-border text-muted-foreground hover:bg-accent"
              )}
              title="Toggle Designs"
            >
              <Files className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleCommentsSidebar}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm cursor-pointer",
                isCommentsSidebarOpen
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                  : "bg-card border-border text-muted-foreground hover:bg-accent"
              )}
              title="Toggle Comments"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mobile Annotation Controls (Add Comment & Show Pins) */}
          <div className="flex items-center gap-1.5 relative">
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => {
                  setIsCommentMode(!isCommentMode)
                  setRedrawingCommentId(null)
                  setRedrawingTool(null)
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm cursor-pointer",
                  isCommentMode
                    ? "bg-primary text-primary-foreground border-primary shadow-primary/25 animate-pulse"
                    : "bg-card border-border text-muted-foreground hover:bg-accent"
                )}
                title="Add Comment"
              >
                {activeTool === 'pin' && <MapPin className="h-3.5 w-3.5 text-rose-500" />}
                {activeTool === 'arrow' && <ArrowUpRight className="h-3.5 w-3.5" />}
                {activeTool === 'rectangle' && <Square className="h-3.5 w-3.5" />}
                {activeTool === 'circle' && <CircleIcon className="h-3.5 w-3.5" />}
                {activeTool === 'freehand' && <Pencil className="h-3.5 w-3.5" />}
                {activeTool === 'pan' && <Hand className="h-3.5 w-3.5 text-indigo-500" />}
              </button>

              {/* Mobile Annotation Dropdown Panel (Horizontal and centered below header) */}
              {isCommentMode && (
                <div className="fixed top-[92px] left-1/2 -translate-x-1/2 z-55 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl animate-fade-in max-w-[95vw] overflow-x-auto">
                  <div className="flex items-center gap-0.5">
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
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTool('arrow')
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeTool === 'arrow'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTool('rectangle')
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeTool === 'rectangle'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTool('circle')
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeTool === 'circle'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <CircleIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTool('freehand')
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeTool === 'freehand'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTool('pan')
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        activeTool === 'pan'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Hand className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="h-4.5 w-px bg-border" />

                  <div className="flex items-center gap-1.5">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveColor(c.hex)
                        }}
                        className={cn(
                          "h-4 w-4 rounded-full border transition-all",
                          activeColor === c.hex
                            ? 'ring-1.5 ring-primary ring-offset-1 scale-110 border-transparent'
                            : 'border-border hover:scale-105'
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-95 shadow-sm cursor-pointer",
                showComments
                  ? "bg-card border-border text-foreground hover:bg-accent"
                  : "bg-muted border-border/80 text-muted-foreground hover:text-foreground"
              )}
              title={showComments ? "Hide Pins" : "Show Pins"}
            >
              {showComments ? (
                <Eye className="h-3.5 w-3.5 text-primary" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Mobile Status Select */}
          {project.status && (
            <div className="flex items-center gap-1 shrink-0 select-none">
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
                  "rounded-full px-2 py-0.5 text-[10px] font-bold border transition-all cursor-pointer outline-none",
                  project.status === "Approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                  project.status === "Revision Needed" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                  project.status === "In Review" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                  project.status === "In Progress" && "bg-slate-500/10 border-slate-500/20 text-slate-400 dark:text-slate-300",
                  !["Approved", "Revision Needed", "In Review", "In Progress"].includes(project.status) && "bg-primary/10 border-primary/20 text-primary"
                )}
              >
                {(project.statuses || ["In Progress", "In Review", "Revision Needed", "Approved"]).map((st) => (
                  <option key={st} value={st} className="bg-background text-foreground font-semibold">
                    {st}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="p-1 rounded-full border border-border bg-card text-muted-foreground hover:bg-accent transition-all cursor-pointer"
              >
                <Pencil className="h-2.5 w-2.5 text-primary" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Annotation Workspace */}
      <main className="flex flex-1 flex-col overflow-hidden lg:flex-row relative">
        {/* Collapsible Left Designs Sidebar */}
        <div
          className={cn(
            "relative flex flex-col bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0",
            isSidebarOpen
              ? "w-full h-[180px] border-b-4 border-border lg:w-64 lg:h-full lg:border-r-4 lg:border-b-0"
              : "w-full h-0 overflow-hidden border-b-0 lg:w-0 lg:h-full lg:border-r-0"
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
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 flex flex-row gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:flex-col lg:p-4 lg:space-y-3 lg:space-x-0">
              {project.images.map((img) => {
                const isActive = img.id === activeImageId
                return (
                  <div
                    key={img.id}
                    onClick={() => handleImageSwitch(img.id)}
                    className={cn(
                      "group relative cursor-pointer rounded-xl border overflow-hidden bg-muted/20 transition-all p-1.5 shrink-0 w-[140px] lg:w-full",
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2 shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Revision History</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">Active</span>
                </div>
                {isOwner && activeImage && (activeImage.versions?.length ?? 0) > 0 && (
                  <button
                    onClick={handleDeleteAllRevisions}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Delete all previous versions"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {isOwner && activeImage && (
                <div className="mb-4 select-none">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf"
                    onChange={handleUploadRevision}
                    className="hidden"
                    id="revision-file-upload"
                  />
                  <label
                    htmlFor="revision-file-upload"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-muted/10 hover:bg-muted/20 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Upload Revised Version
                  </label>
                </div>
              )}

              {(() => {
                const activeImageVersions = activeImage?.versions || []
                const allHistory = activeImage ? [activeImage, ...activeImageVersions] : []
                const sortedHistory = [...allHistory].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
                const displayHistory = [...sortedHistory].reverse()

                if (allHistory.length === 0) {
                  return (
                    <div className="text-center text-xs text-muted-foreground py-8 select-none">
                      No revision history available.
                    </div>
                  )
                }

                return (
                  <div className="relative pl-4 border-l border-border/80 ml-2 space-y-6">
                    {displayHistory.map((item, idx) => {
                      const originalIdx = sortedHistory.indexOf(item)
                      const versionLabel = `v1.${originalIdx}`
                      const isLatest = item.id === activeImage?.id
                      const isSelected = (!viewingImageId && isLatest) || (viewingImageId === item.id)

                      return (
                        <div
                          key={item.id}
                          onClick={() => setViewingImageId(item.id)}
                          className={cn(
                            "relative p-3 rounded-xl border transition-all cursor-pointer group",
                            isSelected
                              ? "bg-primary/5 border-primary/20 shadow-sm"
                              : "bg-card/40 border-transparent hover:border-border/60 hover:bg-card/80"
                          )}
                        >
                          {/* Timeline Node dot */}
                          <div
                            className={cn(
                              "absolute -left-[22.5px] top-4.5 h-2.5 w-2.5 rounded-full ring-4 ring-background transition-all",
                              isSelected
                                ? "bg-primary scale-110"
                                : "bg-muted-foreground/45 group-hover:bg-muted-foreground/70"
                            )}
                          />

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 select-none">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  isSelected ? "text-primary" : "text-muted-foreground"
                                )}>
                                  {versionLabel}
                                </span>
                                {isLatest && (
                                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[8px] font-black text-emerald-500 uppercase tracking-wide">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs font-bold text-foreground mt-1" title={item.originalName}>
                                {item.originalName}
                              </p>
                              <p className="text-[9px] text-muted-foreground mt-0.5 select-none">
                                Uploaded {new Date(item.createdAt).toLocaleDateString()}
                                {item.comments.length > 0 && ` · ${item.comments.length} ${item.comments.length === 1 ? 'comment' : 'comments'}`}
                              </p>
                            </div>

                            {/* Delete Revision Action Button */}
                            {isOwner && !isLatest && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteRevision(item.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                                title="Delete this revision"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Circular Slide Toggle Button placed right on the border/dragging line */}
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -translate-y-1/2 z-25 hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 hover:border-primary/50 bg-card shadow-xl transition-all hover:bg-accent text-primary hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            left: isSidebarOpen ? 'calc(16rem - 18px)' : '6px',
            transitionProperty: 'left, transform',
            transitionDuration: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          title={isSidebarOpen ? "Collapse Designs" : "Expand Designs"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>

        {/* Circular Slide Toggle Button placed right on the comments border/dragging line */}
        <button
          onClick={toggleCommentsSidebar}
          className="absolute top-1/2 -translate-y-1/2 z-25 hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 hover:border-primary/50 bg-card shadow-xl transition-all hover:bg-accent text-primary hover:scale-110 active:scale-95 cursor-pointer"
          style={{
            right: isCommentsSidebarOpen ? 'calc(24rem - 18px)' : '6px',
            transitionProperty: 'right, transform',
            transitionDuration: '300ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          title={isCommentsSidebarOpen ? "Collapse Comments" : "Expand Comments"}
        >
          {isCommentsSidebarOpen ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>

        {/* Workspace Canvas Area */}
        <div className="flex-1 bg-muted/5 relative overflow-hidden h-full flex flex-col items-center justify-center">
          {viewingImageId && viewingImageId !== activeImage?.id && (
            <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-500 shrink-0 select-none animate-fade-in">
              <span className="font-semibold">
                Viewing a historical version of this design. Comments are read-only.
              </span>
              <button
                onClick={() => setViewingImageId(null)}
                className="underline hover:text-amber-400 font-bold cursor-pointer"
              >
                Switch to Latest Version
              </button>
            </div>
          )}
          <div className="w-full flex-1 relative">
            {currentDisplayedImage ? (
              <AnnotationCanvas
                imageUrl={
                  currentDisplayedImage.filename.startsWith('http://') || currentDisplayedImage.filename.startsWith('https://')
                    ? currentDisplayedImage.filename
                    : getImageUrl(currentDisplayedImage.filename)
                }
                onViewAttachment={handleViewAttachment}
                boardTitle={currentDisplayedImage.originalName}
                comments={showComments ? comments : []}
                onAddComment={handleAddComment}
                isCommentMode={isCommentMode && (!viewingImageId || viewingImageId === activeImage?.id)}
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

        {/* Collapsible Right Comments Sidebar */}
        <aside
          className={cn(
            "relative flex flex-col bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0",
            isCommentsSidebarOpen
              ? "w-full h-[350px] border-t border-border lg:w-96 lg:h-full lg:border-l-4 lg:border-t-0"
              : "w-full h-0 overflow-hidden border-t-0 lg:w-0 lg:h-full lg:border-l-0"
          )}
        >
          <div className="h-full w-full p-3 lg:p-4 lg:h-[calc(100vh-4rem)] lg:w-96 shrink-0 flex flex-col">
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
              onViewAttachment={handleViewAttachment}
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

      {/* Lightbox Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {previewAttachment.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {previewAttachment.type !== 'link' && (
                  <button
                    onClick={() => forceDownload(previewAttachment.url, previewAttachment.name)}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/10 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-all hover:bg-accent cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/5 min-h-[300px]">
              {previewAttachment.type?.startsWith('image/') ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[70vh] object-contain rounded-lg shadow-md"
                />
              ) : previewAttachment.type === 'application/pdf' ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[70vh] border-0 rounded-lg"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="h-12 w-12 text-primary mx-auto animate-pulse" />
                  <p className="text-sm font-medium text-foreground">
                    No preview available for this file type.
                  </p>
                  <button
                    onClick={() => forceDownload(previewAttachment.url, previewAttachment.name)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

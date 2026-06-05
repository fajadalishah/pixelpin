'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Link2, Trash2, Calendar, Files, Globe, FileText, Eye } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { getImageUrl } from '@/lib/image-url'

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

interface ProjectListRowProps {
  project: ProjectData & { owner?: { id: string; name: string; email: string; isMe: boolean } }
  onDelete?: (id: string) => void
  selected?: boolean
  onSelectToggle?: (id: string) => void
  isSelectionActive?: boolean
}

export function ProjectListRow({
  project,
  onDelete,
  selected = false,
  onSelectToggle,
  isSelectionActive = false
}: ProjectListRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [driveImageFailed, setDriveImageFailed] = useState(false)
  const { toast } = useToast()

  const displayTitle = project.title.startsWith('[ARCHIVED] ')
    ? project.title.replace('[ARCHIVED] ', '')
    : project.title

  useEffect(() => {
    setDriveImageFailed(false)
  }, [project.thumbnail])

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/view/${project.publicToken}`
    try {
      await navigator.clipboard.writeText(url)
      toast('success', 'Project share link copied to clipboard!')
    } catch {
      toast('error', 'Failed to copy link')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/images?id=${project.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      toast('success', 'Project deleted successfully')
      onDelete?.(project.id)
    } catch {
      toast('error', 'Failed to delete project')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  function getGoogleDriveFileId(url: string): string | null {
    try {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        return match[1]
      }
      const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
      if (queryMatch && queryMatch[1]) {
        return queryMatch[1]
      }
    } catch {}
    return null
  }

  return (
    <div className={cn(
      "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card/80 backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-primary/30 animate-fade-in",
      selected ? "border-primary ring-2 ring-primary/20" : "border-border"
    )}>
      {/* Left section: Checkbox + Thumbnail + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox */}
        {onSelectToggle && (
          <div 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelectToggle(project.id)
            }}
            className={cn(
              "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all duration-300 shadow-sm",
              selected
                ? "bg-primary border-primary text-primary-foreground scale-100"
                : cn(
                    "bg-black/10 dark:bg-white/5 border-border text-transparent hover:bg-black/20 hover:border-border/80",
                    isSelectionActive ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                  )
            )}
          >
            {selected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 animate-scale-in"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {/* Thumbnail Preview */}
        <a href={`/view/${project.publicToken}`} className="shrink-0 block">
          <div className="h-10 w-16 sm:h-12 sm:w-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center relative shadow-sm">
            {project.thumbnail ? (() => {
              const lowerThumbnail = project.thumbnail.toLowerCase().split('?')[0]
              const isPDF = lowerThumbnail.endsWith('.pdf')
              const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(lowerThumbnail) || project.thumbnail.includes('blob.vercel-storage.com')
              const isLink = (project.thumbnail.startsWith('http://') || project.thumbnail.startsWith('https://')) && !isImage && !isPDF

              if (isPDF) {
                return <FileText className="h-5 w-5 text-rose-500" />
              }

              if (isLink) {
                const driveFileId = getGoogleDriveFileId(project.thumbnail)
                if (driveFileId && !driveImageFailed) {
                  return (
                    <img
                      src={`https://drive.google.com/uc?export=view&id=${driveFileId}`}
                      alt={displayTitle}
                      onError={() => setDriveImageFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  )
                }
                return <Globe className="h-5 w-5 text-primary" />
              }

              return (
                <img
                  src={getImageUrl(project.thumbnail)}
                  alt={displayTitle}
                  className="h-full w-full object-cover"
                />
              )
            })() : (
              <span className="text-[9px] text-muted-foreground font-semibold uppercase select-none">Empty</span>
            )}
          </div>
        </a>

        {/* Title and Badge details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/view/${project.publicToken}`} className="block min-w-0">
              <h3 className="truncate text-xs sm:text-sm font-bold text-card-foreground hover:text-primary transition-colors" title={displayTitle}>
                {displayTitle}
              </h3>
            </a>
            {project.status && (
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black border leading-none select-none uppercase tracking-wider",
                project.status === "Approved" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                project.status === "Revision Needed" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                project.status === "In Review" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                project.status === "In Progress" && "bg-slate-500/10 border-slate-500/20 text-slate-400 dark:text-slate-300",
                !["Approved", "Revision Needed", "In Review", "In Progress"].includes(project.status) && "bg-primary/10 border-primary/20 text-primary"
              )}>
                {project.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Owner badge */}
            {project.owner && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted text-[9px] font-bold text-muted-foreground border border-border/60">
                <div className="h-3.5 w-3.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[7px] font-black uppercase">
                  {project.owner.name.charAt(0)}
                </div>
                <span>{project.owner.isMe ? 'You' : project.owner.name}</span>
              </div>
            )}
            <span className="hidden sm:inline text-[10px] text-muted-foreground font-semibold">
              Created {formatRelativeTime(project.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Middle/Right section: Stats and Action Buttons */}
      <div className="flex flex-row items-center justify-between sm:justify-end gap-6 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/30 pt-3 sm:pt-0">
        {/* Metadata stats */}
        <div className="flex items-center gap-4 text-[11px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1" title={`${project.imageCount} images`}>
            <Files className="h-3.5 w-3.5 text-muted-foreground/85" />
            <span>{project.imageCount}</span>
          </span>
          <span className="flex items-center gap-1" title={`${project.commentCount} comments`}>
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/85" />
            <span>{project.commentCount}</span>
          </span>
          <span className="sm:hidden text-[10px] text-muted-foreground font-semibold">
            {formatRelativeTime(project.createdAt)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <a
            href={`/view/${project.publicToken}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 bg-muted/20"
            title="View project"
          >
            <Eye className="h-3.5 w-3.5" />
          </a>
          
          <button
            onClick={handleCopyLink}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 bg-muted/20"
            title="Copy public link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>

          {onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive border border-border/40 hover:border-destructive/20 bg-muted/20"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Inline Delete Confirmation Popover */}
              {showDeleteConfirm && (
                <div className="absolute bottom-full right-0 z-10 mb-2 w-48 animate-fade-in rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-xl">
                  <p className="mb-3 text-[10px] text-card-foreground leading-normal font-semibold">
                    Delete this project? All images and comments will be permanently deleted.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className={cn(
                        'flex-1 rounded-lg bg-destructive px-2 py-1 text-[10px] font-bold text-white hover:bg-destructive/90 transition-colors',
                        isDeleting && 'opacity-50'
                      )}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

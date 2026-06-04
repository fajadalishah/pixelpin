'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Link2, Trash2, Calendar, Files, Globe, FileText } from 'lucide-react'
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
}

interface ImageCardProps {
  image: ProjectData // Holds project details
  onDelete?: (id: string) => void
  selected?: boolean
  onSelectToggle?: (id: string) => void
  isSelectionActive?: boolean
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

export function ImageCard({ 
  image, 
  onDelete, 
  selected = false, 
  onSelectToggle, 
  isSelectionActive = false 
}: ImageCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [driveImageFailed, setDriveImageFailed] = useState(false)
  const { toast } = useToast()

  const displayTitle = image.title.startsWith('[ARCHIVED] ')
    ? image.title.replace('[ARCHIVED] ', '')
    : image.title

  useEffect(() => {
    setDriveImageFailed(false)
  }, [image.thumbnail])

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/view/${image.publicToken}`
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
      const res = await fetch(`/api/images?id=${image.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      toast('success', 'Project deleted successfully')
      onDelete?.(image.id)
    } catch {
      toast('error', 'Failed to delete project')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 animate-fade-in",
      selected ? "border-primary ring-2 ring-primary/20" : "border-border"
    )}>
      {/* Image Thumbnail */}
      <div className="relative">
        {/* Checkbox Overlay */}
        {onSelectToggle && (
          <div 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelectToggle(image.id)
            }}
            className={cn(
              "absolute left-3 top-3 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all duration-300 shadow-md",
              selected
                ? "bg-primary border-primary text-primary-foreground scale-100"
                : cn(
                    "bg-black/40 border-white/30 text-transparent hover:bg-black/60 hover:border-white/50",
                    isSelectionActive ? "opacity-100 scale-100 animate-fade-in" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                  )
            )}
          >
            {selected && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 animate-scale-in"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        <a href={`/view/${image.publicToken}`} className="block">
          <div className="relative aspect-video overflow-hidden bg-muted flex items-center justify-center">
            {image.thumbnail ? (() => {
              const lowerThumbnail = image.thumbnail.toLowerCase().split('?')[0]
              const isPDF = lowerThumbnail.endsWith('.pdf')
              const isImage = /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(lowerThumbnail) || image.thumbnail.includes('blob.vercel-storage.com')
              const isLink = (image.thumbnail.startsWith('http://') || image.thumbnail.startsWith('https://')) && !isImage && !isPDF

              if (isPDF) {
                return (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-rose-500/10 text-rose-500 p-4">
                    <FileText className="h-8 w-8 text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase bg-rose-500/20 text-rose-600 px-2 py-0.5 rounded select-none">PDF Document</span>
                  </div>
                )
              }

              if (isLink) {
                const driveFileId = getGoogleDriveFileId(image.thumbnail)
                if (driveFileId && !driveImageFailed) {
                  return (
                    <img
                      src={`https://drive.google.com/uc?export=view&id=${driveFileId}`}
                      alt={displayTitle}
                      onError={() => setDriveImageFailed(true)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )
                }
                return (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-primary/10 text-primary p-4">
                    <Globe className="h-8 w-8 text-primary mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase bg-primary/20 text-primary px-2 py-0.5 rounded select-none">Link Board</span>
                  </div>
                )
              }

              return (
                <img
                  src={getImageUrl(image.thumbnail)}
                  alt={displayTitle}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )
            })() : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                No images uploaded
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            {/* Files Badge */}
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-tiny-10 font-semibold text-white backdrop-blur-sm shadow-sm animate-fade-in">
              <Files className="h-3 w-3" />
              {image.imageCount} {image.imageCount === 1 ? 'image' : 'images'}
            </div>
          </div>
        </a>
      </div>

      {/* Content */}
      <div className="p-4">
        <a href={`/view/${image.publicToken}`}>
          <h3 className="truncate text-sm font-semibold text-card-foreground transition-colors hover:text-primary" title={displayTitle}>
            {displayTitle}
          </h3>
        </a>

        {/* Bottom Bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1" title={`${image.commentCount} total comments`}>
              <MessageSquare className="h-3.5 w-3.5" />
              {image.commentCount}
            </span>
            <span className="flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="h-3.5 w-3.5" />
              {formatRelativeTime(image.createdAt)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              title="Copy public link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
            {onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                title="Delete project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Delete Confirmation Popup */}
              {showDeleteConfirm && (
                <div className="absolute bottom-full right-0 z-10 mb-2 w-48 animate-fade-in rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-xl">
                  <p className="mb-3 text-xs text-card-foreground">
                    Delete this project? This will remove all images and comments.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className={cn(
                        'flex-1 rounded-lg bg-destructive px-2 py-1.5 text-xs font-medium text-white hover:bg-destructive/90',
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
    </div>
  )
}

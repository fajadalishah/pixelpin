'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Send,
  CheckCircle,
  User,
  Paperclip,
  Smile,
  Edit2,
  Trash2,
  FileText,
  Download,
  MoreVertical,
  MapPin,
  Square,
  Circle as CircleIcon,
  Pencil,
  ArrowUpRight,
  Lock,
  Globe,
} from 'lucide-react'
import { cn, formatRelativeTime, getAttachmentUrl, forceDownload } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

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

interface CommentPopoverProps {
  comment: Comment | null
  position: { xPercent: number; yPercent: number }
  onSubmit: (content: string, file: File | null, linkUrl?: string, linkTitle?: string) => void
  onClose: () => void
  onResolve?: (id: string) => void
  onEdit?: (id: string, content: string, file: File | null, removeFile: boolean, linkUrl?: string, linkTitle?: string) => void
  onDelete?: (id: string) => void
  isOwner?: boolean
  currentUserId?: string | null
  currentGuestName?: string | null
  onOffsetChange?: (offset: { x: number; y: number }) => void
  initialOffset?: { x: number; y: number }
  onShapeSelect?: (
    commentId: string,
    shapeType: 'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand' | 'pin'
  ) => void
  onColorSelect?: (commentId: string, colorHex: string) => void
  isSelected?: boolean
  ownerPlan?: string
  onViewAttachment?: (url: string, fileName: string, fileType: string) => void
}

const EMOJIS = ['👍', '❤️', '🎉', '😂', '🚀', '👀', '🔥', '👏', '💡', '❓']

const COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'green', hex: '#22c55e' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'purple', hex: '#a855f7' },
]

export function CommentPopover({
  comment,
  position,
  onSubmit,
  onClose,
  onResolve,
  onEdit,
  onDelete,
  isOwner = false,
  currentUserId = null,
  currentGuestName = null,
  onOffsetChange,
  initialOffset = { x: 0, y: 0 },
  onShapeSelect,
  onColorSelect,
  isSelected = false,
  ownerPlan = 'free',
  onViewAttachment,
}: CommentPopoverProps) {
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  // Dragging States
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState(initialOffset)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Smart positioning: determine if popover should go left/right, up/down
  const goLeft = position.xPercent > 60
  const goUp = position.yPercent > 70

  // Reset offset and state when comment changes
  useEffect(() => {
    setOffset(initialOffset)
    setShowActionsMenu(false)
    setIsEditing(false)
    setEditFile(null)
    setRemoveExistingFile(false)
    setLinkUrl(comment?.fileType === 'link' ? comment.fileUrl || '' : '')
    setLinkTitle(comment?.fileType === 'link' ? comment.fileName || '' : '')
    setShowLinkInput(comment?.fileType === 'link')
  }, [comment?.id, comment?.fileUrl, comment?.fileName, comment?.fileType, initialOffset])

  useEffect(() => {
    if (!comment && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [comment])

  // Dragging movement logic
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    })
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragStart) return

    const handleMouseMove = (e: MouseEvent) => {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }
      setOffset(newOffset)
      onOffsetChange?.(newOffset)
    }

    const handleMouseUp = () => {
      setDragStart(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragStart, onOffsetChange])

  // Close on clicking outside (only for new comment creation forms)
  useEffect(() => {
    if (comment !== null) return

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [comment, onClose])

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(content.trim(), file, linkUrl.trim(), linkTitle.trim())
      setContent('')
      setFile(null)
      setLinkUrl('')
      setLinkTitle('')
      setShowLinkInput(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [content, file, linkUrl, linkTitle, onSubmit])

  const handleEditSubmit = useCallback(async () => {
    if (!comment || !editContent.trim() || !onEdit) return
    setIsSubmitting(true)
    try {
      await onEdit(comment.id, editContent.trim(), editFile, removeExistingFile, linkUrl.trim(), linkTitle.trim())
      setIsEditing(false)
      setLinkUrl('')
      setLinkTitle('')
      setShowLinkInput(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [comment, editContent, onEdit, editFile, removeExistingFile, linkUrl, linkTitle])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isEditing) {
        handleEditSubmit()
      } else {
        handleSubmit()
      }
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const insertEmoji = (emoji: string) => {
    if (isEditing) {
      setEditContent((prev) => prev + emoji)
    } else {
      setContent((prev) => prev + emoji)
    }
    setShowEmojiPicker(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('Attachment too large. Maximum size is 5MB.')
        return
      }
      if (isEditing) {
        setEditFile(selectedFile)
      } else {
        setFile(selectedFile)
      }
    }
  }

  const handleShapeSelect = (shapeType: any) => {
    if (comment && onShapeSelect) {
      onShapeSelect(comment.id, shapeType)
      setShowActionsMenu(false)
      onClose()
    }
  }

  const handleColorSelect = (colorHex: string) => {
    if (comment && onColorSelect) {
      onColorSelect(comment.id, colorHex)
      setShowActionsMenu(false)
    }
  }

  // Permissions helper
  const isCommentAuthor =
    (comment?.userId && comment.userId === currentUserId) ||
    (!comment?.userId && comment?.guestName === currentGuestName)
  const canModify = isOwner || isCommentAuthor

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all hover:text-primary/80"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const authorName = comment?.user?.name || comment?.guestName || 'Anonymous'
  const authorInitial = authorName.charAt(0).toUpperCase()

  return (
    <div
      ref={popoverRef}
      className="absolute z-30 w-80 select-none"
      style={{
        left: goLeft ? undefined : `${position.xPercent}%`,
        right: goLeft ? `${100 - position.xPercent}%` : undefined,
        top: goUp ? undefined : `${position.yPercent}%`,
        bottom: goUp ? `${100 - position.yPercent}%` : undefined,
        marginLeft: goLeft ? undefined : '16px',
        marginRight: goLeft ? '16px' : undefined,
        marginTop: goUp ? undefined : '16px',
        marginBottom: goUp ? '16px' : undefined,
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >
      <div className={cn(
        "w-full h-full animate-fade-in rounded-xl border bg-card/95 shadow-2xl shadow-black/15 backdrop-blur-xl transition-all duration-200",
        isSelected ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border"
      )}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-border px-3 py-2 cursor-move select-none"
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-xs font-semibold text-muted-foreground">
          {comment ? (isEditing ? 'Edit Comment' : 'Comment Details') : 'New Pin'}
        </span>
        
        <div className="flex items-center">
          {/* Actions Dropdown */}
          {comment && (
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground mr-1"
                title="Comment Actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 top-full z-45 mt-1 w-44 rounded-xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-xl">
                  {/* Delete option */}
                  {canModify && onDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this comment?')) onDelete(comment.id)
                        setShowActionsMenu(false)
                      }}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                  
                  {canModify && <div className="my-1 h-px bg-border" />}

                  {/* Add Figure Options */}
                  {canModify && (
                    <div className="space-y-1 p-1">
                      <p className="text-tiny-10 font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Add/Change Figure
                      </p>
                      <div className="grid grid-cols-5 gap-1">
                        <button
                          onClick={() => handleShapeSelect('arrow')}
                          className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted border border-border/40 relative ${
                            comment.annotationType === 'arrow' ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground'
                          }`}
                          title="Arrow"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleShapeSelect('pin')}
                          className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted border border-border/40 ${
                            comment.annotationType === 'pin' ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground'
                          }`}
                          title="Dot"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleShapeSelect('rectangle')}
                          className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted border border-border/40 relative ${
                            comment.annotationType === 'rectangle' ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground'
                          }`}
                          title="Rectangle"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleShapeSelect('circle')}
                          className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted border border-border/40 relative ${
                            comment.annotationType === 'circle' ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground'
                          }`}
                          title="Circle"
                        >
                          <CircleIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleShapeSelect('freehand')}
                          className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted border border-border/40 relative ${
                            comment.annotationType === 'freehand' ? 'bg-primary/20 text-primary border-primary' : 'text-muted-foreground'
                          }`}
                          title="Pencil"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {canModify && <div className="my-1 h-px bg-border" />}

                  {/* Change Color Swatches */}
                  {canModify && (
                    <div className="space-y-1 p-1">
                      <p className="text-tiny-10 font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Change Color
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {COLORS.map((c) => {
                          const currentData = comment.annotationData ? JSON.parse(comment.annotationData) : {}
                          const isCurrentColor =
                            currentData.color === c.hex || (!currentData.color && c.id === 'red')
                          return (
                            <button
                              key={c.id}
                              onClick={() => handleColorSelect(c.hex)}
                              className={`h-4.5 w-4.5 rounded-full border transition-all ${
                                isCurrentColor
                                  ? 'ring-2 ring-primary border-transparent scale-110'
                                  : 'border-border hover:scale-105'
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.id}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3">
        {comment ? (
          isEditing ? (
            /* Editing Comment Form */
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
              />

              {/* Existing file attachment preview in edit mode */}
              {comment.fileUrl && !removeExistingFile && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-muted-foreground max-w-[180px]">
                      {comment.fileName || 'Attachment'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingFile(true)}
                    className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Newly attached file preview in edit mode */}
              {editFile && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-muted-foreground max-w-[180px]">
                      {editFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditFile(null)}
                    className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Link Input block in Edit Mode */}
              {showLinkInput && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5 mb-1.5 font-semibold text-muted-foreground uppercase text-[10px]">
                    <span>Edit Preview Link</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkUrl('')
                        setLinkTitle('')
                        setShowLinkInput(false)
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Link Title (e.g. Google Drive, Figma) - optional"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                      title="Add Emoji"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute left-0 bottom-full z-10 mb-2 flex gap-1 rounded-lg border border-border bg-card p-1.5 shadow-xl">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => insertEmoji(emoji)}
                            className="hover:scale-125 transition-transform p-0.5 text-sm"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add File Paperclip Trigger in Edit Mode */}
                  {(!comment.fileUrl || removeExistingFile) && !editFile && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click()
                        }}
                        className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                        title="Attach File/Image"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </>
                  )}

                  {/* Add Link Trigger in Edit Mode */}
                  {(!comment.fileUrl || removeExistingFile) && !editFile && (
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(!showLinkInput)}
                      className={cn(
                        "text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer",
                        showLinkInput && "bg-muted text-primary"
                      )}
                      title="Attach External Link"
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleEditSubmit}
                    disabled={!editContent.trim()}
                    loading={isSubmitting}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* View Comment Details */
            <div className="space-y-3">
              {/* Author */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  {authorInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold text-card-foreground">
                    {authorName}
                  </p>
                  <p className="text-tiny-10 text-muted-foreground" suppressHydrationWarning>
                    {formatRelativeTime(comment.createdAt)}
                  </p>
                </div>
                {comment.resolved && (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-tiny-9 font-bold text-success">
                    <CheckCircle className="h-3 w-3" />
                    Resolved
                  </span>
                )}
              </div>

              {/* Content Text */}
              <p className="text-sm leading-relaxed text-card-foreground whitespace-pre-wrap">
                {renderTextWithLinks(comment.content)}
              </p>

              {/* Render Attachments */}
              {comment.fileUrl && (
                <div className="mt-2">
                  {comment.fileType === 'link' ? (
                    <a
                      href={getAttachmentUrl(comment.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-2 text-xs hover:from-primary/10 hover:to-accent/10 transition-colors"
                    >
                      <Globe className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                      <span className="truncate flex-1 text-primary font-bold hover:underline" title={comment.fileUrl}>
                        {comment.fileName || 'Preview Link'}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : comment.fileType?.startsWith('image/') ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-2 space-y-2">
                      <div
                        onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                        className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted/30 border border-border/80 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={getAttachmentUrl(comment.fileUrl)}
                          alt={comment.fileName || 'attachment'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 pr-1">
                        <p className="truncate text-[10px] font-bold text-foreground" title={comment.fileName || 'Attachment'}>
                          {comment.fileName || 'Attachment'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                          className="flex-1 py-1 rounded bg-secondary text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-center border border-border/60 cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => forceDownload(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'attachment')}
                          className="flex-1 py-1 rounded bg-primary text-[9px] font-bold text-primary-foreground hover:bg-primary/90 transition-all text-center flex items-center justify-center gap-1 shadow-sm shadow-primary/10 cursor-pointer"
                        >
                          <Download className="h-2.5 w-2.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/40 p-2 space-y-2">
                      <div
                        onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                        className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted/30 border border-border/80 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <FileText className="h-5 w-5 text-primary mb-1" />
                          <span className="text-[9px] font-black bg-primary/20 text-primary px-1.5 py-0.2 rounded uppercase select-none">
                            File
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 pr-1">
                        <p className="truncate text-[10px] font-bold text-foreground" title={comment.fileName || 'Attachment'}>
                          {comment.fileName || 'Attachment'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                        <button
                          type="button"
                          onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                          className="flex-1 py-1 rounded bg-secondary text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-center border border-border/60 cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => forceDownload(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'attachment')}
                          className="flex-1 py-1 rounded bg-primary text-[9px] font-bold text-primary-foreground hover:bg-primary/90 transition-all text-center flex items-center justify-center gap-1 shadow-sm shadow-primary/10 cursor-pointer"
                        >
                          <Download className="h-2.5 w-2.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inline Action Controls */}
              <div className="flex items-center gap-2 border-t border-border/50 pt-2 text-xs">
                {isOwner && onResolve && (
                  <button
                    onClick={() => onResolve(comment.id)}
                    className={cn(
                      'flex-1 rounded px-2 py-1 text-center font-medium transition-colors',
                      comment.resolved
                        ? 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        : 'bg-success/10 text-success hover:bg-success/20'
                    )}
                  >
                    {comment.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                )}

                {canModify && (
                  <>
                    {onEdit && (
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setEditContent(comment.content)
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground p-1 transition-colors"
                        title="Edit Comment"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this comment?')) onDelete(comment.id)
                        }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-destructive p-1 transition-colors ml-auto"
                        title="Delete Comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        ) : (
          /* Create Comment Form */
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your comment..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
            />

            {/* Display File Attachment Preview */}
            {file && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-2 py-1 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate text-muted-foreground max-w-[180px]">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Display Link Preview in Creation Mode */}
            {showLinkInput && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2 text-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5 mb-1.5 font-semibold text-muted-foreground uppercase text-[10px]">
                  <span>Add Preview Link</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkUrl('')
                      setLinkTitle('')
                      setShowLinkInput(false)
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Link Title (e.g. Google Drive, Figma) - optional"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Editor Action Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {/* Emoji Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
                    title="Add Emoji"
                  >
                    <Smile className="h-4.5 w-4.5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 flex gap-1 rounded-lg border border-border bg-card p-1.5 shadow-xl">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => insertEmoji(emoji)}
                          className="hover:scale-125 transition-transform p-0.5 text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
                  title="Attach File/Image"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Link Attachment Trigger */}
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className={cn(
                    "text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer",
                    showLinkInput && "bg-muted text-primary"
                  )}
                  title="Attach External Link"
                >
                  <Globe className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow shadow-primary/20',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                <Send className="h-3 w-3" />
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="text-tiny-9 text-muted-foreground text-right select-none">
              Enter to submit
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
  )
}

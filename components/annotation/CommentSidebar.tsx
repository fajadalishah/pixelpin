'use client'

import { useState, useCallback, useRef } from 'react'
import {
  MessageSquare,
  CheckCircle,
  Filter,
  Trash2,
  Edit2,
  Smile,
  X,
  FileText,
  Download,
  Paperclip,
  Globe,
} from 'lucide-react'
import { cn, formatRelativeTime, getAttachmentUrl, forceDownload } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

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

type FilterTab = 'all' | 'open' | 'resolved'

interface CommentSidebarProps {
  comments: Comment[]
  selectedCommentId: string | null
  onSelectComment: (id: string | null) => void
  onResolve?: (id: string) => void
  onEdit?: (id: string, content: string, file?: File | null, removeFile?: boolean, linkUrl?: string, linkTitle?: string) => void
  onDelete?: (id: string) => void
  isOwner: boolean
  currentUserId?: string | null
  currentGuestName?: string | null
  onViewAttachment?: (url: string, fileName: string, fileType: string) => void
}

const EMOJIS = ['👍', '❤️', '🎉', '😂', '🚀', '👀', '🔥', '👏', '💡', '❓']

export function CommentSidebar({
  comments,
  selectedCommentId,
  onSelectComment,
  onResolve,
  onEdit,
  onDelete,
  isOwner,
  currentUserId = null,
  currentGuestName = null,
  onViewAttachment,
}: CommentSidebarProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [isEditingId, setIsEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // File edit states
  const [editFile, setEditFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.resolved
    if (filter === 'resolved') return c.resolved
    return true
  })

  const openCount = comments.filter((c) => !c.resolved).length
  const resolvedCount = comments.filter((c) => c.resolved).length

  const handleEditSave = async (id: string) => {
    if (!editContent.trim() || !onEdit) return
    await onEdit(
      id,
      editContent.trim(),
      editFile,
      removeExistingFile,
      linkUrl.trim(),
      linkTitle.trim()
    )
    setIsEditingId(null)
    setEditFile(null)
    setRemoveExistingFile(false)
    setLinkUrl('')
    setLinkTitle('')
    setShowLinkInput(false)
  }

  const insertEmoji = (emoji: string) => {
    setEditContent((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

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
            onClick={(e) => e.stopPropagation()} // Don't trigger select card
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const attachedFiles = filteredComments.filter((c) => c.fileUrl)
  const hasFiles = attachedFiles.length > 0

  return (
    <div className="flex h-full w-full flex-col">
      {/* Comments List Panel */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-card-foreground">Comments</h2>
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-tiny-10 font-semibold text-primary">
              {comments.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="mt-3 flex gap-1 rounded-lg bg-muted/50 p-0.5">
            {([
              { key: 'all' as FilterTab, label: 'All', count: comments.length },
              { key: 'open' as FilterTab, label: 'Open', count: openCount },
              { key: 'resolved' as FilterTab, label: 'Resolved', count: resolvedCount },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-tiny-11 font-medium transition-all cursor-pointer',
                  filter === tab.key
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {filter === 'all'
                  ? 'No comments yet'
                  : `No ${filter} comments`}
              </p>
            </div>
          ) : (
            filteredComments.map((comment, filteredIndex) => {
              const pinNumber = comments.indexOf(comment) + 1
              const authorName =
                comment.user?.name || comment.guestName || 'Anonymous'
              const isSelected = selectedCommentId === comment.id
              const isEditing = isEditingId === comment.id

              const isCommentAuthor =
                (comment.userId && comment.userId === currentUserId) ||
                (!comment.userId && comment.guestName === currentGuestName)
              const canModify = isOwner || isCommentAuthor

              return (
                <div
                  key={comment.id}
                  onClick={() => {
                    if (!isEditing) onSelectComment(isSelected ? null : comment.id)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3.5 transition-all duration-200 cursor-pointer',
                    isSelected && !isEditing && 'bg-primary/5 border-l-2 border-l-primary',
                    !isSelected && 'border-l-2 border-l-transparent hover:bg-muted/30'
                  )}
                  style={{
                    animationDelay: `${filteredIndex * 50}ms`,
                  }}
                >
                  {isEditing ? (
                    /* Inline Edit Form */
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-tiny-9 font-bold text-primary">
                          {pinNumber}
                        </span>
                        <span>Editing comment</span>
                      </div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleEditSave(comment.id)
                          }
                          if (e.key === 'Escape') {
                            setIsEditingId(null)
                          }
                        }}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />

                      {/* Existing file attachment preview in edit mode */}
                      {comment.fileUrl && !removeExistingFile && (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-2 py-1 text-[10px]">
                          <div className="flex items-center gap-1 min-w-0">
                            <Paperclip className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate text-muted-foreground max-w-[150px]">
                              {comment.fileName || 'Attachment'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRemoveExistingFile(true)}
                            className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}

                      {/* Newly attached file preview in edit mode */}
                      {editFile && (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-2 py-1 text-[10px]">
                          <div className="flex items-center gap-1 min-w-0">
                            <Paperclip className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate text-muted-foreground max-w-[150px]">
                              {editFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditFile(null)}
                            className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}

                      {/* Link Input block in Edit Mode */}
                      {showLinkInput && (
                        <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-2 text-[10px]">
                          <div className="flex items-center justify-between border-b border-border/50 pb-1 mb-1 font-semibold text-muted-foreground uppercase text-[9px]">
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
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="w-full rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="text"
                            placeholder="Link Title (optional)"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            className="w-full rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                              <Smile className="h-3.5 w-3.5" />
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute left-0 bottom-full z-10 mb-2 flex gap-1 rounded-lg border border-border bg-card p-1 shadow-lg animate-fade-in">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => insertEmoji(emoji)}
                                    className="hover:scale-125 transition-transform p-0.5 text-xs"
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
                                onClick={() => editFileInputRef.current?.click()}
                                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                                title="Attach File/Image"
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                              </button>
                              <input
                                ref={editFileInputRef}
                                type="file"
                                onChange={(e) => {
                                  const selectedFile = e.target.files?.[0]
                                  if (selectedFile) {
                                    if (selectedFile.size > 5 * 1024 * 1024) {
                                      alert('Attachment too large. Maximum size is 5MB.')
                                      return
                                    }
                                    setEditFile(selectedFile)
                                  }
                                }}
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
                              <Globe className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-tiny-10"
                            onClick={() => setIsEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 text-tiny-10"
                            onClick={() => handleEditSave(comment.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard List Row / Card Details */
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        {/* Pin Number */}
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-tiny-9 font-bold',
                            comment.resolved
                              ? 'bg-success/15 text-success'
                              : 'bg-primary/15 text-primary'
                          )}
                        >
                          {pinNumber}
                        </div>

                        {/* Content details */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs text-card-foreground leading-relaxed whitespace-pre-wrap",
                            !isSelected && "line-clamp-2"
                          )}>
                            {isSelected ? renderTextWithLinks(comment.content) : comment.content}
                          </p>

                          {/* Rendering Attachments directly inside the comment list card */}
                          {comment.fileUrl && (
                            <div
                              className="mt-2.5 rounded-xl border border-border bg-muted/40 p-2 space-y-2 max-w-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Thumbnail / File representation */}
                              <div
                                onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                                className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted/30 border border-border/80 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                {comment.fileType?.startsWith('image/') ? (
                                  <img
                                    src={getAttachmentUrl(comment.fileUrl)}
                                    alt={comment.fileName || 'attachment'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-2 text-center">
                                    <FileText className="h-5 w-5 text-primary mb-1" />
                                    <span className="text-[9px] font-black bg-primary/20 text-primary px-1.5 py-0.2 rounded uppercase select-none">
                                      {comment.fileType === 'link' ? 'Link' : 'File'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Title */}
                              <div className="min-w-0 pr-1">
                                <p className="truncate text-[10px] font-bold text-foreground" title={comment.fileName || 'Attachment'}>
                                  {comment.fileName || 'Attachment'}
                                </p>
                              </div>

                              {/* Download and View buttons */}
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                                <button
                                  type="button"
                                  onClick={() => onViewAttachment?.(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'Attachment', comment.fileType!)}
                                  className="flex-1 py-1 rounded bg-secondary text-[9px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors text-center border border-border/60 cursor-pointer"
                                >
                                  View
                                </button>
                                {comment.fileType !== 'link' && (
                                  <button
                                    type="button"
                                    onClick={() => forceDownload(getAttachmentUrl(comment.fileUrl!), comment.fileName || 'attachment')}
                                    className="flex-1 py-1 rounded bg-primary text-[9px] font-bold text-primary-foreground hover:bg-primary/90 transition-all text-center flex items-center justify-center gap-1 shadow-sm shadow-primary/10 cursor-pointer"
                                  >
                                    <Download className="h-2.5 w-2.5" />
                                    <span>Download</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-1.5 text-tiny-10 text-muted-foreground">
                            <span className="font-semibold text-muted-foreground/90">
                              {authorName}
                            </span>
                            {(() => {
                              try {
                                if (comment.annotationData) {
                                  const data = JSON.parse(comment.annotationData)
                                  if (data && typeof data.page === 'number') {
                                    return (
                                      <>
                                        <span>·</span>
                                        <span className="bg-rose-500/10 text-rose-600 px-1 py-0.2 rounded font-black uppercase text-[8px]">
                                          Page {data.page}
                                        </span>
                                      </>
                                    )
                                  }
                                }
                              } catch {}
                              return null
                            })()}
                            <span>·</span>
                            <span suppressHydrationWarning>
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Resolved Badge */}
                        {comment.resolved && (
                          <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                        )}
                      </div>

                      {/* Selected Item Edit/Delete Actions */}
                      {isSelected && canModify && (
                        <div
                          className="flex items-center justify-end gap-3 border-t border-border/40 pt-2 text-tiny-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onEdit && (
                            <button
                              onClick={() => {
                                setIsEditingId(comment.id)
                                setEditContent(comment.content)
                                setEditFile(null)
                                setRemoveExistingFile(false)
                                setLinkUrl(comment.fileType === 'link' ? comment.fileUrl || '' : '')
                                setLinkTitle(comment.fileType === 'link' ? comment.fileName || '' : '')
                                setShowLinkInput(comment.fileType === 'link')
                              }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => {
                                if (confirm('Delete this comment?')) onDelete(comment.id)
                              }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Resolve Action Panel at Bottom */}
        {isOwner && onResolve && selectedCommentId && (() => {
          const selected = comments.find((c) => c.id === selectedCommentId)
          if (!selected || isEditingId === selectedCommentId) return null
          return (
            <div className="border-t border-border px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onResolve(selected.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors shadow-sm cursor-pointer',
                  selected.resolved
                    ? 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                    : 'bg-success/15 text-success hover:bg-success/20'
                )}
              >
                {selected.resolved ? 'Reopen Comment' : 'Mark as Resolved'}
              </button>
            </div>
          )
        })()}
      </div>

    </div>
  )
}

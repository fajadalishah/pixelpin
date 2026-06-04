'use client'

import { useState, useRef } from 'react'
import { X, ArrowUp, ArrowDown, Trash2, Plus, Loader2, Image as ImageIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getImageUrl } from '@/lib/image-url'

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
}

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: ProjectDetails
  onProjectUpdated: (updatedProject: ProjectDetails) => void
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}: EditProjectModalProps) {
  const [title, setTitle] = useState(project.title)
  const [images, setImages] = useState<ImageDetails[]>(project.images)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Handle reordering images
  const moveImage = (index: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? index - 1 : index + 1
    if (nextIdx < 0 || nextIdx >= images.length) return

    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[nextIdx]
    updated[nextIdx] = temp
    setImages(updated)
  }

  // Handle deleting individual images
  const handleDeleteImage = async (imageId: string) => {
    if (images.length <= 1) {
      toast('error', 'A project must have at least one image.')
      return
    }

    if (
      !confirm(
        'Are you sure you want to delete this design? All comments pinned to this design will be permanently deleted.'
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete image')
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId))
      toast('success', 'Design deleted successfully.')
    } catch (err) {
      console.error(err)
      toast('error', 'Failed to delete design.')
    }
  }

  // Handle adding new files/images to the project
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file)
      })
      formData.append('projectId', project.id)

      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to upload images')
      }

      // Fetch the updated project detail to load new designs
      const getRes = await fetch(`/api/view/${project.publicToken}`)
      if (!getRes.ok) {
        throw new Error('Failed to sync project details')
      }

      const updatedProj = await getRes.json()
      setImages(updatedProj.images)
      toast('success', 'New designs added successfully!')
    } catch (err) {
      console.error(err)
      toast('error', err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handle saving project title and image ordering
  const handleSave = async () => {
    if (!title.trim()) {
      toast('error', 'Project name is required.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          imageIds: images.map((img) => img.id),
          imageRenames: images.map((img) => ({ id: img.id, originalName: img.originalName })),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save project modifications')
      }

      const updatedProject = await res.json()
      onProjectUpdated(updatedProject)
      toast('success', 'Project changes saved!')
      onClose()
    } catch (err) {
      console.error(err)
      toast('error', 'Could not save project modifications.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project" size="md">
      <div className="space-y-6">
        {/* Project Title Input */}
        <Input
          label="Project Name"
          placeholder="Rename your project..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          icon={<ImageIcon className="h-4 w-4" />}
        />

        {/* Designs List */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Manage Designs ({images.length})
          </label>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card/60 hover:bg-card/90 transition-colors shadow-sm"
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-16 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-muted flex items-center justify-center">
                  {img.filename.startsWith('http') ? (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-primary/10 text-primary text-[10px] font-black uppercase">
                      Link
                    </div>
                  ) : img.filename.endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase">
                      PDF
                    </div>
                  ) : (
                    <img
                      src={getImageUrl(img.filename)}
                      alt={img.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-tiny-9 font-bold text-white text-center py-0.5 select-none">
                    Place {idx + 1}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <input
                    type="text"
                    value={img.originalName}
                    onChange={(e) => {
                      const updatedVal = e.target.value
                      setImages((prev) =>
                        prev.map((image) =>
                          image.id === img.id
                            ? { ...image, originalName: updatedVal }
                            : image
                        )
                      )
                    }}
                    className="w-full bg-muted/30 border border-transparent hover:border-border/60 focus:border-primary/50 focus:bg-card focus:outline-none rounded px-1.5 py-0.5 text-xs font-semibold text-foreground transition-all"
                    title="Edit design name"
                  />
                  <p className="text-tiny-10 text-muted-foreground uppercase font-bold tracking-wide mt-0.5 pl-1.5">
                    {img.comments.length} {img.comments.length === 1 ? 'comment' : 'comments'}
                  </p>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveImage(idx, 'up')}
                    disabled={idx === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    title="Move design up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveImage(idx, 'down')}
                    disabled={idx === images.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                    title="Move design down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete design"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add designs */}
        <div className="pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf"
            onChange={handleFileInput}
            className="hidden"
            multiple
          />
          <Button
            variant="secondary"
            size="md"
            className="w-full justify-center gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSaving}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Uploading designs...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-primary" />
                Add More Designs
              </>
            )}
          </Button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSaving || isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isSaving || isUploading}
            loading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

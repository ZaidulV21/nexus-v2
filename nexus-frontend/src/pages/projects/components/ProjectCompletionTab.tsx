import { useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  Lock,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Modal, ModalContent } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import {
  useCreateProjectMedia,
  useDeleteProjectMedia,
  useMarkProjectComplete,
  useProjectMedia,
  useReorderProjectMedia,
  useSetFeaturedProjectMedia,
  useUpdateProjectMedia,
  useUpdateProjectTitle,
} from '@/queries/useProjects';
import { projectService } from '@/services/projectService';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Project, ProjectMedia, ProjectMediaType } from '@/types';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

/** One portfolio item: preview + per-item controls + inline title/alt editing. */
function ProjectMediaCard({
  project,
  item,
  canReorder,
  onReorder,
  onDelete,
  onRefetch,
  busy,
}: {
  project: Project;
  item: ProjectMedia;
  canReorder: boolean;
  onReorder: (item: ProjectMedia, direction: 'up' | 'down') => void;
  onDelete: (item: ProjectMedia) => void;
  onRefetch: () => void;
  busy: boolean;
}) {
  const { toast } = useToast();
  const updateMutation = useUpdateProjectMedia(project.id, item.id);
  const featureMutation = useSetFeaturedProjectMedia(project.id, item.id);
  const [altDraft, setAltDraft] = useState(item.altText ?? '');
  const [captionDraft, setCaptionDraft] = useState(item.caption ?? '');
  const posterInputRef = useRef<HTMLInputElement>(null);
  const imageChangeInputRef = useRef<HTMLInputElement>(null);

  async function saveField(patch: Parameters<typeof updateMutation.mutateAsync>[0]) {
    try {
      await updateMutation.mutateAsync(patch);
    } catch (err) {
      toast({
        title: 'Could not save portfolio item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleToggleFeatured() {
    try {
      await featureMutation.mutateAsync();
      toast({
        title: 'Featured item updated',
        description: 'This item is now the project cover shown on the website.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Could not update featured item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleToggleActive() {
    await saveField({ isActive: !item.isActive });
  }

  async function handlePosterUpload(file: File) {
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'File too large', description: 'Poster images must be 5MB or smaller.', variant: 'danger' });
      return;
    }
    try {
      await projectService.uploadProjectMediaPoster(project.id, item.id, file);
      onRefetch();
      toast({ title: 'Poster updated', description: 'Video poster/cover image saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  if (item.type === 'DOCUMENT') {
    return (
      <div
        className={cn(
          'group overflow-hidden rounded-xl border border-border bg-surface transition-all',
          !item.isActive && 'opacity-70'
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{item.fileName || item.title || 'Document'}</p>
            {item.mimeType && <p className="truncate text-xs text-ink-faint">{item.mimeType}</p>}
            <div className="mt-2 flex items-center gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
              >
                <Download className="h-3 w-3" /> Open
              </a>
              {item.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
              )}
              {!item.isActive && (
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                  Hidden from public site
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canReorder && (
              <>
                <button
                  type="button"
                  onClick={() => onReorder(item, 'up')}
                  disabled={busy}
                  title="Move up"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted transition-colors hover:bg-canvas disabled:opacity-50"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(item, 'down')}
                  disabled={busy}
                  title="Move down"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted transition-colors hover:bg-canvas disabled:opacity-50"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
              title={item.isActive ? 'Hide from public site' : 'Show on public site'}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-ink-muted transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              title="Delete"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/80 text-white transition-colors hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border border-border bg-surface transition-all',
        !item.isActive && 'opacity-70'
      )}
    >
      {/* Preview */}
      <div className="relative aspect-video overflow-hidden bg-canvas">
        {item.type === 'VIDEO' ? (
          <video
            src={item.url}
            poster={item.posterUrl ?? undefined}
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img src={item.url} alt={item.altText || ''} loading="lazy" className="h-full w-full object-cover" />
        )}
        {item.type === 'VIDEO' && (
          <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
            <Clapperboard className="h-3.5 w-3.5" />
          </div>
        )}
        {item.isFeatured && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
            <Star className="h-3 w-3 fill-current" /> Featured
          </div>
        )}
        {!item.isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              Hidden from public site
            </span>
          </div>
        )}

        {/* Action overlay */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-1">
            {canReorder && (
              <>
                <button
                  type="button"
                  onClick={() => onReorder(item, 'up')}
                  disabled={busy}
                  title="Move up"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder(item, 'down')}
                  disabled={busy}
                  title="Move down"
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleToggleFeatured}
              disabled={featureMutation.isPending}
              title={item.isFeatured ? 'Remove featured' : 'Set as featured cover'}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50',
                item.isFeatured
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'bg-white/15 text-white hover:bg-white/30'
              )}
            >
              <Star className={cn('h-4 w-4', item.isFeatured && 'fill-current')} />
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={updateMutation.isPending}
              title={item.isActive ? 'Hide from public site' : 'Show on public site'}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              {item.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onDelete(item)}
            title="Delete"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/80 text-white transition-colors hover:bg-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alt text + caption */}
      <div className="space-y-2 p-3">
        <Input
          value={altDraft}
          placeholder="Alt text (accessibility / SEO)"
          className="h-8 text-xs"
          onChange={(e) => setAltDraft(e.target.value)}
          onBlur={() => {
            if (altDraft.trim() !== (item.altText ?? '')) saveField({ altText: altDraft.trim() });
          }}
        />
        <Input
          value={captionDraft}
          placeholder="Caption"
          className="h-8 text-xs"
          onChange={(e) => setCaptionDraft(e.target.value)}
          onBlur={() => {
            if (captionDraft.trim() !== (item.caption ?? '')) saveField({ caption: captionDraft.trim() });
          }}
        />
        {item.type === 'VIDEO' && (
          <>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePosterUpload(file);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => posterInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> {item.posterUrl ? 'Change' : 'Upload'} poster
            </Button>
          </>
        )}
        {item.type === 'IMAGE' && (
          <>
            <input
              ref={imageChangeInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePosterUpload(file);
              }}
            />
            <Button variant="secondary" size="sm" className="w-full" onClick={() => imageChangeInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Change image
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Mark the project complete + manage its public Portfolio gallery. */
export function ProjectCompletionTab({ project }: { project: Project }) {
  const { toast } = useToast();
  const { data: items = [], isLoading, isError, refetch } = useProjectMedia(project.id);
  const completeMutation = useMarkProjectComplete(project.id);
  const titleMutation = useUpdateProjectTitle(project.id);
  const reorderMutation = useReorderProjectMedia(project.id);
  const createMutation = useCreateProjectMedia(project.id);
  const [titleDraft, setTitleDraft] = useState(project.title ?? '');
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMedia | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState({
    type: 'IMAGE' as ProjectMediaType,
    url: '',
    posterUrl: '',
    altText: '',
    caption: '',
  });
  const [uploading, setUploading] = useState<false | 'image' | 'video' | 'document'>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const deleteMutation = useDeleteProjectMedia(project.id, deleteTarget?.id ?? '');

  const isCompleted = !!project.completedAt;
  const imageCount = items.filter((m) => m.type === 'IMAGE').length;
  const videoCount = items.filter((m) => m.type === 'VIDEO').length;
  const documentCount = items.filter((m) => m.type === 'DOCUMENT').length;

  async function handleFileUpload(file: File) {
    if (uploading) return;
    const isVideo = file.type.startsWith('video/') || file.type === 'application/mp4';
    const isImage = file.type.startsWith('image/');
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      toast({ title: 'File too large', description: 'Videos must be 100MB or smaller.', variant: 'danger' });
      return;
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'File too large', description: 'Images must be 5MB or smaller.', variant: 'danger' });
      return;
    }
    if (!isVideo && !isImage && file.size > MAX_DOCUMENT_SIZE) {
      toast({ title: 'File too large', description: 'Documents must be 20MB or smaller.', variant: 'danger' });
      return;
    }
    setUploading(isVideo ? 'video' : isImage ? 'image' : 'document');
    try {
      await projectService.uploadProjectMedia(project.id, file);
      await refetch();
      toast({
        title: 'Upload complete',
        description: `${isVideo ? 'Video' : isImage ? 'Image' : 'Document'} added to the portfolio.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkComplete() {
    try {
      await completeMutation.mutateAsync();
      toast({
        title: 'Project completed',
        description: 'The project now appears on the public website portfolio.',
        variant: 'success',
      });
      setConfirmComplete(false);
    } catch (err) {
      toast({
        title: 'Could not mark the project complete',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleSaveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      toast({ title: 'Title required', description: 'Enter a title for the project.', variant: 'danger' });
      return;
    }
    try {
      await titleMutation.mutateAsync(trimmed);
      toast({ title: 'Title updated', description: 'The portfolio title was saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not save the title',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleReorder(item: ProjectMedia, direction: 'up' | 'down') {
    const ordered = [...items];
    const index = ordered.findIndex((m) => m.id === item.id);
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[index], ordered[swap]] = [ordered[swap], ordered[index]];
    try {
      await reorderMutation.mutateAsync(ordered.map((m) => m.id));
      toast({ title: 'Order updated', description: 'Portfolio order saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not reorder portfolio',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleAddByUrl() {
    try {
      await createMutation.mutateAsync({
        type: urlDraft.type,
        url: urlDraft.url.trim(),
        posterUrl: urlDraft.posterUrl.trim() || undefined,
        altText: urlDraft.altText.trim() || undefined,
        caption: urlDraft.caption.trim() || undefined,
      });
      toast({ title: 'Item added', description: 'Portfolio item added from URL.', variant: 'success' });
      setUrlModalOpen(false);
      setUrlDraft({ type: 'IMAGE', url: '', posterUrl: '', altText: '', caption: '' });
    } catch (err) {
      toast({
        title: 'Could not add portfolio item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync();
      toast({ title: 'Item removed', description: 'Portfolio item deleted.', variant: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Could not delete portfolio item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Completion status */}
      {isCompleted ? (
        <div className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-sm font-medium text-ink">Project completed</p>
              <p className="text-xs text-ink-muted">
                Completed on {formatDateTime(project.completedAt as string)}. This project is live on the public portfolio.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 shrink-0 text-ink-faint" />
            <div>
              <p className="text-sm font-medium text-ink">Not yet completed</p>
              <p className="text-xs text-ink-muted">
                Mark the project complete once every project service is COMPLETED. Completed projects appear
                automatically on the public website.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setConfirmComplete(true)}>
            <Award className="h-3.5 w-3.5" /> Mark Project as Complete
          </Button>
        </div>
      )}

      {/* Portfolio title */}
      <div className="rounded-lg border border-border p-4">
        <p className="mb-1 text-sm font-medium text-ink">Portfolio title</p>
        <p className="mb-3 text-xs text-ink-muted">
          Shown on the public website. Leave blank to use the client name.
        </p>
        <div className="flex gap-2">
          <Input
            value={titleDraft}
            placeholder={project.client?.companyName || project.client?.contactName || 'Client name'}
            onChange={(e) => setTitleDraft(e.target.value)}
          />
          <Button
            size="sm"
            loading={titleMutation.isPending}
            disabled={titleDraft.trim() === (project.title ?? '')}
            onClick={handleSaveTitle}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Media management */}
      {!isCompleted ? (
        <div className="rounded-lg border border-dashed border-border p-6">
          <EmptyState
            title="Completion media unlock after completion"
            description="Mark the project as complete first, then upload completion images, videos and documents for the public portfolio."
          />
        </div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ink-muted">
                {isLoading ? (
                  'Loading portfolio…'
                ) : (
                  <>
                    <span className="font-medium text-ink">{imageCount}</span> image{imageCount === 1 ? '' : 's'} ·{' '}
                    <span className="font-medium text-ink">{videoCount}</span> video{videoCount === 1 ? '' : 's'} ·{' '}
                    <span className="font-medium text-ink">{documentCount}</span> document
                    {documentCount === 1 ? '' : 's'}
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Completion showcase on the public website, independent from the service marketing gallery.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,application/mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <Button size="sm" loading={uploading === 'image'} onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="h-3.5 w-3.5" /> Image
              </Button>
              <Button size="sm" variant="secondary" loading={uploading === 'video'} onClick={() => videoInputRef.current?.click()}>
                <Clapperboard className="h-3.5 w-3.5" /> Video
              </Button>
              <Button size="sm" variant="secondary" loading={uploading === 'document'} onClick={() => documentInputRef.current?.click()}>
                <FileText className="h-3.5 w-3.5" /> Document
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setUrlModalOpen(true)}>
                <LinkIcon className="h-3.5 w-3.5" /> From URL
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              title="Couldn't load the portfolio"
              description="Something went wrong while loading this project's completion media."
              actionLabel="Retry"
              onAction={refetch}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="No completion media yet"
              description="Upload images, videos and documents to showcase the finished project. They'll appear on the public website."
              actionLabel="Upload an image"
              onAction={() => imageInputRef.current?.click()}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <ProjectMediaCard
                  key={item.id}
                  project={project}
                  item={item}
                  canReorder={items.length > 1}
                  onReorder={handleReorder}
                  onDelete={setDeleteTarget}
                  onRefetch={refetch}
                  busy={reorderMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mark complete confirm */}
      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={(open) => {
          if (!open) setConfirmComplete(false);
        }}
        title="Mark this project as complete?"
        description="All non-cancelled project services must already be COMPLETED. The project will appear on the public website's portfolio, and you can then upload completion images, videos and documents."
        confirmLabel="Mark Complete"
        loading={completeMutation.isPending}
        onConfirm={handleMarkComplete}
      />

      {/* Add from URL */}
      <Modal open={urlModalOpen} onOpenChange={setUrlModalOpen}>
        <ModalContent
          title="Add portfolio item from URL"
          description="Useful for hosted videos (YouTube, Vimeo, CDN files) or external document links."
        >
          <div className="space-y-4">
            <FormField label="Type">
              <Select
                value={urlDraft.type}
                onValueChange={(value) => setUrlDraft((d) => ({ ...d, type: value as ProjectMediaType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="URL">
              <Input
                value={urlDraft.url}
                placeholder="https://example.com/file"
                onChange={(e) => setUrlDraft((d) => ({ ...d, url: e.target.value }))}
              />
            </FormField>
            {urlDraft.type === 'VIDEO' && (
              <FormField label="Poster / cover URL (optional)">
                <Input
                  value={urlDraft.posterUrl}
                  placeholder="https://example.com/poster.jpg"
                  onChange={(e) => setUrlDraft((d) => ({ ...d, posterUrl: e.target.value }))}
                />
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Alt text">
                <Input value={urlDraft.altText} onChange={(e) => setUrlDraft((d) => ({ ...d, altText: e.target.value }))} />
              </FormField>
              <FormField label="Caption">
                <Input value={urlDraft.caption} onChange={(e) => setUrlDraft((d) => ({ ...d, caption: e.target.value }))} />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setUrlModalOpen(false)}>
                Cancel
              </Button>
              <Button loading={createMutation.isPending} disabled={!urlDraft.url.trim()} onClick={handleAddByUrl}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove this portfolio item?"
        description="This permanently removes the item from the project portfolio. The uploaded file stays on storage but is no longer displayed."
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

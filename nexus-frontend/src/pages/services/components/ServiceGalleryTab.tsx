import { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Eye,
  EyeOff,
  ImageIcon,
  Link as LinkIcon,
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
  useServiceMedia,
  useUpdateServiceMedia,
  useSetFeaturedServiceMedia,
  useReorderServiceMedia,
  useDeleteServiceMedia,
  useCreateServiceMedia,
} from '@/queries/useServices';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { ApiError } from '@/lib/api';
import type { Service, ServiceMedia, ServiceMediaType } from '@/types';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/** One gallery item: preview + per-item controls + inline alt/caption editing. */
function GalleryItemCard({
  serviceRef,
  item,
  canReorder,
  onReorder,
  onDelete,
  onRefetch,
  onPreview,
  busy,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  serviceRef: string;
  item: ServiceMedia;
  canReorder: boolean;
  onReorder: (item: ServiceMedia, direction: 'up' | 'down') => void;
  onDelete: (item: ServiceMedia) => void;
  onRefetch: () => void;
  onPreview: (item: ServiceMedia) => void;
  busy: boolean;
  dragging?: boolean;
  dropTarget?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const { toast } = useToast();
  const updateMutation = useUpdateServiceMedia(serviceRef, item.id);
  const featureMutation = useSetFeaturedServiceMedia(serviceRef, item.id);
  const [altDraft, setAltDraft] = useState(item.altText ?? '');
  const [captionDraft, setCaptionDraft] = useState(item.caption ?? '');
  const posterInputRef = useRef<HTMLInputElement>(null);

  async function saveField(patch: Parameters<typeof updateMutation.mutateAsync>[0]) {
    try {
      await updateMutation.mutateAsync(patch);
    } catch (err) {
      toast({
        title: 'Could not save gallery item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleToggleFeatured() {
    try {
      await featureMutation.mutateAsync();
      toast({ title: 'Featured item updated', description: 'This item is now the showcase highlight.', variant: 'success' });
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
      await serviceCatalogService.uploadServiceMediaPoster(serviceRef, item.id, file);
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

  return (
    <div
      draggable={canReorder}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group overflow-hidden rounded-xl border border-border bg-surface transition-all',
        !item.isActive && 'opacity-70',
        dragging && 'opacity-40 ring-2 ring-accent',
        dropTarget && 'border-accent ring-2 ring-accent/40'
      )}
    >
      {/* Preview */}
      <div
        className="relative aspect-video cursor-zoom-in overflow-hidden bg-canvas"
        onClick={() => onPreview(item)}
        title="Click to preview"
      >
        {item.type === 'VIDEO' ? (
          <video
            src={item.url}
            poster={item.posterUrl ?? undefined}
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img src={item.url} alt={item.altText || ''} className="h-full w-full object-cover" />
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
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
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
              title={item.isFeatured ? 'Remove featured' : 'Set as featured'}
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
      </div>
    </div>
  );
}

/** Manage the Service's marketing gallery (images + videos, unlimited). */
export function ServiceGalleryTab({ service }: { service: Service }) {
  const serviceRef = service.id;
  const { toast } = useToast();
  const { data: items = [], isLoading, isError, refetch } = useServiceMedia(serviceRef);
  const reorderMutation = useReorderServiceMedia(serviceRef);
  const createMutation = useCreateServiceMedia(serviceRef);
  const [deleteTarget, setDeleteTarget] = useState<ServiceMedia | null>(null);
  const [previewItem, setPreviewItem] = useState<ServiceMedia | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState({ type: 'IMAGE' as ServiceMediaType, url: '', posterUrl: '', altText: '', caption: '' });
  const [uploading, setUploading] = useState<false | 'image' | 'video'>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const deleteMutation = useDeleteServiceMedia(serviceRef, deleteTarget?.id ?? '');

  const imageCount = items.filter((m) => m.type === 'IMAGE').length;
  const videoCount = items.filter((m) => m.type === 'VIDEO').length;

  async function handleFileUpload(file: File) {
    if (uploading) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      toast({ title: 'File too large', description: 'Videos must be 100MB or smaller.', variant: 'danger' });
      return;
    }
    if (!isVideo && file.size > MAX_IMAGE_SIZE) {
      toast({ title: 'File too large', description: 'Images must be 5MB or smaller.', variant: 'danger' });
      return;
    }
    setUploading(isVideo ? 'video' : 'image');
    try {
      await serviceCatalogService.uploadServiceMedia(serviceRef, file);
      await refetch();
      toast({ title: 'Upload complete', description: `${isVideo ? 'Video' : 'Image'} added to the gallery.`, variant: 'success' });
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

  async function handleReorder(item: ServiceMedia, direction: 'up' | 'down') {
    const ordered = [...items];
    const index = ordered.findIndex((m) => m.id === item.id);
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[index], ordered[swap]] = [ordered[swap], ordered[index]];
    try {
      await reorderMutation.mutateAsync(ordered.map((m) => m.id));
      toast({ title: 'Order updated', description: 'Gallery order saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not reorder gallery',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleDragDrop() {
    if (dragIndex == null || overIndex == null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const ordered = [...items];
    const [moved] = ordered.splice(dragIndex, 1);
    ordered.splice(overIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    try {
      await reorderMutation.mutateAsync(ordered.map((m) => m.id));
      toast({ title: 'Order updated', description: 'Gallery order saved.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not reorder gallery',
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
      toast({ title: 'Item added', description: 'Gallery item added from URL.', variant: 'success' });
      setUrlModalOpen(false);
      setUrlDraft({ type: 'IMAGE', url: '', posterUrl: '', altText: '', caption: '' });
    } catch (err) {
      toast({
        title: 'Could not add gallery item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync();
      toast({ title: 'Item removed', description: 'Gallery item deleted.', variant: 'success' });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Could not delete gallery item',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            {isLoading ? (
              'Loading gallery…'
            ) : (
              <>
                <span className="font-medium text-ink">{imageCount}</span> image{imageCount === 1 ? '' : 's'} ·{' '}
                <span className="font-medium text-ink">{videoCount}</span> video{videoCount === 1 ? '' : 's'}
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            Website showcase, independent from project photos. Drag cards to reorder, or use the arrow buttons. Click a card to preview it.
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
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" loading={uploading === 'image'} onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-3.5 w-3.5" /> Upload Image
          </Button>
          <Button size="sm" variant="secondary" loading={uploading === 'video'} onClick={() => videoInputRef.current?.click()}>
            <Clapperboard className="h-3.5 w-3.5" /> Upload Video
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setUrlModalOpen(true)}>
            <LinkIcon className="h-3.5 w-3.5" /> Add from URL
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
          title="Couldn't load the gallery"
          description="Something went wrong while loading this service's gallery."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No gallery items yet"
          description="Upload images and videos to showcase this service on the website. They'll appear in the service's Gallery section."
          actionLabel="Upload an image"
          onAction={() => imageInputRef.current?.click()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, index) => (
            <GalleryItemCard
              key={item.id}
              serviceRef={serviceRef}
              item={item}
              canReorder={items.length > 1}
              onReorder={handleReorder}
              onDelete={setDeleteTarget}
              onRefetch={refetch}
              onPreview={setPreviewItem}
              busy={reorderMutation.isPending}
              dragging={dragIndex === index}
              dropTarget={overIndex === index && dragIndex !== index}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => setOverIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Add from URL */}
      <Modal open={urlModalOpen} onOpenChange={setUrlModalOpen}>
        <ModalContent
          title="Add gallery item from URL"
          description="Useful for hosted videos (YouTube, Vimeo, CDN files)."
        >
          <div className="space-y-4">
            <FormField label="Type">
              <Select
                value={urlDraft.type}
                onValueChange={(value) => setUrlDraft((d) => ({ ...d, type: value as ServiceMediaType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="URL">
              <Input
                value={urlDraft.url}
                placeholder={urlDraft.type === 'VIDEO' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg'}
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
              <Button
                loading={createMutation.isPending}
                disabled={!urlDraft.url.trim()}
                onClick={handleAddByUrl}
              >
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
        title="Remove this gallery item?"
        description="This permanently removes the item from the service gallery. The uploaded file stays on storage but is no longer displayed."
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      {/* Preview modal */}
      <Modal open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <ModalContent
          title={previewItem?.caption || (previewItem?.type === 'VIDEO' ? 'Video preview' : 'Image preview')}
          description={previewItem?.altText || 'Preview of this gallery item.'}
          className="max-w-3xl"
        >
          {previewItem && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border bg-canvas">
                {previewItem.type === 'VIDEO' ? (
                  <video
                    src={previewItem.url}
                    poster={previewItem.posterUrl ?? undefined}
                    controls
                    autoPlay
                    className="max-h-[60vh] w-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={previewItem.url}
                    alt={previewItem.altText || ''}
                    className="max-h-[60vh] w-full bg-black object-contain"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-faint">{previewItem.url}</span>
                <div className="flex items-center gap-2">
                  {previewItem.isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                      <Star className="h-3 w-3" /> Featured
                    </span>
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      previewItem.isActive ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
                    )}
                  >
                    {previewItem.isActive ? (
                      <>
                        <Eye className="h-3 w-3" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Hidden
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

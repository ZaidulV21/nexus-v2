import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, ImageOff, Upload } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { useCreateSubService, useUpdateSubService } from '@/queries/useServices';
import { serviceCatalogService, type CreateSubServiceInput } from '@/services/serviceCatalogService';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import { slugify } from '@/lib/utils';
import { normalizeRichText } from '@/lib/richText';
import { SERVICE_ICON_OPTIONS, ServiceIcon } from '@/components/common/ServiceIcon';
import { StringListEditor, ProcessEditor, FaqEditor } from './contentEditors';
import type { SubService, SubServiceFaq, SubServiceProcessStep, PublicationState } from '@/types';

const subServiceFormSchema = z.object({
  name: z.string().min(1, 'Sub-service name is required').max(120, 'Keep the name under 120 characters'),
  slug: z
    .string()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50).optional(),
  shortDescription: z.string().max(300, 'Keep the short description under 300 characters').optional(),
  description: z.string().optional(),
  startingPrice: z.string().max(120).optional(),
  completionTime: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  publicationState: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  sortOrder: z.string().optional(),
  seoTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  metaKeywords: z.string().max(300).optional(),
  canonicalUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  structuredData: z.string().optional(),
});

type SubServiceFormValues = z.infer<typeof subServiceFormSchema>;

const PUBLICATION_OPTIONS: Array<{ value: PublicationState; label: string }> = [
  { value: 'PUBLISHED', label: 'Published (visible on website)' },
  { value: 'DRAFT', label: 'Draft (hidden until published)' },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function toFormValues(sub?: SubService): SubServiceFormValues {
  return {
    name: sub?.name ?? '',
    slug: sub?.slug ?? '',
    icon: sub?.icon ?? '',
    shortDescription: sub?.shortDescription ?? '',
    description: sub?.description ?? '',
    startingPrice: sub?.startingPrice ?? '',
    completionTime: sub?.completionTime ?? '',
    isActive: sub?.isActive ?? true,
    publicationState: sub?.publicationState ?? 'PUBLISHED',
    sortOrder: sub?.sortOrder != null ? String(sub.sortOrder) : '0',
    seoTitle: sub?.seoTitle ?? '',
    metaDescription: sub?.metaDescription ?? '',
    metaKeywords: sub?.metaKeywords ?? '',
    canonicalUrl: sub?.canonicalUrl ?? '',
    structuredData: sub?.structuredData ? JSON.stringify(sub.structuredData, null, 2) : '',
  };
}

interface ImageSlotState {
  file: File | null;
  removed: boolean;
}

interface GalleryEntry {
  url: string;
  /** Uploaded in this session; persisted right after save. */
  pendingFile?: File;
}

/** Upload/remove control for the hero and OG image slots. */
function ImageSlotField({
  label,
  hint,
  state,
  preview,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  state: ImageSlotState;
  preview: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = state.removed ? null : state.file ? preview : preview;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onFile(file);
        }}
      />
      {existing ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={existing} alt={label} className="h-24 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              onClear();
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            aria-label={`Remove ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          <ImageOff className="h-4 w-4" />
          {state.removed ? 'Removed — click to restore' : 'Click to upload'}
        </button>
      )}
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export function SubServiceFormDrawer({
  open,
  onOpenChange,
  serviceRef,
  subService,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent service UUID. */
  serviceRef: string;
  /** When set, the drawer edits this sub-service; otherwise it creates a new one. */
  subService?: SubService;
  onSaved?: (subId: string) => void;
}) {
  const isEdit = !!subService;
  const createSubService = useCreateSubService(serviceRef);
  const updateSubService = useUpdateSubService(serviceRef, subService?.id ?? '');
  const { toast } = useToast();

  const [gallery, setGallery] = useState<GalleryEntry[]>([]);
  const [galleryUrlDraft, setGalleryUrlDraft] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([]);
  const [process, setProcess] = useState<SubServiceProcessStep[]>([]);
  const [faqs, setFaqs] = useState<SubServiceFaq[]>([]);
  const [heroState, setHeroState] = useState<ImageSlotState>({ file: null, removed: false });
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [ogState, setOgState] = useState<ImageSlotState>({ file: null, removed: false });
  const [ogPreview, setOgPreview] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubServiceFormValues>({
    resolver: zodResolver(subServiceFormSchema),
    defaultValues: toFormValues(subService),
  });

  const watchedName = watch('name');
  const watchedIcon = watch('icon');

  // Auto-generate the slug from the name until the admin edits it manually.
  useEffect(() => {
    if (!open || isEdit) return;
    if (!slugTouched && watchedName) {
      setValue('slug', slugify(watchedName), { shouldValidate: false });
    }
  }, [watchedName, slugTouched, isEdit, open, setValue]);

  useEffect(() => {
    if (open) {
      reset(toFormValues(subService));
      setGallery((subService?.gallery ?? []).map((url) => ({ url })));
      setFeatures(subService?.features ?? []);
      setWhatsIncluded(subService?.whatsIncluded ?? []);
      setProcess(subService?.process ?? []);
      setFaqs(subService?.faqs ?? []);
      setHeroState({ file: null, removed: false });
      setHeroPreview(subService?.heroImage ?? null);
      setOgState({ file: null, removed: false });
      setOgPreview(subService?.ogImage ?? null);
      setGalleryUrlDraft('');
      setSlugTouched(false);
    }
  }, [open, subService, reset]);

  function handleGalleryFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 5MB.', variant: 'danger' });
      return;
    }
    setGallery((prev) => [...prev, { url: '', pendingFile: file }]);
  }

  async function processImages(savedId: string) {
    const failures: string[] = [];

    if (heroState.file) {
      try {
        await serviceCatalogService.uploadSubServiceImage(serviceRef, savedId, heroState.file, 'heroImage');
      } catch {
        failures.push('hero image');
      }
    } else if (heroState.removed && subService?.heroImage) {
      try {
        await serviceCatalogService.removeSubServiceImage(serviceRef, savedId, 'heroImage');
      } catch {
        failures.push('hero image');
      }
    }

    if (ogState.file) {
      try {
        await serviceCatalogService.uploadSubServiceImage(serviceRef, savedId, ogState.file, 'ogImage');
      } catch {
        failures.push('OG image');
      }
    } else if (ogState.removed && subService?.ogImage) {
      try {
        await serviceCatalogService.removeSubServiceImage(serviceRef, savedId, 'ogImage');
      } catch {
        failures.push('OG image');
      }
    }

    const pending = gallery.filter((entry) => entry.pendingFile);
    for (const entry of pending) {
      try {
        await serviceCatalogService.uploadSubServiceImage(serviceRef, savedId, entry.pendingFile!, 'gallery');
      } catch {
        failures.push('a gallery image');
      }
    }

    if (failures.length > 0) {
      toast({
        title: 'Sub-service saved but some images failed',
        description: `Retry: ${failures.join(', ')} from the sub-service editor.`,
        variant: 'warning',
      });
    }
  }

  async function onSubmit(values: SubServiceFormValues) {
    const sortOrder = values.sortOrder?.trim() ? Number(values.sortOrder) : undefined;
    if (sortOrder !== undefined && (Number.isNaN(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0)) {
      toast({ title: 'Invalid sort order', description: 'Enter a whole number (0 or higher).', variant: 'danger' });
      return;
    }

    // Optional custom schema.org JSON-LD (object or @graph array).
    let structuredData: Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const rawStructuredData = values.structuredData?.trim();
    if (rawStructuredData) {
      try {
        const parsed = JSON.parse(rawStructuredData);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          structuredData = parsed as Record<string, unknown>;
        } else if (Array.isArray(parsed)) {
          structuredData = parsed as Array<Record<string, unknown>>;
        } else {
          toast({ title: 'Invalid structured data', description: 'Enter a JSON object or array.', variant: 'danger' });
          return;
        }
      } catch {
        toast({ title: 'Invalid structured data', description: 'Enter valid JSON (e.g. { "@type": "Service" }).', variant: 'danger' });
        return;
      }
    }

    const description = normalizeRichText(values.description ?? '');
    const galleryUrls = gallery.map((entry) => entry.url).filter(Boolean);
    const processClean = process.filter((step) => step.title.trim() && step.description.trim());

    const payload: CreateSubServiceInput = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      icon: values.icon?.trim() || undefined,
      shortDescription: values.shortDescription?.trim() || undefined,
      description: description || undefined,
      startingPrice: values.startingPrice?.trim() || undefined,
      completionTime: values.completionTime?.trim() || undefined,
      sortOrder,
      gallery: galleryUrls,
      features: features.map((f) => f.trim()).filter(Boolean),
      whatsIncluded: whatsIncluded.map((w) => w.trim()).filter(Boolean),
      process: processClean,
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      seoTitle: values.seoTitle?.trim() || undefined,
      metaDescription: values.metaDescription?.trim() || undefined,
      metaKeywords: values.metaKeywords?.trim() || undefined,
      canonicalUrl: values.canonicalUrl?.trim() || undefined,
      structuredData,
    };
    if (isEdit) (payload as { isActive?: boolean }).isActive = values.isActive;
    // Publication state is set at creation time (header buttons manage it
    // afterwards through the timeline/audit-aware endpoints).
    if (!isEdit && values.publicationState) {
      (payload as { publicationState?: PublicationState }).publicationState = values.publicationState;
    }

    try {
      const saved = isEdit
        ? await updateSubService.mutateAsync(payload)
        : await createSubService.mutateAsync(payload);
      await processImages(saved.id);

      toast({
        title: isEdit ? 'Sub-service updated' : 'Sub-service created',
        description: `"${saved.name}" ${isEdit ? 'saved' : 'added under this service'}.`,
        variant: 'success',
      });
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (err) {
      toast({
        title: isEdit ? 'Could not update sub-service' : 'Could not create sub-service',
        description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        variant: 'danger',
      });
    }
  }

  const isArchived = !!subService?.archivedAt;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-w-3xl"
        title={isEdit ? `Edit ${subService?.name}` : 'New Sub Service'}
        description={
          isEdit
            ? 'Changes apply to the public page at /services/<service>/<slug>.'
            : 'Add an option under this service. Each sub-service gets its own SEO URL and detail page.'
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col" noValidate>
          <Tabs defaultValue="basic">
            <TabsList className="mb-6 w-full justify-start overflow-x-auto">
              <TabsTrigger value="basic">Details</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="display">Display</TabsTrigger>
            </TabsList>

            {/* ── Details ──────────────────────────────────────────── */}
            <TabsContent value="basic" className="space-y-7">
              <section className="space-y-4">
                <FormField label="Name" htmlFor="sub-name" required error={errors.name?.message}>
                  <Input id="sub-name" placeholder="False Ceiling" error={!!errors.name} {...register('name')} />
                </FormField>

                <FormField
                  label="Slug"
                  htmlFor="sub-slug"
                  hint="URL: /services/<service-slug>/<slug>. Auto-generated from the name until you edit it."
                  error={errors.slug?.message}
                >
                  <Input
                    id="sub-slug"
                    placeholder="false-ceiling"
                    error={!!errors.slug}
                    disabled={isEdit && !subService?.slug}
                    {...register('slug', {
                      onChange: () => setSlugTouched(true),
                    })}
                  />
                </FormField>

                <FormField label="Icon" htmlFor="sub-icon" hint="Shown in the sub-service navigation.">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                      <ServiceIcon name={watchedIcon || undefined} className="h-5 w-5" />
                    </div>
                    <Controller
                      control={control}
                      name="icon"
                      render={({ field }) => (
                        <Select value={field.value || 'NONE'} onValueChange={(v) => field.onChange(v === 'NONE' ? '' : v)}>
                          <SelectTrigger id="sub-icon" className="flex-1">
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            <SelectItem value="NONE">No icon</SelectItem>
                            {SERVICE_ICON_OPTIONS.map((name) => (
                              <SelectItem key={name} value={name}>
                                <span className="flex items-center gap-2">
                                  <ServiceIcon name={name} className="h-4 w-4 text-accent" />
                                  {name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Short description"
                  htmlFor="sub-shortDescription"
                  hint="Nav card copy. Max 300 characters."
                  error={errors.shortDescription?.message}
                >
                  <Textarea
                    id="sub-shortDescription"
                    rows={2}
                    placeholder="Compact summary shown in the sub-service navigation."
                    error={!!errors.shortDescription}
                    {...register('shortDescription')}
                  />
                </FormField>

                <FormField
                  label="Description"
                  hint="Rich text for the public detail page. Use headings, lists, and links."
                >
                  <Controller
                    control={control}
                    name="description"
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Everything this option covers."
                      />
                    )}
                  />
                </FormField>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Pricing & Delivery</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Starting price" htmlFor="sub-startingPrice" hint="e.g. ₹95 / sq ft">
                    <Input id="sub-startingPrice" placeholder="₹95 / sq ft" {...register('startingPrice')} />
                  </FormField>
                  <FormField label="Completion time" htmlFor="sub-completionTime" hint="e.g. 1–3 weeks">
                    <Input id="sub-completionTime" placeholder="1–3 weeks depending on area" {...register('completionTime')} />
                  </FormField>
                </div>
              </section>
            </TabsContent>

            {/* ── Content ──────────────────────────────────────────── */}
            <TabsContent value="content" className="space-y-5">
              <StringListEditor
                label="Key features"
                values={features}
                onChange={setFeatures}
                placeholder="e.g. Cove lighting integration"
              />
              <StringListEditor
                label="What's included"
                values={whatsIncluded}
                onChange={setWhatsIncluded}
                placeholder="e.g. Quality inspection before handover"
              />
              <ProcessEditor values={process} onChange={setProcess} />
              <FaqEditor values={faqs} onChange={setFaqs} />
              <p className="text-xs text-ink-muted">
                These blocks power the public detail page. Sections stay hidden on the website until they have
                content.
              </p>
            </TabsContent>

            {/* ── Media ────────────────────────────────────────────── */}
            <TabsContent value="media" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageSlotField
                  label="Hero image"
                  hint="Large hero on the public detail page."
                  state={heroState}
                  preview={heroPreview}
                  onFile={(file) => {
                    setHeroState({ file, removed: false });
                    setHeroPreview(URL.createObjectURL(file));
                  }}
                  onClear={() => {
                    setHeroState({ file: null, removed: true });
                    setHeroPreview(null);
                  }}
                />
                <ImageSlotField
                  label="OG image"
                  hint="Social sharing preview (1200×630)."
                  state={ogState}
                  preview={ogPreview}
                  onFile={(file) => {
                    setOgState({ file, removed: false });
                    setOgPreview(URL.createObjectURL(file));
                  }}
                  onClear={() => {
                    setOgState({ file: null, removed: true });
                    setOgPreview(null);
                  }}
                />
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Gallery</p>
                <div className="flex flex-wrap gap-2">
                  {gallery.map((entry, index) =>
                    entry.pendingFile ? (
                      <div key={index} className="relative overflow-hidden rounded-xl border border-dashed border-accent/50">
                        <img src={URL.createObjectURL(entry.pendingFile)} alt="New gallery image" className="h-20 w-28 object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white">
                          Upload on save
                        </span>
                        <button
                          type="button"
                          onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600"
                          aria-label="Remove pending gallery image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div key={index} className="relative overflow-hidden rounded-xl border border-border">
                        <img src={entry.url} alt="Gallery image" className="h-20 w-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => setGallery(gallery.filter((_, i) => i !== index))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600"
                          aria-label="Remove gallery image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={galleryUrlDraft}
                    placeholder="Paste an image URL, or upload a file"
                    className="min-w-[220px] flex-1"
                    onChange={(e) => setGalleryUrlDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (galleryUrlDraft.trim()) {
                          setGallery((prev) => [...prev, { url: galleryUrlDraft.trim() }]);
                          setGalleryUrlDraft('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (galleryUrlDraft.trim()) {
                        setGallery((prev) => [...prev, { url: galleryUrlDraft.trim() }]);
                        setGalleryUrlDraft('');
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add URL
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleGalleryFile(file);
                    }}
                  />
                </div>
                <p className="text-xs text-ink-muted">
                  Uploads are stored after you save. You can add as many images as you like.
                </p>
              </div>
            </TabsContent>

            {/* ── SEO ──────────────────────────────────────────────── */}
            <TabsContent value="seo" className="space-y-4">
              <FormField label="Meta title" htmlFor="sub-seoTitle" hint="Max 160 characters." error={errors.seoTitle?.message}>
                <Input id="sub-seoTitle" placeholder="False Ceiling Services | Company Name" {...register('seoTitle')} />
              </FormField>

              <FormField
                label="Meta description"
                htmlFor="sub-metaDescription"
                hint="Max 300 characters."
                error={errors.metaDescription?.message}
              >
                <Textarea
                  id="sub-metaDescription"
                  rows={2}
                  placeholder="A short summary shown under the page title in search results."
                  {...register('metaDescription')}
                />
              </FormField>

              <FormField
                label="Keywords"
                htmlFor="sub-metaKeywords"
                hint="Comma-separated. Max 300 characters."
                error={errors.metaKeywords?.message}
              >
                <Input
                  id="sub-metaKeywords"
                  placeholder="false ceiling, pop ceiling, gypsum, lighting"
                  {...register('metaKeywords')}
                />
              </FormField>

              <FormField label="Canonical URL" htmlFor="sub-canonicalUrl" error={errors.canonicalUrl?.message}>
                <Input
                  id="sub-canonicalUrl"
                  placeholder="https://example.com/services/interior-design/false-ceiling"
                  {...register('canonicalUrl')}
                />
              </FormField>

              <FormField
                label="Structured data (JSON-LD)"
                htmlFor="sub-structuredData"
                hint="Optional custom schema.org JSON-LD. Leave empty to auto-generate from this sub-service. Must be valid JSON (object or array)."
              >
                <Textarea
                  id="sub-structuredData"
                  rows={6}
                  className="font-mono text-xs"
                  placeholder={'{\n  "@type": "Service",\n  "serviceType": "False Ceiling"\n}'}
                  {...register('structuredData')}
                />
              </FormField>
            </TabsContent>

            {/* ── Display ──────────────────────────────────────────── */}
            <TabsContent value="display" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Sort order" htmlFor="sub-sortOrder" hint="Lower numbers appear first.">
                  <Input id="sub-sortOrder" type="number" min="0" step="1" placeholder="0" {...register('sortOrder')} />
                </FormField>
                {isEdit && (
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-ink">Active</p>
                          <p className="text-xs text-ink-muted">Shown on the public website</p>
                        </div>
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={isArchived} />
                      </div>
                    )}
                  />
                )}
              </div>

              {!isEdit && (
                <FormField
                  label="Publication state"
                  htmlFor="sub-publication"
                  hint="Published sub-services are live on the website. Draft keeps this hidden until you publish it."
                >
                  <Controller
                    control={control}
                    name="publicationState"
                    render={({ field }) => (
                      <Select value={field.value ?? 'PUBLISHED'} onValueChange={field.onChange}>
                        <SelectTrigger id="sub-publication">
                          <SelectValue placeholder="Publication state" />
                        </SelectTrigger>
                        <SelectContent>
                          {PUBLICATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-7 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create sub-service'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

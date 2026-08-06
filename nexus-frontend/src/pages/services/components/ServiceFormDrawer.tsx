import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ImageOff } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategoryTree, useCreateService, useUpdateService } from '@/queries/useServices';
import {
  serviceCatalogService,
  SERVICE_IMAGE_FIELDS,
  type ServiceImageField,
  type CreateServiceInput,
} from '@/services/serviceCatalogService';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import { slugify } from '@/lib/utils';
import { SERVICE_ICON_OPTIONS, ServiceIcon } from '@/components/common/ServiceIcon';
import type { Category, Service } from '@/types';

const IMAGE_FIELD_META: Record<ServiceImageField, { label: string; hint: string }> = {
  imageUrl: { label: 'Service image', hint: 'Card thumbnail on the website' },
  bannerImage: { label: 'Banner image', hint: 'Wide banner for page headers' },
  thumbnail: { label: 'Thumbnail', hint: 'Small square preview' },
  heroImage: { label: 'Hero image', hint: 'Large hero on the detail page' },
  ogImage: { label: 'OG image', hint: 'Social sharing preview (1200×630)' },
};

const serviceFormSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(120, 'Keep the name under 120 characters'),
  slug: z
    .string()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().min(1, 'Select a category'),
  icon: z.string().max(50).optional(),
  shortDescription: z.string().max(300, 'Keep the short description under 300 characters').optional(),
  description: z.string().optional(),
  basePrice: z.string().optional(),
  estimatedDuration: z.string().max(120).optional(),
  requiresSiteVisit: z.enum(['YES', 'NO', 'OPTIONAL']),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.string().optional(),
  seoTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
  metaKeywords: z.string().max(300).optional(),
  canonicalUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const SITE_VISIT_OPTIONS = [
  { value: 'OPTIONAL', label: 'Optional (admin decides per lead)' },
  { value: 'YES', label: 'Always required' },
  { value: 'NO', label: 'Never required' },
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** Flattens the category tree into indent-labelled options so nested
 *  categories stay readable inside a flat Select. */
function flattenCategories(categories: Category[], depth = 0): Array<{ id: string; label: string }> {
  return categories.flatMap((cat) => [
    { id: cat.id, label: `${'  '.repeat(depth)}${cat.name}` },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

function toFormValues(service?: Service): ServiceFormValues {
  return {
    name: service?.name ?? '',
    slug: service?.slug ?? '',
    categoryId: service?.categoryId ?? '',
    icon: service?.icon ?? '',
    shortDescription: service?.shortDescription ?? '',
    description: service?.description ?? '',
    basePrice: service?.basePrice != null ? String(Number(service.basePrice)) : '',
    estimatedDuration: service?.estimatedDuration ?? '',
    requiresSiteVisit: service?.requiresSiteVisit ?? 'OPTIONAL',
    isFeatured: service?.isFeatured ?? false,
    isPopular: service?.isPopular ?? false,
    isActive: service?.isActive ?? true,
    sortOrder: service?.sortOrder != null ? String(service.sortOrder) : '0',
    seoTitle: service?.seoTitle ?? '',
    metaDescription: service?.metaDescription ?? '',
    metaKeywords: service?.metaKeywords ?? '',
    canonicalUrl: service?.canonicalUrl ?? '',
  };
}

interface ImageSlotState {
  file: File | null;
  removed: boolean;
}

function initialImageState(): Record<ServiceImageField, ImageSlotState> {
  return SERVICE_IMAGE_FIELDS.reduce(
    (acc, field) => {
      acc[field] = { file: null, removed: false };
      return acc;
    },
    {} as Record<ServiceImageField, ImageSlotState>,
  );
}

function currentImageValue(service: Service | undefined, field: ServiceImageField): string | null | undefined {
  return service?.[field];
}

/** Upload/remove control for a single CMS image slot. */
function ImageSlotField({
  field,
  service,
  state,
  previews,
  onFile,
  onClear,
}: {
  field: ServiceImageField;
  service?: Service;
  state: ImageSlotState;
  previews: Record<ServiceImageField, string | null>;
  onFile: (field: ServiceImageField, file: File) => void;
  onClear: (field: ServiceImageField) => void;
}) {
  const meta = IMAGE_FIELD_META[field];
  const inputRef = useRef<HTMLInputElement>(null);
  const existing = currentImageValue(service, field);
  const preview = state.file ? previews[field] : state.removed ? null : existing ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-ink">{meta.label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > MAX_FILE_SIZE) {
            onClear(field);
            return;
          }
          onFile(field, file);
        }}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={preview} alt={meta.label} className="h-24 w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              onClear(field);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            aria-label={`Remove ${meta.label}`}
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
      <p className="text-xs text-ink-muted">{meta.hint}</p>
    </div>
  );
}

export function ServiceFormDrawer({
  open,
  onOpenChange,
  service,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the drawer edits this service; otherwise it creates a new one. */
  service?: Service;
  onSaved?: (serviceId: string) => void;
}) {
  const isEdit = !!service;
  const { data: categories, isLoading: categoriesLoading } = useCategoryTree();
  const createService = useCreateService();
  const updateService = useUpdateService(service?.id ?? '');
  const { toast } = useToast();

  const [imageState, setImageState] = useState<Record<ServiceImageField, ImageSlotState>>(
    initialImageState(),
  );
  const [previews, setPreviews] = useState<Record<ServiceImageField, string | null>>(
    SERVICE_IMAGE_FIELDS.reduce(
      (acc, field) => {
        acc[field] = currentImageValue(service, field) ?? null;
        return acc;
      },
      {} as Record<ServiceImageField, string | null>,
    ),
  );
  const [slugTouched, setSlugTouched] = useState(false);

  const categoryOptions = useMemo(() => flattenCategories(categories ?? []), [categories]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toFormValues(service),
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
      reset(toFormValues(service));
      setImageState(initialImageState());
      setPreviews(
        SERVICE_IMAGE_FIELDS.reduce(
          (acc, field) => {
            acc[field] = currentImageValue(service, field) ?? null;
            return acc;
          },
          {} as Record<ServiceImageField, string | null>,
        ),
      );
      setSlugTouched(false);
    }
  }, [open, service, reset]);

  function handleFile(field: ServiceImageField, file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 5MB.', variant: 'danger' });
      return;
    }
    setImageState((prev) => ({ ...prev, [field]: { file, removed: false } }));
    setPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
  }

  function handleClear(field: ServiceImageField) {
    setImageState((prev) => ({ ...prev, [field]: { file: null, removed: true } }));
    setPreviews((prev) => ({ ...prev, [field]: null }));
  }

  async function processImages(id: string) {
    const failures: string[] = [];
    for (const field of SERVICE_IMAGE_FIELDS) {
      const st = imageState[field];
      if (st.file) {
        try {
          await serviceCatalogService.uploadImage(id, st.file, field);
        } catch {
          failures.push(IMAGE_FIELD_META[field].label);
        }
      } else if (st.removed && currentImageValue(service, field)) {
        try {
          await serviceCatalogService.removeImage(id, field);
        } catch {
          failures.push(IMAGE_FIELD_META[field].label);
        }
      }
    }
    if (failures.length > 0) {
      toast({
        title: 'Service saved but some images failed',
        description: `Retry: ${failures.join(', ')} from the service detail page.`,
        variant: 'warning',
      });
    }
  }

  async function onSubmit(values: ServiceFormValues) {
    const basePrice = values.basePrice?.trim() ? Number(values.basePrice) : undefined;
    if (basePrice !== undefined && (Number.isNaN(basePrice) || basePrice < 0)) {
      toast({ title: 'Invalid base price', description: 'Enter a non-negative number.', variant: 'danger' });
      return;
    }

    const sortOrder = values.sortOrder?.trim() ? Number(values.sortOrder) : undefined;
    if (sortOrder !== undefined && (Number.isNaN(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 0)) {
      toast({ title: 'Invalid sort order', description: 'Enter a whole number (0 or higher).', variant: 'danger' });
      return;
    }

    const payload: CreateServiceInput = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      categoryId: values.categoryId,
      icon: values.icon?.trim() || undefined,
      shortDescription: values.shortDescription?.trim() || undefined,
      description: values.description?.trim() || undefined,
      basePrice,
      estimatedDuration: values.estimatedDuration?.trim() || undefined,
      requiresSiteVisit: values.requiresSiteVisit,
      isFeatured: values.isFeatured ?? false,
      isPopular: values.isPopular ?? false,
      sortOrder,
      seoTitle: values.seoTitle?.trim() || undefined,
      metaDescription: values.metaDescription?.trim() || undefined,
      metaKeywords: values.metaKeywords?.trim() || undefined,
      canonicalUrl: values.canonicalUrl?.trim() || undefined,
    };
    if (isEdit) (payload as { isActive?: boolean }).isActive = values.isActive;

    try {
      const saved = isEdit ? await updateService.mutateAsync(payload) : await createService.mutateAsync(payload);
      await processImages(saved.id);

      toast({
        title: isEdit ? 'Service updated' : 'Service created',
        description: `"${saved.name}" ${isEdit ? 'saved' : 'added to the catalog'}.`,
        variant: 'success',
      });
      onOpenChange(false);
      onSaved?.(saved.id);
    } catch (err) {
      // Duplicate names, missing categories etc. are enforced server-side -
      // surface the backend's message rather than pre-checking here.
      toast({
        title: isEdit ? 'Could not update service' : 'Could not create service',
        description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        variant: 'danger',
      });
    }
  }

  const isArchived = !!service?.archivedAt;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-w-2xl"
        title={isEdit ? `Edit ${service?.name}` : 'New Service'}
        description={
          isEdit
            ? 'Changes apply everywhere this service is offered. Historical records keep their own snapshots.'
            : 'Add a service to the master catalog. Leads, quotations, and projects all select from here.'
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7" noValidate>
          {/* ── Basic Information ─────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Basic Information</h3>

            <FormField label="Service name" htmlFor="svc-name" required error={errors.name?.message}>
              <Input id="svc-name" placeholder="Solar Installation" error={!!errors.name} {...register('name')} />
            </FormField>

            <FormField
              label="Slug"
              htmlFor="svc-slug"
              hint="URL: /services/<slug>. Auto-generated from the name until you edit it."
              error={errors.slug?.message}
            >
              <Input
                id="svc-slug"
                placeholder="solar-installation"
                error={!!errors.slug}
                disabled={isEdit && !service?.slug}
                {...register('slug', {
                  onChange: () => setSlugTouched(true),
                })}
              />
            </FormField>

            <FormField label="Category" htmlFor="svc-category" required error={errors.categoryId?.message}>
              {categoriesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="svc-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
            </FormField>

            <FormField label="Icon" htmlFor="svc-icon" hint="Shown on cards when no image is set.">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <ServiceIcon name={watchedIcon || undefined} className="h-5 w-5" />
                </div>
                <Controller
                  control={control}
                  name="icon"
                  render={({ field }) => (
                    <Select value={field.value || 'NONE'} onValueChange={(v) => field.onChange(v === 'NONE' ? '' : v)}>
                      <SelectTrigger id="svc-icon" className="flex-1">
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
              htmlFor="svc-shortDescription"
              hint="Card copy on the public website. Max 300 characters."
              error={errors.shortDescription?.message}
            >
              <Textarea
                id="svc-shortDescription"
                rows={2}
                placeholder="Compact summary shown on service cards."
                error={!!errors.shortDescription}
                {...register('shortDescription')}
              />
            </FormField>

            <FormField label="Long description" htmlFor="svc-description" hint="Full detail page copy.">
              <Textarea
                id="svc-description"
                rows={4}
                placeholder="Everything this service covers, for the public detail page and the enquiry wizard."
                {...register('description')}
              />
            </FormField>
          </section>

          {/* ── Pricing & Delivery ────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Pricing & Delivery</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Base price (₹)" htmlFor="svc-basePrice" hint="Optional starting price">
                <Input id="svc-basePrice" type="number" min="0" step="0.01" placeholder="25000" {...register('basePrice')} />
              </FormField>
              <FormField label="Estimated duration" htmlFor="svc-duration" hint="e.g. 2-3 weeks">
                <Input id="svc-duration" placeholder="2-3 weeks" {...register('estimatedDuration')} />
              </FormField>
            </div>

            <FormField label="Site visit" htmlFor="svc-siteVisit" required error={errors.requiresSiteVisit?.message}>
              <Controller
                control={control}
                name="requiresSiteVisit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="svc-siteVisit">
                      <SelectValue placeholder="Site visit requirement" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_VISIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </section>

          {/* ── Display & Discovery ───────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Display & Discovery</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Featured</p>
                      <p className="text-xs text-ink-muted">Promoted on the homepage</p>
                    </div>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
              <Controller
                control={control}
                name="isPopular"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Popular</p>
                      <p className="text-xs text-ink-muted">Shown in "Popular" listings</p>
                    </div>
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                  </div>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Sort order" htmlFor="svc-sortOrder" hint="Lower numbers appear first.">
                <Input id="svc-sortOrder" type="number" min="0" step="1" placeholder="0" {...register('sortOrder')} />
              </FormField>

              {isEdit && (
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink">Active</p>
                        <p className="text-xs text-ink-muted">Selectable in Leads & Quotations</p>
                      </div>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={isArchived} />
                    </div>
                  )}
                />
              )}
            </div>
          </section>

          {/* ── Images ────────────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Images</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {SERVICE_IMAGE_FIELDS.map((field) => (
                <ImageSlotField
                  key={field}
                  field={field}
                  service={service}
                  state={imageState[field]}
                  previews={previews}
                  onFile={handleFile}
                  onClear={handleClear}
                />
              ))}
            </div>
          </section>

          {/* ── SEO ───────────────────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Search Engine Optimization</h3>

            <FormField label="Meta title" htmlFor="svc-seoTitle" hint="Max 160 characters." error={errors.seoTitle?.message}>
              <Input id="svc-seoTitle" placeholder="Solar Installation Services | Company Name" {...register('seoTitle')} />
            </FormField>

            <FormField
              label="Meta description"
              htmlFor="svc-metaDescription"
              hint="Max 300 characters."
              error={errors.metaDescription?.message}
            >
              <Textarea
                id="svc-metaDescription"
                rows={2}
                placeholder="A short summary shown under the page title in search results."
                {...register('metaDescription')}
              />
            </FormField>

            <FormField
              label="Keywords"
              htmlFor="svc-metaKeywords"
              hint="Comma-separated. Max 300 characters."
              error={errors.metaKeywords?.message}
            >
              <Input
                id="svc-metaKeywords"
                placeholder="solar, installation, rooftop, renewable energy"
                {...register('metaKeywords')}
              />
            </FormField>

            <FormField label="Canonical URL" htmlFor="svc-canonicalUrl" error={errors.canonicalUrl?.message}>
              <Input id="svc-canonicalUrl" placeholder="https://example.com/services/solar-installation" {...register('canonicalUrl')} />
            </FormField>
          </section>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Create service'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

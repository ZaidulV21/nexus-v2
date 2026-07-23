import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategoryTree, useCreateService, useUpdateService } from '@/queries/useServices';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import type { Category, Service } from '@/types';

const serviceFormSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(120, 'Keep the name under 120 characters'),
  categoryId: z.string().min(1, 'Select a category'),
  description: z.string().optional(),
  basePrice: z.string().optional(),
  estimatedDuration: z.string().optional(),
  requiresSiteVisit: z.enum(['YES', 'NO', 'OPTIONAL']),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const SITE_VISIT_OPTIONS = [
  { value: 'OPTIONAL', label: 'Optional (admin decides per lead)' },
  { value: 'YES', label: 'Always required' },
  { value: 'NO', label: 'Never required' },
] as const;

/** Flattens the category tree into indent-labelled options so nested
 *  categories stay readable inside a flat Select. */
function flattenCategories(categories: Category[], depth = 0): Array<{ id: string; label: string }> {
  return categories.flatMap((cat) => [
    { id: cat.id, label: `${'  '.repeat(depth)}${cat.name}` },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

function toFormValues(service?: Service): ServiceFormValues {
  return {
    name: service?.name ?? '',
    categoryId: service?.categoryId ?? '',
    description: service?.description ?? '',
    basePrice: service?.basePrice != null ? String(Number(service.basePrice)) : '',
    estimatedDuration: service?.estimatedDuration ?? '',
    requiresSiteVisit: service?.requiresSiteVisit ?? 'OPTIONAL',
  };
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(service?.imageUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryOptions = useMemo(() => flattenCategories(categories ?? []), [categories]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toFormValues(service),
  });

  useEffect(() => {
    if (open) {
      reset(toFormValues(service));
      setImageFile(null);
      setImagePreview(service?.imageUrl ?? null);
    }
  }, [open, service, reset]);

  async function onSubmit(values: ServiceFormValues) {
    const basePrice = values.basePrice?.trim() ? Number(values.basePrice) : undefined;
    if (basePrice !== undefined && (Number.isNaN(basePrice) || basePrice < 0)) {
      toast({ title: 'Invalid base price', description: 'Enter a non-negative number.', variant: 'danger' });
      return;
    }

    const payload = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      description: values.description?.trim() || undefined,
      basePrice,
      estimatedDuration: values.estimatedDuration?.trim() || undefined,
      requiresSiteVisit: values.requiresSiteVisit,
    };

    try {
      const saved = isEdit ? await updateService.mutateAsync(payload) : await createService.mutateAsync(payload);

      // Upload image if one was selected
      if (imageFile) {
        try {
          await serviceCatalogService.uploadImage(saved.id, imageFile);
        } catch {
          toast({
            title: 'Service saved but image upload failed',
            description: 'You can retry uploading the image from the service detail page.',
            variant: 'warning',
          });
        }
      }

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title={isEdit ? `Edit ${service?.name}` : 'New Service'}
        description={
          isEdit
            ? 'Changes apply everywhere this service is offered. Historical records keep their own snapshots.'
            : 'Add a service to the master catalog. Leads, quotations, and projects all select from here.'
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <FormField label="Service name" htmlFor="svc-name" required error={errors.name?.message}>
            <Input id="svc-name" placeholder="Solar Installation" error={!!errors.name} {...register('name')} />
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

          <FormField label="Service image" htmlFor="svc-image" hint="Optional — displayed on the public website">
            <input
              ref={fileInputRef}
              type="file"
              id="svc-image"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    toast({ title: 'File too large', description: 'Maximum size is 5MB.', variant: 'danger' });
                    return;
                  }
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
            />
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img src={imagePreview} alt="Service preview" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-sm text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                <Upload className="h-4 w-4" />
                Click to upload an image
              </button>
            )}
          </FormField>

          <FormField label="Description" htmlFor="svc-description" hint="Optional">
            <Textarea
              id="svc-description"
              rows={3}
              placeholder="What this service covers, for internal reference and the enquiry wizard."
              {...register('description')}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Base price (₹)" htmlFor="svc-basePrice" hint="Optional starting price">
              <Input id="svc-basePrice" type="number" min="0" step="0.01" placeholder="25000" {...register('basePrice')} />
            </FormField>
            <FormField label="Estimated duration" htmlFor="svc-duration" hint="Optional, e.g. 2-3 weeks">
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

import { useParams, useNavigate } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Power,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  RotateCcw,
  Star,
  Flame,
} from 'lucide-react';
import { useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { EntityAuditLog } from '@/components/common/EntityAuditLog';
import { ServiceIcon } from '@/components/common/ServiceIcon';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import {
  useService,
  useUpdateService,
  useArchiveService,
  useRestoreService,
  useDuplicateService,
  useSoftDeleteService,
  useUndeleteService,
} from '@/queries/useServices';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { formatCurrency, formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ROUTES } from '@/routes/routes';
import { ServiceFormDrawer } from './components/ServiceFormDrawer';
import { SubServicesTab } from './components/SubServicesTab';
import { ServiceStatusPill } from './ServicesPage';

const SITE_VISIT_LABELS: Record<string, string> = {
  YES: 'Always required',
  NO: 'Never required',
  OPTIONAL: 'Optional (admin decides per lead)',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value || '—'}</p>
    </div>
  );
}

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: service, isLoading, isError, refetch } = useService(id);
  const editDrawer = useDisclosure(false);
  const archiveModal = useDisclosure(false);
  const deleteModal = useDisclosure(false);
  const updateMutation = useUpdateService(id ?? '');
  const archiveMutation = useArchiveService(id ?? '');
  const restoreMutation = useRestoreService(id ?? '');
  const duplicateMutation = useDuplicateService();
  const softDeleteMutation = useSoftDeleteService(id ?? '');
  const undeleteMutation = useUndeleteService(id ?? '');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    if (!id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 5MB.', variant: 'danger' });
      return;
    }
    try {
      await serviceCatalogService.uploadImage(id, file);
      await refetch();
      toast({ title: 'Image uploaded', description: 'Service image has been updated.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleImageRemove() {
    if (!id) return;
    try {
      await serviceCatalogService.removeImage(id);
      await refetch();
      toast({ title: 'Image removed', description: 'Service image has been removed.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not remove image',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !service) {
    return <ErrorState description="Couldn't load this service." onRetry={refetch} />;
  }

  const isArchived = !!service.archivedAt;
  const isDeleted = !!service.deletedAt;
  const usage = service.usage;
  const isUsed = (usage?.total ?? 0) > 0;

  async function handleToggleActive() {
    try {
      const updated = await updateMutation.mutateAsync({ isActive: !service!.isActive });
      toast({
        title: updated.isActive ? 'Service activated' : 'Service deactivated',
        description: updated.isActive
          ? `"${updated.name}" is selectable in new Leads and Quotations again.`
          : `"${updated.name}" no longer appears in new Leads or Quotations.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Could not update service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleArchiveOrRestore() {
    try {
      if (isArchived) {
        const restored = await restoreMutation.mutateAsync();
        toast({
          title: 'Service restored',
          description: `"${restored.name}" is back in the active catalog.`,
          variant: 'success',
        });
      } else {
        const archived = await archiveMutation.mutateAsync();
        toast({
          title: 'Service archived',
          description: `"${archived.name}" stays on historical records but can't be selected anymore.`,
          variant: 'success',
        });
      }
      archiveModal.close();
    } catch (err) {
      toast({
        title: isArchived ? 'Could not restore service' : 'Could not archive service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      archiveModal.close();
    }
  }

  async function handleDuplicate() {
    try {
      const copy = await duplicateMutation.mutateAsync(service!.id);
      toast({ title: 'Service duplicated', description: `"${copy.name}" was created from this one.`, variant: 'success' });
      navigate(ROUTES.admin.serviceDetail(copy.id));
    } catch (err) {
      toast({
        title: 'Could not duplicate service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleSoftDelete() {
    try {
      const deleted = await softDeleteMutation.mutateAsync();
      toast({
        title: 'Service deleted',
        description: `"${deleted.name}" is hidden everywhere but stays on historical records. You can restore it any time.`,
        variant: 'success',
      });
      deleteModal.close();
    } catch (err) {
      toast({
        title: 'Could not delete service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      deleteModal.close();
    }
  }

  async function handleUndelete() {
    try {
      const restored = await undeleteMutation.mutateAsync();
      toast({ title: 'Service restored', description: `"${restored.name}" is visible again.`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not restore service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <PageHeader
        title={service.name}
        description={service.category?.name ?? 'Service catalog entry'}
        actions={
          <div className="flex items-center gap-2">
            <ServiceStatusPill service={service} />
            {!isDeleted ? (
              <>
                {!isArchived && (
                  <Button variant="secondary" size="sm" onClick={editDrawer.open}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {!isArchived && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={updateMutation.isPending}
                    onClick={handleToggleActive}
                  >
                    <Power className="h-3.5 w-3.5" /> {service.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
                {service.slug && (
                  <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.public.serviceDetail(service.slug!))}>
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </Button>
                )}
                <Button variant="secondary" size="sm" loading={duplicateMutation.isPending} onClick={handleDuplicate}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button
                  variant={isArchived ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={archiveModal.open}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </>
                  )}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={deleteModal.open}
                  disabled={!!service.deletedAt}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" loading={undeleteMutation.isPending} onClick={handleUndelete}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore deleted
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sub-services">Sub Services</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {service.imageUrl && (
                  <div className="col-span-full">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">Service Image</p>
                    <div className="relative inline-block overflow-hidden rounded-xl border border-border">
                      <img src={service.imageUrl} alt={service.name} className="h-48 w-full object-cover" />
                      {!isArchived && !isDeleted && (
                        <div className="absolute right-2 top-2 flex gap-1">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={handleImageRemove}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white transition-colors hover:bg-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!service.imageUrl && !isArchived && !isDeleted && (
                  <div className="col-span-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      <Upload className="h-4 w-4" />
                      Upload service image
                    </button>
                  </div>
                )}
                <Field label="Service name" value={service.name} />
                <Field label="Slug" value={service.slug ? `/services/${service.slug}` : ''} />
                <Field label="Category" value={service.category?.name} />
                <Field
                  label="Icon"
                  value={
                    service.icon ? (
                      <span className="inline-flex items-center gap-2">
                        <ServiceIcon name={service.icon} className="h-4 w-4 text-accent" />
                        {service.icon}
                      </span>
                    ) : (
                      ''
                    )
                  }
                />
                <Field
                  label="Base price"
                  value={service.basePrice != null ? formatCurrency(service.basePrice) : ''}
                />
                <Field label="Estimated duration" value={service.estimatedDuration} />
                <Field label="Site visit" value={SITE_VISIT_LABELS[service.requiresSiteVisit]} />
                <Field
                  label="Status"
                  value={isDeleted ? 'Deleted' : isArchived ? 'Archived' : service.isActive ? 'Active' : 'Inactive'}
                />
                <Field
                  label="Flags"
                  value={
                    service.isFeatured || service.isPopular ? (
                      <span className="inline-flex items-center gap-1.5">
                        {service.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                            <Star className="h-3 w-3" /> Featured
                          </span>
                        )}
                        {service.isPopular && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                            <Flame className="h-3 w-3" /> Popular
                          </span>
                        )}
                      </span>
                    ) : (
                      ''
                    )
                  }
                />
                <Field label="Sort order" value={service.sortOrder != null ? String(service.sortOrder) : ''} />
                <Field label="Created" value={service.createdAt ? formatDate(service.createdAt) : ''} />
                <Field label="Last updated" value={service.updatedAt ? formatDate(service.updatedAt) : ''} />
                <div className="col-span-full">
                  <Field label="Short description" value={service.shortDescription} />
                </div>
                <div className="col-span-full">
                  <Field label="Description" value={service.description} />
                </div>
              </div>

              {(service.bannerImage || service.thumbnail || service.heroImage || service.ogImage) && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Media library
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(
                      [
                        ['Banner', service.bannerImage],
                        ['Thumbnail', service.thumbnail],
                        ['Hero', service.heroImage],
                        ['OG image', service.ogImage],
                      ] as Array<[string, string | null | undefined]>
                    )
                      .filter(([, src]) => src)
                      .map(([label, src]) => (
                        <div key={label} className="overflow-hidden rounded-xl border border-border">
                          <img src={src!} alt={label} className="h-24 w-full object-cover" />
                          <p className="px-2 py-1 text-xs text-ink-muted">{label}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(service.seoTitle || service.metaDescription || service.metaKeywords || service.canonicalUrl) && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Search engine optimization
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Meta title" value={service.seoTitle} />
                    <Field label="Meta keywords" value={service.metaKeywords} />
                    <div className="col-span-full">
                      <Field label="Meta description" value={service.metaDescription} />
                    </div>
                    <div className="col-span-full">
                      <Field label="Canonical URL" value={service.canonicalUrl} />
                    </div>
                  </div>
                </div>
              )}

              {usage && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Where this service is used
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Lead services" value={String(usage.leadServices)} />
                    <Field label="Project services" value={String(usage.projectServices)} />
                    <Field label="Quotation items" value={String(usage.quotationItems)} />
                  </div>
                  {isUsed && (
                    <p className="mt-3 text-xs text-ink-faint">
                      This service is referenced by existing records, so it can't be deleted — archive it
                      instead to remove it from new selections while keeping history intact.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sub-services" className="pt-5">
              <SubServicesTab service={service} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="SERVICE" entityId={service.id} />
            </TabsContent>
            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="SERVICE" entityId={service.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ServiceFormDrawer
        open={editDrawer.isOpen}
        onOpenChange={editDrawer.setIsOpen}
        service={service}
      />

      <ConfirmDialog
        open={archiveModal.isOpen}
        onOpenChange={archiveModal.setIsOpen}
        title={isArchived ? 'Restore this service?' : 'Archive this service?'}
        description={
          isArchived
            ? `"${service.name}" becomes active and selectable in new Leads and Quotations again.`
            : isUsed
              ? `"${service.name}" is used by ${usage?.total} existing record(s). Archiving keeps it on all historical records but removes it from new selections.`
              : `"${service.name}" will no longer be selectable in new Leads or Quotations. You can restore it any time.`
        }
        confirmLabel={isArchived ? 'Restore' : 'Archive'}
        destructive={!isArchived}
        loading={archiveMutation.isPending || restoreMutation.isPending}
        onConfirm={handleArchiveOrRestore}
      />

      <ConfirmDialog
        open={deleteModal.isOpen}
        onOpenChange={deleteModal.setIsOpen}
        title="Delete this service?"
        description={
          isUsed
            ? `"${service.name}" is used by ${usage?.total} existing record(s). Deleting hides it everywhere but keeps it on all historical records. You can restore it any time.`
            : `"${service.name}" is hidden everywhere and can no longer be selected. It stays in the database and can be restored from the Deleted filter.`
        }
        confirmLabel="Delete"
        destructive
        loading={softDeleteMutation.isPending}
        onConfirm={handleSoftDelete}
      />
    </div>
  );
}

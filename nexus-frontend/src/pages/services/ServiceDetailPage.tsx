import { useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, Pencil, Power, Upload, Trash2 } from 'lucide-react';
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
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import { useService, useUpdateService, useArchiveService, useRestoreService } from '@/queries/useServices';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { formatCurrency, formatDate } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ServiceFormDrawer } from './components/ServiceFormDrawer';
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
  const { data: service, isLoading, isError, refetch } = useService(id);
  const editDrawer = useDisclosure(false);
  const archiveModal = useDisclosure(false);
  const updateMutation = useUpdateService(id ?? '');
  const archiveMutation = useArchiveService(id ?? '');
  const restoreMutation = useRestoreService(id ?? '');
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

  return (
    <div>
      <PageHeader
        title={service.name}
        description={service.category?.name ?? 'Service catalog entry'}
        actions={
          <div className="flex items-center gap-2">
            <ServiceStatusPill service={service} />
            {!isArchived && (
              <>
                <Button variant="secondary" size="sm" onClick={editDrawer.open}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={updateMutation.isPending}
                  onClick={handleToggleActive}
                >
                  <Power className="h-3.5 w-3.5" /> {service.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            )}
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
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
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
                      {!isArchived && (
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
                {!service.imageUrl && !isArchived && (
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
                <Field label="Category" value={service.category?.name} />
                <Field
                  label="Base price"
                  value={service.basePrice != null ? formatCurrency(service.basePrice) : ''}
                />
                <Field label="Estimated duration" value={service.estimatedDuration} />
                <Field label="Site visit" value={SITE_VISIT_LABELS[service.requiresSiteVisit]} />
                <Field
                  label="Status"
                  value={isArchived ? 'Archived' : service.isActive ? 'Active' : 'Inactive'}
                />
                <Field label="Created" value={service.createdAt ? formatDate(service.createdAt) : ''} />
                <Field label="Last updated" value={service.updatedAt ? formatDate(service.updatedAt) : ''} />
                <div className="col-span-full">
                  <Field label="Description" value={service.description} />
                </div>
              </div>

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
    </div>
  );
}

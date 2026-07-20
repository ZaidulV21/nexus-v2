import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRightCircle, Archive, ArchiveRestore } from 'lucide-react';
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
import { useLead, useConvertLeadToClient, useArchiveLead, useRestoreLead } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';
import { LeadOverviewPanel } from './components/LeadOverviewPanel';
import { LeadServicesPanel } from './components/LeadServicesPanel';
import { LeadNotesPanel } from './components/LeadNotesPanel';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading, isError, refetch } = useLead(id);
  const convertModal = useDisclosure(false);
  const archiveModal = useDisclosure(false);
  const restoreModal = useDisclosure(false);
  const [archiveReason, setArchiveReason] = useState('');
  const convertMutation = useConvertLeadToClient(id ?? '');
  const archiveMutation = useArchiveLead(id ?? '');
  const restoreMutation = useRestoreLead(id ?? '');
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !lead) {
    return <ErrorState description="Couldn't load this lead." onRetry={refetch} />;
  }

  const isArchived = !!lead.archivedAt;

  async function handleConvert() {
    try {
      const client = await convertMutation.mutateAsync();
      toast({ title: 'Client account created', description: `${client.contactName} can now log in.`, variant: 'success' });
      convertModal.close();
    } catch (err) {
      toast({
        title: 'Could not convert lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      convertModal.close();
    }
  }

  async function handleArchive() {
    if (!lead) return;
    try {
      await archiveMutation.mutateAsync({ reason: archiveReason });
      toast({ title: 'Lead archived', description: `${lead.leadNumber} has been archived.`, variant: 'success' });
      archiveModal.close();
      setArchiveReason('');
    } catch (err) {
      toast({
        title: 'Could not archive lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      archiveModal.close();
    }
  }

  async function handleRestore() {
    if (!lead) return;
    try {
      await restoreMutation.mutateAsync();
      toast({ title: 'Lead restored', description: `${lead.leadNumber} has been restored.`, variant: 'success' });
      restoreModal.close();
    } catch (err) {
      toast({
        title: 'Could not restore lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      restoreModal.close();
    }
  }

  return (
    <div>
      <PageHeader
        title={lead.leadNumber}
        description={`${lead.contactName}${lead.companyName ? ` · ${lead.companyName}` : ''}${isArchived ? ' · Archived' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {isArchived ? (
              <>
                <span className="text-sm text-ink-muted">{lead.archiveReason}</span>
                <Button size="sm" variant="secondary" onClick={restoreModal.open}>
                  <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                </Button>
              </>
            ) : lead.convertedAt ? (
              <span className="text-sm text-ink-muted">Converted to Client</span>
            ) : (
              <>
                <Button size="sm" onClick={convertModal.open}>
                  <ArrowRightCircle className="h-3.5 w-3.5" /> Convert to Client
                </Button>
                <Button size="sm" variant="secondary" onClick={archiveModal.open}>
                  <Archive className="h-3.5 w-3.5" /> Archive
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <LeadOverviewPanel lead={lead} />
            </TabsContent>
            <TabsContent value="services" className="pt-5">
              <LeadServicesPanel lead={lead} />
            </TabsContent>
            <TabsContent value="notes" className="pt-5">
              <LeadNotesPanel leadId={lead.id} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="LEAD" entityId={lead.id} />
            </TabsContent>
            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="LEAD" entityId={lead.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={convertModal.isOpen}
        onOpenChange={convertModal.setIsOpen}
        title="Convert this lead to a client?"
        description="Creates a Client login and emails credentials. Convert the Lead before creating quotations. Quotations can only be created for Clients."
        confirmLabel="Convert"
        loading={convertMutation.isPending}
        onConfirm={handleConvert}
      />

      <ConfirmDialog
        open={archiveModal.isOpen}
        onOpenChange={(open) => { archiveModal.setIsOpen(open); if (!open) setArchiveReason(''); }}
        title="Archive this lead?"
        description="Archived leads are excluded from the dashboard, search, and active lead lists. Only unconverted leads can be archived. You can restore it later."
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
        onConfirm={handleArchive}
      >
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-ink">Reason for archiving</label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent"
            rows={3}
            placeholder="Enter the reason for archiving this lead..."
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={restoreModal.isOpen}
        onOpenChange={restoreModal.setIsOpen}
        title="Restore this lead?"
        description="The lead will reappear in the active leads list, dashboard, and search results."
        confirmLabel="Restore"
        loading={restoreMutation.isPending}
        onConfirm={handleRestore}
      />
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { ArrowRightCircle } from 'lucide-react';
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
import { useLead, useConvertLeadToClient } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';
import { LeadOverviewPanel } from './components/LeadOverviewPanel';
import { LeadServicesPanel } from './components/LeadServicesPanel';
import { LeadNotesPanel } from './components/LeadNotesPanel';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading, isError, refetch } = useLead(id);
  const convertModal = useDisclosure(false);
  const convertMutation = useConvertLeadToClient(id ?? '');
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

  async function handleConvert() {
    try {
      const client = await convertMutation.mutateAsync();
      toast({ title: 'Client account created', description: `${client.contactName} can now log in.`, variant: 'success' });
      convertModal.close();
    } catch (err) {
      // Eligibility (qualified status, required data) is enforced entirely
      // server-side - we surface whatever validation message it provides.
      toast({
        title: 'Could not convert lead',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
      convertModal.close();
    }
  }

  return (
    <div>
      <PageHeader
        title={lead.leadNumber}
        description={`${lead.contactName}${lead.companyName ? ` · ${lead.companyName}` : ''}`}
        actions={
          lead.convertedAt ? (
            <span className="text-sm text-ink-muted">Converted to Client</span>
          ) : (
            <Button size="sm" onClick={convertModal.open}>
              <ArrowRightCircle className="h-3.5 w-3.5" /> Convert to Client
            </Button>
          )
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
    </div>
  );
}

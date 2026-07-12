import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { EntityAuditLog } from '@/components/common/EntityAuditLog';
import { useClient } from '@/queries/useClients';
import { ClientOverviewPanel } from './components/ClientOverviewPanel';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, isError, refetch } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !client) {
    return <ErrorState description="Couldn't load this client." onRetry={refetch} />;
  }

  return (
    <div>
      <PageHeader
        title={client.contactName}
        description={client.companyName ? `${client.companyName} · ${client.email}` : client.email}
        actions={<span className="flex items-center gap-2 text-sm text-ink-muted"><Users className="h-4 w-4" /> Client account</span>}
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
              <ClientOverviewPanel client={client} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="CLIENT" entityId={client.id} />
            </TabsContent>
            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="CLIENT" entityId={client.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

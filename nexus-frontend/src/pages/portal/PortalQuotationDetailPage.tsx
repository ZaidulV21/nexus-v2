import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, CornerDownLeft, CornerDownRight, History } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { Modal, ModalClose, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge, Badge } from '@/components/ui/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { useClientQuotation, useAcceptQuotation, useRejectQuotation, useRequestQuotationRevision } from '@/queries/useQuotations';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { QuotationVersion } from '@/types';

function PricingBreakdown({ version }: { version: QuotationVersion }) {
  const rows: Array<{ label: string; value: string; emphasize?: boolean }> = [
    { label: 'Subtotal', value: formatCurrency(version.subtotal) },
    { label: 'Discount', value: `- ${formatCurrency(version.discount)}` },
    { label: 'GST', value: formatCurrency(version.gstAmount) },
    { label: 'Transportation', value: formatCurrency(version.transportation) },
    { label: 'Installation', value: formatCurrency(version.installation) },
    { label: 'Grand total', value: formatCurrency(version.grandTotal), emphasize: true },
  ];

  return (
    <dl className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
          <dt className={row.emphasize ? 'text-sm font-medium text-ink' : 'text-sm text-ink-muted'}>{row.label}</dt>
          <dd className={row.emphasize ? 'font-mono text-base font-semibold text-ink' : 'font-mono text-sm text-ink'}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function VersionItems({ version }: { version: QuotationVersion }) {
  if (version.items.length === 0) {
    return <EmptyState title="No quotation items" description="Quotation line items will appear here." />;
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {version.items.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{item.description}</p>
            <p className="text-xs text-ink-faint">
              {Number(item.quantity)} × {formatCurrency(item.unitPrice)} · Tax {Number(item.taxRate)}% (
              {formatCurrency(item.taxAmount)})
            </p>
          </div>
          <span className="text-sm font-medium text-ink">{formatCurrency(item.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

function DecisionDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  async function handleConfirm() {
    try {
      await onConfirm(reason);
      setReason('');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not complete the action',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title={title} description="Send this back through the backend workflow.">
        <div className="flex flex-col gap-4">
          <FormField label="Reason" htmlFor="quotation-decision-reason" hint="Required for rejection and revision requests">
            <Textarea
              id="quotation-decision-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Add your feedback"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button size="sm" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

export function PortalQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quotation, isLoading, isError, refetch } = useClientQuotation(id);
  const acceptQuotation = useAcceptQuotation(id ?? '');
  const rejectQuotation = useRejectQuotation(id ?? '');
  const requestRevision = useRequestQuotationRevision(id ?? '');
  const rejectDialog = useDisclosure(false);
  const revisionDialog = useDisclosure(false);
  const { toast } = useToast();

  const activeVersion = useMemo(
    () => quotation?.versions.find((version) => version.id === quotation.activeVersionId) ?? quotation?.versions[0],
    [quotation]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !quotation) {
    return <ErrorState description="Couldn't load this quotation." onRetry={refetch} />;
  }

  async function handleAccept() {
    try {
      const result = await acceptQuotation.mutateAsync();
      toast({ title: 'Quotation accepted', variant: 'success' });
      // Redirect to the newly created project; if the payload ever lacks
      // one, stay here - the cache was already updated with the ACCEPTED
      // quotation, so the page reflects the new state either way.
      if (result.project?.id) {
        navigate(ROUTES.portal.projectDetail(result.project.id));
      }
    } catch (err) {
      toast({
        title: 'Could not accept quotation',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <PageHeader
        title={quotation.quotationNumber}
        description={quotation.lead ? `Lead ${quotation.lead.leadNumber}` : `Created ${formatDate(quotation.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quotation.status} />
            <Button variant="secondary" size="sm" onClick={revisionDialog.open} disabled={quotation.status !== 'SENT'}>
              <CornerDownLeft className="h-3.5 w-3.5" /> Request revision
            </Button>
            <Button variant="secondary" size="sm" onClick={rejectDialog.open} disabled={quotation.status !== 'SENT' && quotation.status !== 'NEGOTIATION'}>
              <CornerDownRight className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button size="sm" onClick={handleAccept} disabled={quotation.status !== 'SENT'} loading={acceptQuotation.isPending}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Accept
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Status</p>
                    <p className="mt-1 font-medium text-ink"><StatusBadge status={quotation.status} /></p>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Active version</p>
                    <p className="mt-1 font-medium text-ink">{activeVersion ? `v${activeVersion.versionNumber}` : '-'}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Created</p>
                    <p className="mt-1 font-medium text-ink">{formatDate(quotation.createdAt)}</p>
                  </div>
                </div>

                {activeVersion ? (
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle>Line items (v{activeVersion.versionNumber})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <VersionItems version={activeVersion} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Pricing</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PricingBreakdown version={activeVersion} />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <EmptyState title="No active version" description="A quotation version will appear here once the business creates one." />
                )}
              </div>
            </TabsContent>

            <TabsContent value="versions" className="pt-5">
              {quotation.versions.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No versions yet"
                  description="Every revision of this quotation stays permanently viewable here."
                />
              ) : (
                <div className="space-y-4">
                  {quotation.versions.map((version) => (
                    <Card key={version.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle>Version {version.versionNumber}</CardTitle>
                          <div className="flex items-center gap-2">
                            {version.isActive && <Badge tone="success">Active</Badge>}
                            <span className="text-xs text-ink-faint">{formatDate(version.createdAt)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <VersionItems version={version} />
                        <PricingBreakdown version={version} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="QUOTATION" entityId={quotation.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DecisionDialog
        open={revisionDialog.isOpen}
        onOpenChange={revisionDialog.setIsOpen}
        title="Request revision"
        confirmLabel="Request revision"
        onConfirm={async (reason) => {
          await requestRevision.mutateAsync({ reason });
          toast({ title: 'Revision requested', variant: 'success' });
        }}
      />

      <DecisionDialog
        open={rejectDialog.isOpen}
        onOpenChange={rejectDialog.setIsOpen}
        title="Reject quotation"
        confirmLabel="Reject"
        onConfirm={async (reason) => {
          await rejectQuotation.mutateAsync({ reason });
          toast({ title: 'Quotation rejected', variant: 'success' });
        }}
      />
    </div>
  );
}

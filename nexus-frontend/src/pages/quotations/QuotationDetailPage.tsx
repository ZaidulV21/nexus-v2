import { useParams } from 'react-router-dom';
import { CheckCircle2, PencilLine } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { EntityAuditLog } from '@/components/common/EntityAuditLog';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useQuotation } from '@/queries/useQuotations';
import { formatCurrency, formatDate } from '@/lib/format';
import { QuotationFormDrawer } from './components/QuotationFormDrawer';
import { ApproveQuotationDialog } from './components/ApproveQuotationDialog';

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: quotation, isLoading, isError, refetch } = useQuotation(id);
  const reviseModal = useDisclosure(false);
  const approveModal = useDisclosure(false);

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

  const activeVersion = quotation.versions.find((version) => version.id === quotation.activeVersionId) ?? quotation.versions[0];

  return (
    <div>
      <PageHeader
        title={quotation.quotationNumber}
        description={`Lead ${quotation.leadId}${quotation.clientId ? ` · Client ${quotation.clientId}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={reviseModal.open}>
              <PencilLine className="h-3.5 w-3.5" /> Revise
            </Button>
            <Button size="sm" onClick={approveModal.open} disabled={!activeVersion || quotation.status === 'APPROVED'}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
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
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={quotation.status} />
                  <span className="text-sm text-ink-muted">Created {formatDate(quotation.createdAt)}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Lead</p>
                    <p className="mt-1 font-medium text-ink">{quotation.leadId}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Client</p>
                    <p className="mt-1 font-medium text-ink">{quotation.clientId ?? '—'}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-canvas p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-faint">Active version</p>
                    <p className="mt-1 font-medium text-ink">{activeVersion ? `v${activeVersion.versionNumber}` : '—'}</p>
                  </div>
                </div>

                {activeVersion && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">Active version summary</p>
                        <p className="text-sm text-ink-muted">Subtotal {formatCurrency(activeVersion.subtotal)} · Grand total {formatCurrency(activeVersion.grandTotal)}</p>
                      </div>
                      {activeVersion.isActive ? <StatusBadge status="APPROVED" className="opacity-80" /> : <StatusBadge status="DRAFT" />}
                    </div>
                    <div className="mt-4 space-y-2">
                      {activeVersion.items.map((item) => (
                        <div key={item.id} className="rounded border border-border bg-canvas px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">{item.description}</p>
                              <p className="text-xs text-ink-muted">{item.quantity} × {formatCurrency(item.unitPrice)} · Tax {item.taxRate}%</p>
                            </div>
                            <span className="text-sm font-medium text-ink">{formatCurrency(item.lineTotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Version history</p>
                  <div className="space-y-2">
                    {quotation.versions.map((version) => (
                      <div key={version.id} className="rounded border border-border bg-canvas px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-ink">Version {version.versionNumber}</span>
                          <div className="flex items-center gap-2">
                            {version.isActive ? <StatusBadge status="SENT" /> : <StatusBadge status="DRAFT" />}
                            <span className="text-xs text-ink-faint">{formatDate(version.createdAt)}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-muted">
                          <span>Subtotal {formatCurrency(version.subtotal)}</span>
                          <span>Discount {formatCurrency(version.discount)}</span>
                          <span>GST {formatCurrency(version.gstAmount)}</span>
                          <span>Grand total {formatCurrency(version.grandTotal)}</span>
                        </div>
                        {version.approvals && version.approvals.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {version.approvals.map((approval) => (
                              <span key={approval.id} className="rounded border border-border px-2 py-0.5 text-xs text-ink-muted">
                                {approval.approvalMethod} · {formatDate(approval.approvedAt)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="QUOTATION" entityId={quotation.id} />
            </TabsContent>

            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="QUOTATION" entityId={quotation.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <QuotationFormDrawer open={reviseModal.isOpen} onOpenChange={reviseModal.setIsOpen} mode="revise" quotation={quotation} />
      <ApproveQuotationDialog open={approveModal.isOpen} onOpenChange={approveModal.setIsOpen} versionId={activeVersion?.id} />
    </div>
  );
}

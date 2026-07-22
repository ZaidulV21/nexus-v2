import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, CornerDownLeft, CornerDownRight, Download, Eye, History, Loader2, Printer, RotateCcw } from 'lucide-react';
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
import { useClientQuotation, useAcceptQuotation, useRejectQuotation, useRequestQuotationRevision, useQuotationPdfUrl } from '@/queries/useQuotations';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { ROUTES } from '@/routes/routes';

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
  const { data: pdfData, isLoading: isPdfLoading, isError: isPdfError, refetch: refetchPdf } = useQuotationPdfUrl(id);
  const acceptQuotation = useAcceptQuotation(id ?? '');
  const rejectQuotation = useRejectQuotation(id ?? '');
  const requestRevision = useRequestQuotationRevision(id ?? '');
  const rejectDialog = useDisclosure(false);
  const revisionDialog = useDisclosure(false);
  const { toast } = useToast();

  const pdfUrl = pdfData?.pdfUrl ?? quotation?.pdfUrl ?? null;

  const handlePrintPdf = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  }, [pdfUrl]);

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
        description={quotation.lead ? `Lead ${quotation.lead.leadNumber}` : quotation.client?.sourceLead ? `Lead ${quotation.client.sourceLead.leadNumber}` : `Created ${formatDate(quotation.createdAt)}`}
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
            {pdfUrl && (
              <>
                <Button asChild variant="secondary" size="sm">
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <Eye className="h-3.5 w-3.5" /> Preview PDF
                  </a>
                </Button>
                <Button asChild variant="secondary" size="sm">
                  <a href={pdfUrl} download>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </a>
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
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              {isPdfLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
                  <span className="ml-2 text-sm text-ink-muted">Loading quotation PDF...</span>
                </div>
              ) : isPdfError || !pdfUrl ? (
                <EmptyState
                  icon={RotateCcw}
                  title="PDF not available"
                  description="The quotation PDF could not be loaded. This may be because it has not been generated yet."
                  actionLabel="Retry"
                  onAction={() => refetchPdf()}
                />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
                    <p className="text-sm font-medium text-ink">Quotation Document</p>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                          <Eye className="h-3.5 w-3.5" /> Open
                        </a>
                      </Button>
                      <Button asChild variant="secondary" size="sm">
                        <a href={pdfUrl} download>
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handlePrintPdf}>
                        <Printer className="h-3.5 w-3.5" /> Print
                      </Button>
                    </div>
                  </div>
                  <iframe
                    src={pdfUrl}
                    title={`Quotation ${quotation.quotationNumber}`}
                    className="w-full border-0"
                    style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                  />
                </div>
              )}
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
                      <CardContent>
                        <div className="flex flex-wrap gap-4 text-sm text-ink-muted">
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

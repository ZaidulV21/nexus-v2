import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, CreditCard, Download, Eye, ExternalLink, Mail, Receipt, RefreshCw, Printer } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { Modal, ModalClose, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { EntityAuditLog } from '@/components/common/EntityAuditLog';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useToast } from '@/hooks/useToast';
import { useCancelInvoice, useInvoice, useInvoicePdfUrl, usePaymentHistory, useRegenerateInvoicePdf, useSendInvoice, useReceiptUrl, useSendReceipt, useResendReceipt } from '@/queries/useInvoices';
import { ApiError } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import type { Invoice, Payment } from '@/types';
import { RecordPaymentModal } from './components/RecordPaymentModal';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{value || '-'}</div>
    </div>
  );
}

function getClientName(invoice: Invoice) {
  if (!invoice.client) return '—';
  return invoice.client.companyName || invoice.client.contactName;
}

function getProjectNumber(invoice: Invoice) {
  return invoice.project?.projectNumber ?? '—';
}

function PaymentSummaryCards({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Invoice Total</p>
          <p className="mt-1 font-mono text-lg font-semibold text-ink">{formatCurrency(invoice.grandTotal)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Total Paid</p>
          <p className="mt-1 font-mono text-lg font-semibold text-success">{formatCurrency(invoice.paidAmount ?? 0)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Outstanding Balance</p>
          <p className="mt-1 font-mono text-lg font-semibold text-ink">{formatCurrency(invoice.outstandingAmount ?? 0)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Payments</p>
          <p className="mt-1 font-mono text-lg font-semibold text-ink">{invoice.paymentCount ?? invoice.payments.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Status</p>
          <div className="mt-1">
            <StatusBadge status={invoice.displayStatus ?? invoice.status} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceOverview({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number" value={<span className="font-mono">{invoice.invoiceNumber}</span>} />
            <Field label="Client" value={getClientName(invoice)} />
            <Field label="Related project" value={getProjectNumber(invoice)} />
            <Field label="Related quotation" value={invoice.relatedQuotation?.quotationNumber ?? '-'} />
            <Field label="Issue date" value={formatDateTime(invoice.issuedAt)} />
            <Field label="Due date" value={invoice.dueDate ? formatDateTime(invoice.dueDate) : 'Not provided'} />
            <Field label="Status" value={<StatusBadge status={invoice.displayStatus ?? invoice.status} />} />
            <Field label="Total amount" value={formatCurrency(invoice.grandTotal)} />
            <Field label="GST" value={formatCurrency(invoice.gstAmount)} />
            <Field label="Paid amount" value={formatCurrency(invoice.paidAmount ?? 0)} />
            <Field label="Outstanding amount" value={formatCurrency(invoice.outstandingAmount ?? 0)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linked records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="secondary" size="sm" className="w-full justify-between">
              <Link to={ROUTES.projectDetail(invoice.projectId)}>
                Project {getProjectNumber(invoice)}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
            {invoice.relatedQuotation && (
              <Button asChild variant="secondary" size="sm" className="w-full justify-between">
                <Link to={ROUTES.quotationDetail(invoice.relatedQuotation.id)}>
                  Quotation {invoice.relatedQuotation.quotationNumber}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.items.length === 0 ? (
            <EmptyState title="No invoice items" description="Invoice line items will appear here." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {invoice.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.description}</p>
                    <p className="text-xs text-ink-faint">
                      HSN/SAC {item.hsnSacCode} | {item.quantity} x {formatCurrency(item.unitPrice)} | GST {item.taxRate}%
                    </p>
                  </div>
                  <div className="text-sm text-ink-muted">
                    Tax {formatCurrency(item.taxAmount)} | Total {formatCurrency(item.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentHistory({ invoice }: { invoice: Invoice }) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { data: payments, isLoading } = usePaymentHistory(invoice.id, sortOrder);
  const displayPayments = payments ?? invoice.payments;
  const { toast } = useToast();
  const sendReceipt = useSendReceipt(invoice.id);
  const resendReceipt = useResendReceipt(invoice.id);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (displayPayments.length === 0) {
    return <EmptyState title="No payments recorded" description="Payments recorded through the backend will appear here." />;
  }

  async function handleSendReceipt(paymentId: string) {
    try {
      await sendReceipt.mutateAsync(paymentId);
      toast({ title: 'Receipt sent', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not send receipt',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleResendReceipt(paymentId: string) {
    try {
      await resendReceipt.mutateAsync(paymentId);
      toast({ title: 'Receipt resent', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not resend receipt',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {displayPayments.length} payment{displayPayments.length !== 1 ? 's' : ''} recorded
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {displayPayments.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            onSendReceipt={handleSendReceipt}
            onResendReceipt={handleResendReceipt}
            isSending={sendReceipt.isPending || resendReceipt.isPending}
          />
        ))}
      </ul>
    </div>
  );
}

function PaymentRow({
  payment,
  onSendReceipt,
  onResendReceipt,
  isSending,
}: {
  payment: Payment;
  onSendReceipt: (paymentId: string) => void;
  onResendReceipt: (paymentId: string) => void;
  isSending: boolean;
}) {
  const { data: receiptData } = useReceiptUrl(payment.id);
  const receiptUrl = receiptData?.pdfUrl ?? payment.receiptUrl ?? null;

  return (
    <li className="px-4 py-3">
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Amount" value={formatCurrency(payment.amount)} />
        <Field label="Date & Time" value={formatDateTime(payment.paidAt)} />
        <Field label="Payment Method" value={payment.method} />
        <Field label="Transaction Reference" value={payment.transactionReference ?? '-'} />
        <Field label="Notes" value={payment.referenceNote ?? '-'} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {receiptUrl && (
          <>
            <Button asChild variant="secondary" size="sm">
              <a href={receiptUrl} target="_blank" rel="noreferrer">
                <Eye className="h-3.5 w-3.5" /> Receipt
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={receiptUrl} download>
                <Download className="h-3.5 w-3.5" /> Download Receipt
              </a>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const win = window.open(receiptUrl, '_blank');
                win?.print();
              }}
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          size="sm"
          loading={isSending}
          onClick={() => onSendReceipt(payment.id)}
        >
          <Mail className="h-3.5 w-3.5" /> Send Receipt
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={isSending}
          onClick={() => onResendReceipt(payment.id)}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Resend Receipt
        </Button>
      </div>
    </li>
  );
}

function CancelInvoiceModal({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}) {
  const [reason, setReason] = useState('');
  const mutation = useCancelInvoice(invoice.id);
  const { toast } = useToast();

  async function handleSubmit() {
    try {
      await mutation.mutateAsync(reason);
      toast({ title: 'Invoice cancelled', variant: 'success' });
      setReason('');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not cancel invoice',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Cancel invoice" description={`Invoice ${invoice.invoiceNumber}`}>
        <div className="flex flex-col gap-4">
          <FormField label="Reason" htmlFor="cancel-reason">
            <Textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Reason required by backend"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button variant="danger" size="sm" loading={mutation.isPending} onClick={handleSubmit}>
              Cancel invoice
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError, refetch } = useInvoice(id);
  const { data: pdfData } = useInvoicePdfUrl(id);
  const regeneratePdf = useRegenerateInvoicePdf();
  const paymentModal = useDisclosure(false);
  const cancelModal = useDisclosure(false);
  const { toast } = useToast();
  const sendInvoice = useSendInvoice(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !invoice) {
    return <ErrorState description="Couldn't load this invoice." onRetry={refetch} />;
  }

  const pdfUrl = pdfData?.pdfUrl ?? invoice.pdfUrl ?? null;

  async function handleSend(resend: boolean) {
    try {
      await sendInvoice.mutateAsync(resend);
      toast({ title: resend ? 'Invoice resent' : 'Invoice sent', variant: 'success' });
    } catch (err) {
      toast({
        title: resend ? 'Could not resend invoice' : 'Could not send invoice',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  async function handleRegeneratePdf() {
    if (!id) return;
    try {
      await regeneratePdf.mutateAsync(id);
      toast({ title: 'PDF regenerated', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not regenerate PDF',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${getClientName(invoice)} | Project ${getProjectNumber(invoice)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
              <Receipt className="h-4 w-4" /> Invoice
            </span>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegeneratePdf}
              loading={regeneratePdf.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate PDF
            </Button>
            <Button variant="secondary" size="sm" loading={sendInvoice.isPending} onClick={() => handleSend(false)}>
              <Mail className="h-3.5 w-3.5" /> Send
            </Button>
            <Button variant="secondary" size="sm" loading={sendInvoice.isPending} onClick={() => handleSend(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Resend
            </Button>
            {(invoice.outstandingAmount ?? 0) > 0 && (
              <Button size="sm" onClick={paymentModal.open}>
                <CreditCard className="h-3.5 w-3.5" /> Record payment
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={cancelModal.open}>
              <Ban className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        }
      />

      <PaymentSummaryCards invoice={invoice} />

      <Card className="mt-4">
        <CardContent className="pt-5">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-5">
              <InvoiceOverview invoice={invoice} />
            </TabsContent>
            <TabsContent value="payments" className="pt-5">
              <PaymentHistory invoice={invoice} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="INVOICE" entityId={invoice.id} />
            </TabsContent>
            <TabsContent value="audit" className="pt-5">
              <EntityAuditLog entityType="INVOICE" entityId={invoice.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RecordPaymentModal open={paymentModal.isOpen} onOpenChange={paymentModal.setIsOpen} invoice={invoice} />
      <CancelInvoiceModal open={cancelModal.isOpen} onOpenChange={cancelModal.setIsOpen} invoice={invoice} />
    </div>
  );
}

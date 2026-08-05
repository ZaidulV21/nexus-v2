import { useState, useCallback, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreditCard, Download, Eye, Globe, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EntityTimeline } from '@/components/common/EntityTimeline';
import {
  useMyInvoice,
  usePaymentHistory,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
  useInvoicePdfUrl,
  useReceiptUrl,
} from '@/queries/useInvoices';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/routes';
import { ApiError } from '@/lib/api';
import type { Invoice, Payment } from '@/types';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{value || '-'}</div>
    </div>
  );
}

function PaymentSummaryCards({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Status</p>
          <div className="mt-1">
            <StatusBadge status={invoice.displayStatus ?? invoice.status} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceSummary({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number" value={<span className="font-mono">{invoice.invoiceNumber}</span>} />
            <Field label="Label" value={invoice.label} />
            <Field
              label="Project"
              value={
                <Link to={ROUTES.portal.projectDetail(invoice.projectId)} className="text-accent hover:underline">
                  {invoice.project?.projectNumber ?? '—'}
                </Link>
              }
            />
            <Field label="Status" value={<StatusBadge status={invoice.displayStatus ?? invoice.status} />} />
            <Field label="Issued" value={formatDateTime(invoice.issuedAt)} />
            {invoice.status === 'CANCELLED' && <Field label="Cancellation reason" value={invoice.cancelReason} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Grand total</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(invoice.grandTotal)}</p>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Paid</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">{formatCurrency(invoice.paidAmount ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-4">
              <p className="text-xs uppercase tracking-wide text-ink-faint">Outstanding</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink">
                {formatCurrency(invoice.outstandingAmount ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.items.length === 0 ? (
            <EmptyState title="No line items" description="Line items will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 font-medium">HSN/SAC</th>
                    <th className="pb-2 pr-4 text-right font-medium">Qty / Unit</th>
                    <th className="pb-2 pr-4 text-right font-medium">Unit price</th>
                    <th className="pb-2 pr-4 text-right font-medium">Tax</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4 text-ink">{item.description}</td>
                      <td className="py-2.5 pr-4 font-mono text-ink-muted">{item.hsnSacCode}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-muted">
                        {Number(item.quantity)}
                        {item.unit && item.unit !== 'None' ? ` ${item.unit}` : ''}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-ink-muted">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2.5 pr-4 text-right text-ink-muted">
                        {Number(item.taxRate)}% ({formatCurrency(item.taxAmount)})
                      </td>
                      <td className="py-2.5 text-right font-medium text-ink">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border text-sm">
                    <td colSpan={5} className="py-2 pr-4 text-right text-ink-muted">
                      Subtotal
                    </td>
                    <td className="py-2 text-right font-medium text-ink">{formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="py-2 pr-4 text-right text-ink-muted">
                      GST
                    </td>
                    <td className="py-2 text-right font-medium text-ink">{formatCurrency(invoice.gstAmount)}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="py-2 pr-4 text-right font-medium text-ink">
                      Grand total
                    </td>
                    <td className="py-2 text-right font-semibold text-ink">{formatCurrency(invoice.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const { data: receiptData } = useReceiptUrl(payment.id);
  const receiptUrl = receiptData?.pdfUrl ?? payment.receiptUrl ?? null;

  return (
    <li className="px-4 py-3">
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Date" value={formatDateTime(payment.paidAt)} />
        <Field label="Amount" value={formatCurrency(payment.amount)} />
        <Field label="Payment Method" value={payment.method} />
        <Field label="Transaction Reference" value={payment.transactionReference ?? '-'} />
        <Field label="Notes" value={payment.referenceNote ?? '-'} />
      </div>
      {receiptUrl && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href={receiptUrl} target="_blank" rel="noreferrer">
              <Eye className="h-3.5 w-3.5" /> View Receipt
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={receiptUrl} download>
              <Download className="h-3.5 w-3.5" /> Download Receipt
            </a>
          </Button>
        </div>
      )}
    </li>
  );
}

function PaymentHistory({ invoice }: { invoice: Invoice }) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { data: payments, isLoading } = usePaymentHistory(invoice.id, sortOrder);
  const displayPayments = payments ?? invoice.payments;

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (displayPayments.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No payments recorded yet"
        description="Payments recorded by the business against this invoice will appear here."
      />
    );
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
          <PaymentRow key={payment.id} payment={payment} />
        ))}
      </ul>
    </div>
  );
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PortalInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError, refetch } = useMyInvoice(id);
  const { data: pdfData } = useInvoicePdfUrl(id);
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateRazorpayOrder();
  const { mutateAsync: verifyPayment } = useVerifyRazorpayPayment();
  const [isPaying, setIsPaying] = useState(false);

  const handlePayOnline = useCallback(async () => {
    if (!invoice) return;
    setIsPaying(true);
    try {
      const order = await createOrder(invoice.id);
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load payment gateway. Please try again.');
        return;
      }
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Nexus',
        description: `Invoice ${invoice.invoiceNumber}`,
        order_id: order.orderId,
        handler: async function (response: any) {
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 409)) {
              // Payment failed to verify and was not already recorded.
              alert(err instanceof ApiError ? err.message : 'Payment verification failed. Please try again.');
            }
            // 409: the payment was already recorded - typically because the
            // Razorpay webhook landed first. Not an error; refresh to show it.
          } finally {
            refetch();
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsPaying(false);
          },
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function () {
        setIsPaying(false);
      });
      rzp.open();
    } catch {
      setIsPaying(false);
    }
  }, [invoice, createOrder, verifyPayment, refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !invoice) {
    return <ErrorState description="Couldn't load this invoice." onRetry={refetch} />;
  }

  const pdfUrl = pdfData?.pdfUrl ?? invoice.pdfUrl ?? null;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.label} · ${invoice.project?.projectNumber ?? '—'}`}
          actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={invoice.displayStatus ?? invoice.status} />
            {pdfUrl && (
              <Button variant="secondary" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </a>
              </Button>
            )}
            {invoice.status !== 'CANCELLED' && (invoice.outstandingAmount ?? 0) > 0 && (
              <Button variant="secondary" size="sm" onClick={handlePayOnline} disabled={isCreatingOrder || isPaying}>
                {isCreatingOrder || isPaying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                {isCreatingOrder ? 'Creating Order...' : isPaying ? 'Opening Checkout...' : 'Pay Online'}
              </Button>
            )}
          </div>
        }
      />

      <PaymentSummaryCards invoice={invoice} />

      <Card className="mt-4">
        <CardContent className="pt-5">
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="pt-5">
              <InvoiceSummary invoice={invoice} />
            </TabsContent>

            <TabsContent value="payments" className="pt-5">
              <PaymentHistory invoice={invoice} />
            </TabsContent>

            <TabsContent value="timeline" className="pt-5">
              <EntityTimeline entityType="INVOICE" entityId={invoice.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {invoice.status !== 'CANCELLED' && (invoice.outstandingAmount ?? 0) > 0 && !isPaying && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
          <Globe className="h-4 w-4 shrink-0" />
          Pay online via debit/credit card, UPI, net banking, or wallet.
        </div>
      )}
    </div>
  );
}

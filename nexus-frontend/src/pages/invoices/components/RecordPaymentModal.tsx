import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { useRecordPayment } from '@/queries/useInvoices';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Invoice } from '@/types';

export function RecordPaymentModal({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const mutation = useRecordPayment(invoice.id, invoice.projectId);
  const { toast } = useToast();

  const outstanding = invoice.outstandingAmount ?? Number(invoice.grandTotal) - (invoice.paidAmount ?? 0);
  const isFullyPaid = outstanding <= 0;

  async function handleSubmit() {
    if (isFullyPaid) {
      toast({ title: 'This invoice has already been fully paid.', variant: 'warning' });
      return;
    }
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      toast({ title: 'Enter an amount greater than zero.', variant: 'danger' });
      return;
    }
    if (numAmount > outstanding) {
      toast({ title: `Amount cannot exceed the outstanding balance of ${formatCurrency(outstanding)}.`, variant: 'danger' });
      return;
    }
    try {
      await mutation.mutateAsync({
        amount: numAmount,
        method,
        transactionReference: transactionReference || undefined,
        referenceNote: referenceNote || undefined,
      });
      toast({ title: 'Payment recorded', variant: 'success' });
      setAmount('');
      setMethod('');
      setTransactionReference('');
      setReferenceNote('');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not record payment',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Record payment" description={`Invoice ${invoice.invoiceNumber} — Outstanding: ${formatCurrency(outstanding)}`}>
        <div className="flex flex-col gap-4">
          {isFullyPaid && (
            <div className="flex items-center gap-2 rounded-md bg-success-subtle px-3 py-2 text-sm text-success">
              <CheckCircle className="h-4 w-4 shrink-0" />
              This invoice is fully paid. No further payments are needed.
            </div>
          )}
          <FormField label={`Amount (max ${formatCurrency(outstanding)})`} htmlFor="payment-amount">
            <Input
              id="payment-amount"
              type="number"
              min="0.01"
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount received"
              disabled={isFullyPaid}
            />
          </FormField>
          <FormField label="Payment method" htmlFor="payment-method">
            <Input
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              placeholder="UPI, bank transfer, cash..."
              disabled={isFullyPaid}
            />
          </FormField>
          <FormField label="Transaction / UTR / Reference Number" htmlFor="payment-transaction-ref">
            <Input
              id="payment-transaction-ref"
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              placeholder="e.g. UTR123456789"
              disabled={isFullyPaid}
            />
          </FormField>
          <FormField label="Notes" htmlFor="payment-reference">
            <Textarea
              id="payment-reference"
              rows={2}
              value={referenceNote}
              onChange={(event) => setReferenceNote(event.target.value)}
              placeholder="Optional notes"
              disabled={isFullyPaid}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                {isFullyPaid ? 'Close' : 'Cancel'}
              </Button>
            </ModalClose>
            {!isFullyPaid && (
              <Button size="sm" loading={mutation.isPending} onClick={handleSubmit}>
                Record payment
              </Button>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

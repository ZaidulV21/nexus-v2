import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/useToast';
import { useRecordPayment } from '@/queries/useInvoices';
import { ApiError } from '@/lib/api';
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
  const [referenceNote, setReferenceNote] = useState('');
  const mutation = useRecordPayment(invoice.id, invoice.projectId);
  const { toast } = useToast();

  async function handleSubmit() {
    try {
      await mutation.mutateAsync({
        amount: Number(amount),
        method,
        referenceNote: referenceNote || undefined,
      });
      toast({ title: 'Payment recorded', variant: 'success' });
      setAmount('');
      setMethod('');
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
      <ModalContent title="Record payment" description={`Invoice ${invoice.invoiceNumber}`}>
        <div className="flex flex-col gap-4">
          <FormField label="Amount" htmlFor="payment-amount">
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount received"
            />
          </FormField>
          <FormField label="Payment method" htmlFor="payment-method">
            <Input
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              placeholder="UPI, bank transfer, cash..."
            />
          </FormField>
          <FormField label="Reference / notes" htmlFor="payment-reference">
            <Textarea
              id="payment-reference"
              rows={2}
              value={referenceNote}
              onChange={(event) => setReferenceNote(event.target.value)}
              placeholder="Optional"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button size="sm" loading={mutation.isPending} onClick={handleSubmit}>
              Record payment
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

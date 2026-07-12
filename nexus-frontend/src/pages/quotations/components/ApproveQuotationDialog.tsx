import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { useApproveQuotation } from '@/queries/useQuotations';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';

export function ApproveQuotationDialog({
  open,
  onOpenChange,
  versionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId?: string | null;
}) {
  const [method, setMethod] = useState<'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON'>('PHONE');
  const approveMutation = useApproveQuotation();
  const { toast } = useToast();

  async function handleConfirm() {
    if (!versionId) return;
    try {
      await approveMutation.mutateAsync({ versionId, input: { approvalMethod: method } });
      toast({ title: 'Quotation approved', description: 'The active version is now approved.', variant: 'success' });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Could not approve quotation',
        description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
        variant: 'danger',
      });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Approve this quotation?"
      description="This action uses the backend workflow and marks the active version as approved."
      confirmLabel="Approve"
      loading={approveMutation.isPending}
      onConfirm={handleConfirm}
    >
      <div className="mb-4">
        <FormField label="Approval method" htmlFor="approval-method">
          <Select value={method} onValueChange={(value) => setMethod(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHONE">Phone</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="IN_PERSON">In person</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

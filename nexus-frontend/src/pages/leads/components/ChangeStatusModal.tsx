import { useState } from 'react';
import { Modal, ModalContent, ModalClose } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/hooks/useToast';
import { useUpdateLeadServiceStatus } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';
import { LEAD_SERVICE_STATUSES, type LeadService as LeadServiceRecord } from '@/types';

// We deliberately do NOT encode the workflow graph (which transitions are
// legal) here - that would duplicate the backend's Status Engine. We offer
// every known status as an option and let the backend accept or reject the
// transition; its rejection message is surfaced to the user verbatim.
export function ChangeStatusModal({
  open,
  onOpenChange,
  leadId,
  leadService,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadService: LeadServiceRecord;
}) {
  const [toStatus, setToStatus] = useState(leadService.status);
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const mutation = useUpdateLeadServiceStatus(leadId);

  async function handleSubmit() {
    try {
      await mutation.mutateAsync({
        leadServiceId: leadService.id,
        input: { toStatus, reason: reason || undefined },
      });
      toast({ title: 'Status updated', description: `${leadService.service?.name ?? 'Service'} moved to ${toStatus}`, variant: 'success' });
      onOpenChange(false);
      setReason('');
    } catch (err) {
      // Illegal transitions, missing site-visit-skip reasons, etc. are all
      // enforced server-side - we just relay whatever message it returns.
      toast({
        title: 'Status change rejected',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={`Update status - ${leadService.service?.name ?? 'Service'}`}
        description={`Currently: ${leadService.status}`}
      >
        <div className="flex flex-col gap-4">
          <FormField label="New status" htmlFor="toStatus">
            <Select value={toStatus} onValueChange={(value) => setToStatus(value as (typeof LEAD_SERVICE_STATUSES)[number])}>
              <SelectTrigger id="toStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SERVICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Reason"
            htmlFor="reason"
            hint="Required only if this skips the Site Visit stage - the backend will tell you if it's needed."
          >
            <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
          </FormField>

          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button size="sm" loading={mutation.isPending} onClick={handleSubmit}>
              Update status
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

import { useState } from 'react';
import { Modal, ModalContent, ModalClose } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useActiveServices, useAddLeadService } from '@/queries/useLeads';
import { ApiError } from '@/lib/api';

export function AddServiceModal({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}) {
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  const { data: services, isLoading: servicesLoading } = useActiveServices();
  const mutation = useAddLeadService(leadId);
  const { toast } = useToast();

  async function handleSubmit() {
    if (!serviceId) {
      toast({ title: 'Select a service first', variant: 'warning' });
      return;
    }
    try {
      await mutation.mutateAsync({ serviceId, questionnaireAnswers: notes ? { notes } : undefined });
      toast({ title: 'Service added to lead', variant: 'success' });
      onOpenChange(false);
      setServiceId('');
      setNotes('');
    } catch (err) {
      toast({
        title: 'Could not add service',
        description: err instanceof ApiError ? err.message : 'Something went wrong.',
        variant: 'danger',
      });
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title="Add a service" description="Adds a new service to this lead, independently tracked from here.">
        <div className="flex flex-col gap-4">
          {servicesLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <FormField label="Service" htmlFor="addServiceId">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger id="addServiceId">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services?.items.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField label="Requirement notes" htmlFor="addServiceNotes" hint="Optional">
            <Textarea id="addServiceNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <ModalClose asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button size="sm" loading={mutation.isPending} onClick={handleSubmit}>
              Add service
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

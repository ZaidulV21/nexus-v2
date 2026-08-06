import { useState } from 'react';
import { Check, Wrench } from 'lucide-react';
import { Modal, ModalContent, ModalClose } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useActiveServices, useAddLeadService } from '@/queries/useLeads';
import { usePublicSubServices } from '@/queries/usePublicSubServices';
import { cn } from '@/lib/utils';
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
  const [subServiceIds, setSubServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const { data: services, isLoading: servicesLoading } = useActiveServices();
  const { data: subServices = [], isLoading: subsLoading } = usePublicSubServices(serviceId || undefined);
  const mutation = useAddLeadService(leadId);
  const { toast } = useToast();

  function toggleSubService(id: string) {
    setSubServiceIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    );
  }

  async function handleSubmit() {
    if (!serviceId) {
      toast({ title: 'Select a service first', variant: 'warning' });
      return;
    }
    try {
      await mutation.mutateAsync({
        serviceId,
        ...(subServiceIds.length > 0 ? { subServiceIds } : {}),
        questionnaireAnswers: notes ? { notes } : undefined,
      });
      toast({ title: 'Service added to lead', variant: 'success' });
      onOpenChange(false);
      setServiceId('');
      setSubServiceIds([]);
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
              <Select
                value={serviceId}
                onValueChange={(value) => {
                  setServiceId(value);
                  setSubServiceIds([]);
                }}
              >
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

          {serviceId && subsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            serviceId &&
            subServices.length > 0 && (
              <FormField label="Sub services (optional, multi-select)" hint="One service can cover multiple options">
                <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-xl border border-border p-2">
                  {subServices.map((sub) => {
                    const isSelected = subServiceIds.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubService(sub.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                          isSelected ? 'border-accent bg-accent-subtle/40' : 'border-border hover:border-border-strong'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                            isSelected ? 'border-accent bg-accent text-white' : 'border-border-strong'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <Wrench className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <span className="text-sm text-ink">{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>
            )
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

import { useState } from 'react';
import { Modal, ModalContent, ModalClose } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/hooks/useToast';
import { useUpdateProjectServiceStatus } from '@/queries/useProjects';
import { ApiError } from '@/lib/api';
import { MANUAL_PROJECT_SERVICE_STATUSES, type ProjectService } from '@/types';

// Only execution statuses are offered - PROJECT CREATED is the
// system-assigned starting point and is never a manual target. Which
// transitions are legal stays with the backend Status Engine; its
// rejection message is surfaced verbatim.
export function ProjectServiceStatusModal({
  open,
  onOpenChange,
  projectId,
  projectService,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectService: ProjectService;
}) {
  const isCurrentStatusManual = (MANUAL_PROJECT_SERVICE_STATUSES as readonly string[]).includes(projectService.status);
  const [toStatus, setToStatus] = useState<string>(
    isCurrentStatusManual ? projectService.status : MANUAL_PROJECT_SERVICE_STATUSES[0]
  );
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const mutation = useUpdateProjectServiceStatus(projectId);

  async function handleSubmit() {
    try {
      await mutation.mutateAsync({
        projectServiceId: projectService.id,
        input: { toStatus, reason: reason || undefined },
      });
      toast({
        title: 'Status updated',
        description: `${projectService.service?.name ?? 'Service'} moved to ${toStatus}`,
        variant: 'success',
      });
      onOpenChange(false);
      setReason('');
    } catch (err) {
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
        title={`Update status - ${projectService.service?.name ?? 'Service'}`}
        description={`Currently: ${projectService.status}`}
      >
        <div className="flex flex-col gap-4">
          <FormField label="New status" htmlFor="project-toStatus">
            <Select value={toStatus} onValueChange={setToStatus}>
              <SelectTrigger id="project-toStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_PROJECT_SERVICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Reason"
            htmlFor="project-status-reason"
            hint="Required only when the backend Status Engine requires one."
          >
            <Textarea
              id="project-status-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
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
              Update status
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

import { AlertTriangle } from 'lucide-react';
import { Modal, ModalContent, ModalClose } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent title={title} description={description} className="max-w-sm">
        {destructive && (
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-danger-subtle">
            <AlertTriangle className="h-4 w-4 text-danger" />
          </div>
        )}
        {children}
        <div className="mt-2 flex justify-end gap-2">
          <ModalClose asChild>
            <Button variant="secondary" size="sm">
              {cancelLabel}
            </Button>
          </ModalClose>
          <Button variant={destructive ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

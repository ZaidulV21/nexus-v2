import { useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDisclosure } from '@/hooks/useDisclosure';
import { ChangeStatusModal } from './ChangeStatusModal';
import { AddServiceModal } from './AddServiceModal';
import type { Lead, LeadService as LeadServiceRecord } from '@/types';

export function LeadServicesPanel({ lead }: { lead: Lead }) {
  const addServiceModal = useDisclosure(false);
  const [editingService, setEditingService] = useState<LeadServiceRecord | null>(null);
  const services = lead.leadServices ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{services.length} service{services.length === 1 ? '' : 's'}</p>
        {!lead.convertedAt && (
          <Button variant="secondary" size="sm" onClick={addServiceModal.open}>
            <Plus className="h-3.5 w-3.5" /> Add service
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <EmptyState title="No services on this lead" description="This shouldn't normally happen - every lead is created with at least one service." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {services.map((ls) => (
            <li key={ls.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{ls.service?.name ?? 'Service'}</p>
                  <p className="text-xs text-ink-faint">{ls.service?.category?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={ls.status} />
                <button
                  onClick={() => setEditingService(ls)}
                  className="flex items-center gap-0.5 text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Change <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddServiceModal open={addServiceModal.isOpen} onOpenChange={addServiceModal.setIsOpen} leadId={lead.id} />

      {editingService && (
        <ChangeStatusModal
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
          leadId={lead.id}
          leadService={editingService}
        />
      )}
    </div>
  );
}

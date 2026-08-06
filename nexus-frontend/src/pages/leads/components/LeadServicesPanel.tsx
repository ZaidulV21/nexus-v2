import { useState } from 'react';
import { Plus, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDisclosure } from '@/hooks/useDisclosure';
import { ChangeStatusModal } from './ChangeStatusModal';
import { AddServiceModal } from './AddServiceModal';
import { MANUAL_LEAD_SERVICE_STATUSES, type Lead, type LeadService as LeadServiceRecord } from '@/types';

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
          {services.map((ls) => {
            // Each LeadService is independent. A service is locked only
            // when its status is backend-controlled (QUOTE SENT, PROJECT
            // CREATED). Converting one service never locks the others.
            const isBackendControlled = !(MANUAL_LEAD_SERVICE_STATUSES as readonly string[]).includes(ls.status);
            const isLocked = isBackendControlled;
            const subBadges = (ls.subServices ?? []).map((lss) => (
              <span
                key={lss.id}
                className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white"
              >
                {lss.subService?.name ?? lss.subServiceId}
              </span>
            ));
            return (
              <li key={ls.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {ls.service?.name ?? 'Service'}
                      {subBadges.length > 0 && (
                        <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
                          {subBadges}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint">{ls.service?.category?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={ls.status} />
                  {isLocked ? (
                    <span
                      className="flex items-center gap-1 text-xs text-ink-faint"
                      title="This status is updated automatically by the quotation/project workflow"
                    >
                      <Lock className="h-3 w-3" /> Auto
                    </span>
                  ) : (
                    <button
                      onClick={() => setEditingService(ls)}
                      className="flex items-center gap-0.5 text-xs font-medium text-accent hover:text-accent-hover"
                    >
                      Change <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
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

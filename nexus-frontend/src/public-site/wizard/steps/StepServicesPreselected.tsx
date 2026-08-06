import { motion } from 'framer-motion';
import { Lock, Layers, Check, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubServiceOption {
  id: string;
  name: string;
  shortDescription?: string | null;
}

interface StepServicesPreselectedProps {
  /** The service pinned by the deep link - locked, never re-selectable. */
  service: { id: string; name: string } | undefined;
  /** Active sub-options under the pinned service the client can add. */
  subServices: SubServiceOption[];
  /** Currently checked sub-service ids. */
  selectedSubServiceIds: string[];
  onToggleSubService: (subServiceId: string) => void;
}

/**
 * Replacement for the Services step when the wizard was opened from a
 * service/sub-service deep link. The service itself is locked (the client
 * already picked it once), but its sub-options stay selectable so a single
 * service can carry multiple sub-services (Interior -> Painting, Flooring,
 * Lighting) in one lead.
 */
export function StepServicesPreselected({
  service,
  subServices,
  selectedSubServiceIds,
  onToggleSubService,
}: StepServicesPreselectedProps) {
  if (!service) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <p className="text-ink-muted">Service not found. Go back and pick one again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-ink">Your Selection</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            The service is locked in for you. You can still add or remove its options below.
          </p>
        </div>
      </div>

      {/* Locked service card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent-subtle/40 p-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <Layers className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{service.name}</p>
          <p className="text-xs text-ink-muted">Service locked — already chosen</p>
        </div>
        <Lock className="h-4 w-4 shrink-0 text-ink-faint" />
      </motion.div>

      {/* Selectable sub-options under the locked service */}
      {subServices.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink">Choose options under {service.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Select one or more — each option is tracked separately on your request.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subServices.map((sub, index) => {
              const isSelected = selectedSubServiceIds.includes(sub.id);
              return (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  type="button"
                  onClick={() => onToggleSubService(sub.id)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200',
                    isSelected
                      ? 'border-accent bg-accent-subtle/50 shadow-sm shadow-accent/10'
                      : 'border-border bg-surface hover:border-border-strong hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                      isSelected ? 'border-accent bg-accent text-white' : 'border-border-strong'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{sub.name}</p>
                    {sub.shortDescription && (
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-1">{sub.shortDescription}</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            {selectedSubServiceIds.length} option{selectedSubServiceIds.length === 1 ? '' : 's'} selected
          </p>
        </div>
      )}
    </div>
  );
}

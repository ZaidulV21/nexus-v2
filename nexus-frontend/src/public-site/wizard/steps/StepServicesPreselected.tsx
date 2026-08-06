import { motion } from 'framer-motion';
import { Lock, Layers, BadgeCheck } from 'lucide-react';

interface StepServicesPreselectedProps {
  services: Array<{ id: string; name: string }>;
  selectedServices: string[];
  /** subServiceId -> display name, for the pinned sub-services. */
  subServiceNames: Record<string, string>;
  selectedSubServices: Record<string, string>;
}

/**
 * Read-only replacement for the Services step when the wizard was opened from
 * a service/sub-service deep link. The client picked their option once on the
 * service page - they never select again here.
 */
export function StepServicesPreselected({
  services,
  selectedServices,
  subServiceNames,
  selectedSubServices,
}: StepServicesPreselectedProps) {
  const pinned = services.filter((s) => selectedServices.includes(s.id));

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-accent">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-ink">Your Selection</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            This option was pre-selected for you. Continue below to share your requirements.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {pinned.map((service) => {
          const subId = selectedSubServices[service.id];
          const subName = subId ? subServiceNames[subId] : undefined;
          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-2xl border border-accent/30 bg-accent-subtle/40 p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{service.name}</p>
                {subName ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
                    <BadgeCheck className="h-3 w-3" />
                    {subName}
                  </span>
                ) : (
                  <p className="text-xs text-ink-muted">All options</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

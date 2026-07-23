import { motion } from 'framer-motion';
import { Check, Palette, Sun, Zap, Camera, Monitor, Globe, ShoppingCart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublicServices } from '@/queries/usePublicServices';

const iconMap: Record<string, React.ElementType> = {
  Palette, Sun, Zap, Camera, Monitor, Globe, ShoppingCart, ShieldCheck,
};

interface StepServicesProps {
  selectedServices: string[];
  onToggle: (serviceId: string) => void;
}

export function StepServices({ selectedServices, onToggle }: StepServicesProps) {
  const { data: services = [], isLoading } = usePublicServices();

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Select Services</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Choose one or more services you need. We'll ask specific questions for each.
      </p>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-canvas" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {services.map((service, index) => {
            const Icon = iconMap[service.icon] || Palette;
            const isSelected = selectedServices.includes(service.id);
            return (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                type="button"
                onClick={() => onToggle(service.id)}
                className={cn(
                  'relative flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-200',
                  isSelected
                    ? 'border-accent bg-accent-subtle/50 shadow-sm shadow-accent/10'
                    : 'border-border bg-surface hover:border-border-strong hover:shadow-sm'
                )}
              >
                {/* Checkbox indicator */}
                <div className={cn(
                  'absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
                  isSelected ? 'border-accent bg-accent text-white' : 'border-border-strong'
                )}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>

                <div className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                  isSelected ? 'bg-accent text-white' : 'bg-accent-subtle text-accent'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 pr-6">
                  <p className="text-sm font-semibold text-ink">{service.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {service.shortDescription}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {selectedServices.length > 0 && (
        <p className="mt-4 text-xs text-ink-faint">
          {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

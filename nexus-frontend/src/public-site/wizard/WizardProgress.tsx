import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardProgressProps {
  steps: string[];
  currentStep: number;
  completedSteps: Set<number>;
}

export function WizardProgress({ steps, currentStep, completedSteps }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-4 overflow-x-auto">
      {steps.map((label, i) => {
        const isActive = i === currentStep;
        const isCompleted = completedSteps.has(i);
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col items-center">
              <motion.div
                layout
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors shrink-0',
                  isCompleted ? 'bg-accent text-white' : isActive ? 'border-2 border-accent text-accent' : 'border-2 border-border text-ink-faint'
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </motion.div>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-[10px] font-medium text-accent whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px w-6 sm:w-10', isCompleted ? 'bg-accent' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

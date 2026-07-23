import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function WizardNavigation({
  isFirstStep,
  isLastStep,
  canProceed,
  onBack,
  onNext,
  onSubmit,
  isSubmitting,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border bg-white px-6 sm:px-8 py-4">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn(
          'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
          isFirstStep ? 'opacity-0 pointer-events-none' : 'border border-border text-ink hover:bg-canvas'
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
          {!isSubmitting && <Send className="h-4 w-4" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

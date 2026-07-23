import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface StepSubmitProps {
  isSubmitting: boolean;
}

export function StepSubmit({ isSubmitting }: StepSubmitProps) {
  return (
    <div className="p-6 sm:p-8 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-subtle"
      >
        <Loader2 className="h-8 w-8 text-accent" />
      </motion.div>
      <h2 className="mt-6 text-xl font-bold text-ink">
        {isSubmitting ? 'Submitting Your Request...' : 'Ready to Submit'}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {isSubmitting ? 'Please wait while we process your quote request.' : 'Click Submit to send your quote request.'}
      </p>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import type { WizardContactInfo } from '../types';

interface StepAccountProps {
  contact: WizardContactInfo;
}

export function StepAccount({ contact }: StepAccountProps) {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Create Your Account</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Set up your Client Portal account to track this quote and manage future projects.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <div className="rounded-2xl border border-border bg-canvas p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
            <Shield className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-ink">Account will be created automatically</h3>
          <p className="mt-2 mx-auto max-w-sm text-sm text-ink-muted leading-relaxed">
            After email verification, a Client Portal account will be created using{' '}
            <span className="font-medium text-ink">{contact.email}</span>.
            You'll receive your login credentials via email.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { WizardContactInfo } from '../types';

interface StepContactProps {
  contact: WizardContactInfo;
  onUpdate: (partial: Partial<WizardContactInfo>) => void;
}

export function StepContact({ contact, onUpdate }: StepContactProps) {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Contact Details</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        How can we reach you? All fields marked with * are required.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Full Name *</label>
            <input
              type="text"
              value={contact.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Your full name"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Email *</label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Phone *</label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Company</label>
            <input
              type="text"
              value={contact.company}
              onChange={(e) => onUpdate({ company: e.target.value })}
              placeholder="Company name (optional)"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Address</label>
          <input
            type="text"
            value={contact.address}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="Street address"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">City</label>
            <input
              type="text"
              value={contact.city}
              onChange={(e) => onUpdate({ city: e.target.value })}
              placeholder="City"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">State</label>
            <input
              type="text"
              value={contact.state}
              onChange={(e) => onUpdate({ state: e.target.value })}
              placeholder="State"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Country</label>
            <input
              type="text"
              value={contact.country}
              onChange={(e) => onUpdate({ country: e.target.value })}
              placeholder="Country"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Preferred Contact Method</label>
            <select
              value={contact.preferredContact}
              onChange={(e) => onUpdate({ preferredContact: e.target.value })}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Preferred Contact Time</label>
            <select
              value={contact.preferredTime}
              onChange={(e) => onUpdate({ preferredTime: e.target.value })}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="morning">Morning (9 AM - 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
              <option value="evening">Evening (4 PM - 7 PM)</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Edit2, User, Mail, Phone, Building, MapPin, Clock, MessageSquare, BadgeCheck } from 'lucide-react';
import { usePublicServices } from '@/queries/usePublicServices';
import { getQuestionsForService } from '../serviceQuestions';
import type { WizardState } from '../types';

interface StepReviewProps {
  state: WizardState;
  goTo: (step: number) => void;
  /** subServiceId -> display name, resolved from the public sub-services API. */
  subServiceNames?: Record<string, string>;
}

const PREFERRED_CONTACT_LABELS: Record<string, string> = {
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

const PREFERRED_TIME_LABELS: Record<string, string> = {
  morning: 'Morning (9 AM - 12 PM)',
  afternoon: 'Afternoon (12 PM - 4 PM)',
  evening: 'Evening (4 PM - 7 PM)',
  anytime: 'Anytime',
};

export function StepReview({ state, goTo, subServiceNames = {} }: StepReviewProps) {
  const { data: services = [] } = usePublicServices();
  const selectedServiceData = services.filter((s) => state.selectedServices.includes(s.id));

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Review Your Requirements</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Please review everything before submitting. You can go back to edit any section.
      </p>

      <div className="mt-8 space-y-6">
        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Selected Services</h3>
            <button onClick={() => goTo(0)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedServiceData.map((s) => {
              const subIds = (state.selectedSubServices[s.id] ?? []).filter((id) => subServiceNames[id]);
              return (
                <span key={s.id} className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent inline-flex items-center gap-1">
                  {s.name}
                  {subIds.map((subId) => (
                    <span
                      key={subId}
                      className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      {subServiceNames[subId]}
                    </span>
                  ))}
                </span>
              );
            })}
          </div>
        </motion.div>

        {/* Answers grouped by service */}
        {selectedServiceData.map((service, sIndex) => {
          const config = getQuestionsForService(service.slug);
          const serviceAnswers = state.answers[service.id] || {};
          const hasAnswers = Object.keys(serviceAnswers).length > 0;
          const subIds = (state.selectedSubServices[service.id] ?? []).filter((id) => subServiceNames[id]);

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIndex * 0.05 }}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">{service.name}</h3>
                  {subIds.map((subId) => (
                    <span
                      key={subId}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      {subServiceNames[subId]}
                    </span>
                  ))}
                </div>
                <button onClick={() => goTo(1)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
              </div>

              {hasAnswers && config ? (
                <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  {config.questions.map((q) => {
                    const val = serviceAnswers[q.id];
                    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null;
                    const displayVal = Array.isArray(val)
                      ? val.map((v) => q.options?.find((o) => o.value === v)?.label || v).join(', ')
                      : q.options?.find((o) => o.value === val)?.label || val;
                    return (
                      <div key={q.id}>
                        <dt className="text-ink-faint">{q.label}</dt>
                        <dd className="text-ink mt-0.5">{displayVal}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : hasAnswers ? (
                <p className="mt-2 text-sm text-ink-muted">{serviceAnswers['description'] as string || 'No details provided'}</p>
              ) : (
                <p className="mt-2 text-sm text-ink-faint">No details provided</p>
              )}
            </motion.div>
          );
        })}

        {/* Contact — all fields */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Contact Information</h3>
            <button onClick={() => goTo(2)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <dt className="text-ink-faint">Full Name</dt>
                <dd className="text-ink mt-0.5">{state.contact.name || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <dt className="text-ink-faint">Email</dt>
                <dd className="text-ink mt-0.5">{state.contact.email || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <dt className="text-ink-faint">Phone</dt>
                <dd className="text-ink mt-0.5">{state.contact.phone || '—'}</dd>
              </div>
            </div>
            {state.contact.company && (
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
                <div>
                  <dt className="text-ink-faint">Company</dt>
                  <dd className="text-ink mt-0.5">{state.contact.company}</dd>
                </div>
              </div>
            )}
            {(state.contact.address || state.contact.city || state.contact.state || state.contact.country) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
                <div>
                  <dt className="text-ink-faint">Address</dt>
                  <dd className="text-ink mt-0.5">
                    {[state.contact.address, state.contact.city, state.contact.state, state.contact.country].filter(Boolean).join(', ')}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <dt className="text-ink-faint">Preferred Contact</dt>
                <dd className="text-ink mt-0.5">{PREFERRED_CONTACT_LABELS[state.contact.preferredContact] || state.contact.preferredContact}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <dt className="text-ink-faint">Preferred Time</dt>
                <dd className="text-ink mt-0.5">{PREFERRED_TIME_LABELS[state.contact.preferredTime] || state.contact.preferredTime}</dd>
              </div>
            </div>
          </dl>
        </motion.div>
      </div>
    </div>
  );
}

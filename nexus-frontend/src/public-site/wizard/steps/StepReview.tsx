import { motion } from 'framer-motion';
import { Edit2, FileText, Image, Video } from 'lucide-react';
import { usePublicServices } from '@/queries/usePublicServices';
import { getQuestionsForService } from '../serviceQuestions';
import type { WizardState } from '../types';

interface StepReviewProps {
  state: WizardState;
  goTo: (step: number) => void;
}

const FILE_ICONS = { image: Image, video: Video, document: FileText };

export function StepReview({ state, goTo }: StepReviewProps) {
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
          className="rounded-2xl border border-border bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Selected Services</h3>
            <button onClick={() => goTo(0)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedServiceData.map((s) => (
              <span key={s.id} className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                {s.name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Answers grouped by service */}
        {selectedServiceData.map((service, sIndex) => {
          const config = getQuestionsForService(service.slug);
          const serviceAnswers = state.answers[service.id] || {};
          const hasAnswers = Object.keys(serviceAnswers).length > 0;

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIndex * 0.05 }}
              className="rounded-2xl border border-border bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">{service.name}</h3>
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

        {/* Files */}
        {state.files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Uploaded Files ({state.files.length})</h3>
              <button onClick={() => goTo(2)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.files.map((f) => {
                const FileIcon = FILE_ICONS[f.type];
                return (
                  <span key={f.id} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas border border-border px-2.5 py-1 text-xs text-ink-muted">
                    <FileIcon className="h-3 w-3" />
                    {f.file.name}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Contact Information</h3>
            <button onClick={() => goTo(4)} className="text-xs font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
            <div><dt className="text-ink-faint">Name</dt><dd className="text-ink mt-0.5">{state.contact.name}</dd></div>
            <div><dt className="text-ink-faint">Email</dt><dd className="text-ink mt-0.5">{state.contact.email}</dd></div>
            <div><dt className="text-ink-faint">Phone</dt><dd className="text-ink mt-0.5">{state.contact.phone}</dd></div>
            {state.contact.company && <div><dt className="text-ink-faint">Company</dt><dd className="text-ink mt-0.5">{state.contact.company}</dd></div>}
            {state.contact.city && <div><dt className="text-ink-faint">City</dt><dd className="text-ink mt-0.5">{state.contact.city}</dd></div>}
          </dl>
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BadgeCheck } from 'lucide-react';
import { usePublicServices } from '@/queries/usePublicServices';
import { getQuestionsForService } from '../serviceQuestions';
import { QuestionRenderer } from '../QuestionRenderer';

interface StepQuestionsProps {
  selectedServices: string[];
  answers: Record<string, Record<string, string | string[]>>;
  onAnswer: (serviceId: string, questionId: string, value: string | string[]) => void;
  showErrors?: boolean;
  /** Sub-services pinned per service: { serviceId: string[] } shown as chips. */
  selectedSubServices?: Record<string, string[]>;
  /** subServiceId -> display name, resolved from the public sub-services API. */
  subServiceNames?: Record<string, string>;
}

export function StepQuestions({
  selectedServices,
  answers,
  onAnswer,
  showErrors,
  selectedSubServices = {},
  subServiceNames = {},
}: StepQuestionsProps) {
  const { data: services = [] } = usePublicServices();
  const selectedServiceData = services.filter((s) => selectedServices.includes(s.id));
  const firstInvalidRef = useRef<HTMLDivElement | null>(null);
  const firstInvalidIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (showErrors && firstInvalidRef.current) {
      firstInvalidRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const firstInput = firstInvalidRef.current.querySelector('input, textarea, select, button');
      (firstInput as HTMLElement)?.focus();
    }
  }, [showErrors]);

  if (selectedServiceData.length === 0) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <p className="text-ink-muted">No services selected. Go back to select services first.</p>
      </div>
    );
  }

  const allFirstInvalid = (() => {
    for (const service of selectedServiceData) {
      const config = getQuestionsForService(service.slug);
      if (!config) continue;
      const serviceAnswers = answers[service.id] || {};
      for (const q of config.questions) {
        if (!q.required) continue;
        const val = serviceAnswers[q.id];
        const isEmpty = val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
        if (isEmpty) return `${service.id}::${q.id}`;
      }
    }
    return null;
  })();

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Project Details</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Help us understand your requirements for each selected service.
      </p>

      <div className="mt-8 space-y-8">
        {selectedServiceData.map((service, sIndex) => {
          const config = getQuestionsForService(service.slug);
          const serviceAnswers = answers[service.id] || {};
          const subIds = (selectedSubServices[service.id] ?? []).filter((id) => subServiceNames[id]);

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: sIndex * 0.08 }}
              className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-ink">{service.name}</h3>
                {subIds.map((subId) => (
                  <span
                    key={subId}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {subServiceNames[subId]}
                  </span>
                ))}
              </div>

              {config ? (
                <div className="mt-5 space-y-5">
                  {config.questions.map((q) => {
                    const val = serviceAnswers[q.id];
                    const isEmpty = val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
                    const showFieldError = showErrors && q.required && isEmpty;
                    const fieldId = `${service.id}::${q.id}`;
                    const isFirst = fieldId === allFirstInvalid;

                    if (isFirst) firstInvalidIdRef.current = fieldId;

                    return (
                      <div
                        key={q.id}
                        ref={isFirst ? firstInvalidRef : undefined}
                      >
                        <label className="mb-1.5 block text-sm font-medium text-ink">
                          {q.label}
                          {q.required && <span className="ml-1 text-accent">*</span>}
                        </label>
                        <div className={showFieldError ? 'rounded-xl ring-2 ring-red-400' : ''}>
                          <QuestionRenderer
                            question={q}
                            value={val}
                            onChange={(v) => onAnswer(service.id, q.id, v)}
                          />
                        </div>
                        {showFieldError && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3" /> This field is required
                          </p>
                        )}
                        {q.helpText && !showFieldError && (
                          <p className="mt-1 text-xs text-ink-faint">{q.helpText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-ink">
                    Describe your requirements
                  </label>
                  <textarea
                    rows={3}
                    value={(serviceAnswers['description'] as string) || ''}
                    onChange={(e) => onAnswer(service.id, 'description', e.target.value)}
                    placeholder={`Tell us about your ${service.name.toLowerCase()} requirements...`}
                    className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

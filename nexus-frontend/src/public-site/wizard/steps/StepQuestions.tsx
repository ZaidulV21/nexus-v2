import { motion } from 'framer-motion';
import { usePublicServices } from '@/queries/usePublicServices';
import { getQuestionsForService } from '../serviceQuestions';
import { QuestionRenderer } from '../QuestionRenderer';

interface StepQuestionsProps {
  selectedServices: string[];
  answers: Record<string, Record<string, string | string[]>>;
  onAnswer: (serviceId: string, questionId: string, value: string | string[]) => void;
}

export function StepQuestions({ selectedServices, answers, onAnswer }: StepQuestionsProps) {
  const { data: services = [] } = usePublicServices();
  const selectedServiceData = services.filter((s) => selectedServices.includes(s.id));

  if (selectedServiceData.length === 0) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <p className="text-ink-muted">No services selected. Go back to select services first.</p>
      </div>
    );
  }

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

          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: sIndex * 0.08 }}
              className="rounded-2xl border border-border bg-white p-5 sm:p-6"
            >
              <h3 className="text-base font-semibold text-ink">{service.name}</h3>

              {config ? (
                <div className="mt-5 space-y-5">
                  {config.questions.map((q) => (
                    <div key={q.id}>
                      <label className="mb-1.5 block text-sm font-medium text-ink">
                        {q.label}
                        {q.required && <span className="ml-1 text-accent">*</span>}
                      </label>
                      <QuestionRenderer
                        question={q}
                        value={serviceAnswers[q.id]}
                        onChange={(val) => onAnswer(service.id, q.id, val)}
                      />
                      {q.helpText && (
                        <p className="mt-1 text-xs text-ink-faint">{q.helpText}</p>
                      )}
                    </div>
                  ))}
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

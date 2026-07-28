import { slugify } from '@/lib/utils';
import { getQuestionsForService } from '@/public-site/wizard/serviceQuestions';
import type { Lead } from '@/types';

function resolveValue(val: unknown, options?: Array<{ label: string; value: string }>): string {
  if (val === null || val === undefined || val === '') return '';
  if (Array.isArray(val)) {
    return val
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => options?.find((o) => o.value === v)?.label ?? String(v))
      .join(', ');
  }
  return options?.find((o) => o.value === val)?.label ?? String(val);
}

export function LeadRequirementsPanel({ lead }: { lead: Lead }) {
  const services = lead.leadServices ?? [];

  if (services.length === 0) {
    return <p className="text-sm text-ink-faint">No services on this lead.</p>;
  }

  const hasAnyAnswers = services.some(
    (ls) => ls.questionnaireAnswers && Object.keys(ls.questionnaireAnswers).length > 0
  );

  if (!hasAnyAnswers) {
    return (
      <p className="text-sm text-ink-faint">
        No questionnaire answers submitted for this lead.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {services.map((ls) => {
        const answers = ls.questionnaireAnswers;
        if (!answers || Object.keys(answers).length === 0) return null;

        const serviceName = ls.service?.name ?? 'Unknown Service';
        const slug = slugify(serviceName);
        const config = getQuestionsForService(slug);

        return (
          <div key={ls.id}>
            <h3 className="text-sm font-semibold text-ink mb-3">{serviceName}</h3>
            <div className="rounded-lg border border-border divide-y divide-border">
              {config ? (
                config.questions.map((q) => {
                  const val = answers[q.id];
                  const display = resolveValue(val, q.options);
                  if (!display) return null;
                  return (
                    <div key={q.id} className="flex items-start gap-4 px-4 py-3 text-sm">
                      <dt className="w-1/3 shrink-0 text-ink-faint">{q.label}</dt>
                      <dd className="text-ink">{display}</dd>
                    </div>
                  );
                })
              ) : (
                Object.entries(answers).map(([key, val]) => {
                  const display = resolveValue(val);
                  if (!display) return null;
                  return (
                    <div key={key} className="flex items-start gap-4 px-4 py-3 text-sm">
                      <dt className="w-1/3 shrink-0 text-ink-faint capitalize">{key.replace(/_/g, ' ')}</dt>
                      <dd className="text-ink">{display}</dd>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

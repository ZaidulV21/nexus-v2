import { cn } from '@/lib/utils';
import type { QuestionConfig } from './types';

interface QuestionRendererProps {
  question: QuestionConfig;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

export function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  switch (question.type) {
    case 'text':
      return (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      );

    case 'textarea':
      return (
        <textarea
          rows={3}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          min="0"
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Select...</option>
          {question.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {question.options?.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  'rounded-xl border-2 px-5 py-2.5 text-sm font-medium transition-all',
                  isSelected
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border bg-white text-ink-muted hover:border-border-strong'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex flex-wrap gap-3">
          {question.options?.map((opt) => {
            const selectedValues = (Array.isArray(value) ? value : []) as string[];
            const isSelected = selectedValues.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const newValues = isSelected
                    ? selectedValues.filter((v) => v !== opt.value)
                    : [...selectedValues, opt.value];
                  onChange(newValues);
                }}
                className={cn(
                  'rounded-xl border-2 px-5 py-2.5 text-sm font-medium transition-all',
                  isSelected
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border bg-white text-ink-muted hover:border-border-strong'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

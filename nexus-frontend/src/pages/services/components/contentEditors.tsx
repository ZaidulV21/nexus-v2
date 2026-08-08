import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';

/** Shared shape for { title, description } process steps. */
export interface ProcessStepValue {
  title: string;
  description: string;
}

/** Shared shape for { question, answer } FAQ pairs. */
export interface FaqValue {
  question: string;
  answer: string;
}

/** Shared shape for a customer testimonial. */
export interface TestimonialValue {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
}

/** Editor for a list of plain strings (features / whatsIncluded). */
export function StringListEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        <span className="text-xs text-ink-faint">{values.length}</span>
      </div>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={value}
              className="flex-1"
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${label} item`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          className="flex-1"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (draft.trim()) {
                onChange([...values, draft.trim()]);
                setDraft('');
              }
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (draft.trim()) {
              onChange([...values, draft.trim()]);
              setDraft('');
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

/** Editor for a list of { title, description } steps. */
export function ProcessEditor({
  values,
  onChange,
}: {
  values: ProcessStepValue[];
  onChange: (next: ProcessStepValue[]) => void;
}) {
  return (
    <div className="space-y-3">
      {values.map((step, index) => (
        <div key={index} className="rounded-xl border border-border bg-canvas p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Step {index + 1}</p>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Remove process step"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <Input
              value={step.title}
              placeholder="Step title"
              onChange={(e) => {
                const next = [...values];
                next[index] = { ...step, title: e.target.value };
                onChange(next);
              }}
            />
            <RichTextEditor
              value={step.description}
              onChange={(html) => {
                const next = [...values];
                next[index] = { ...step, description: html };
                onChange(next);
              }}
              placeholder="Describe this step"
              minHeight={100}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...values, { title: '', description: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add step
      </Button>
    </div>
  );
}

/** Editor for a list of { question, answer } pairs. */
export function FaqEditor({
  values,
  onChange,
}: {
  values: FaqValue[];
  onChange: (next: FaqValue[]) => void;
}) {
  return (
    <div className="space-y-3">
      {values.map((faq, index) => (
        <div key={index} className="rounded-xl border border-border bg-canvas p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">FAQ {index + 1}</p>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Remove FAQ"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <Input
              value={faq.question}
              placeholder="Question"
              onChange={(e) => {
                const next = [...values];
                next[index] = { ...faq, question: e.target.value };
                onChange(next);
              }}
            />
            <RichTextEditor
              value={faq.answer}
              onChange={(html) => {
                const next = [...values];
                next[index] = { ...faq, answer: html };
                onChange(next);
              }}
              placeholder="Answer"
              minHeight={100}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...values, { question: '', answer: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add FAQ
      </Button>
    </div>
  );
}

/** Editor for a list of customer testimonials. */
export function TestimonialsEditor({
  values,
  onChange,
}: {
  values: TestimonialValue[];
  onChange: (next: TestimonialValue[]) => void;
}) {
  return (
    <div className="space-y-3">
      {values.map((item, index) => (
        <div key={index} className="rounded-xl border border-border bg-canvas p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Testimonial {index + 1}
            </p>
            <button
              type="button"
              onClick={() => onChange(values.filter((_, i) => i !== index))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Remove testimonial"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={item.name}
                placeholder="Client name"
                onChange={(e) => {
                  const next = [...values];
                  next[index] = { ...item, name: e.target.value };
                  onChange(next);
                }}
              />
              <Input
                value={item.role}
                placeholder="Role (e.g. CEO)"
                onChange={(e) => {
                  const next = [...values];
                  next[index] = { ...item, role: e.target.value };
                  onChange(next);
                }}
              />
              <Input
                value={item.company}
                placeholder="Company"
                onChange={(e) => {
                  const next = [...values];
                  next[index] = { ...item, company: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <Select
                  value={String(item.rating)}
                  onValueChange={(v) => {
                    const next = [...values];
                    next[index] = { ...item, rating: Number(v) };
                    onChange(next);
                  }}
                >
                  <SelectTrigger id="testimonial-rating" aria-label="Rating">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} {r === 1 ? 'star' : 'stars'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={item.avatar ?? ''}
                placeholder="Avatar URL (optional)"
                onChange={(e) => {
                  const next = [...values];
                  next[index] = { ...item, avatar: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <Textarea
              rows={3}
              value={item.content}
              placeholder="What the client said about this service"
              onChange={(e) => {
                const next = [...values];
                next[index] = { ...item, content: e.target.value };
                onChange(next);
              }}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...values, { name: '', role: '', company: '', content: '', rating: 5, avatar: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add testimonial
      </Button>
    </div>
  );
}

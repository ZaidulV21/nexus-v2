import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TestimonialItem } from '../types';

interface TestimonialCardProps {
  testimonial: TestimonialItem;
  index?: number;
}

export function TestimonialCard({ testimonial, index = 0 }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-xs"
    >
      <div className="flex gap-1">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="mt-4 flex-1 text-sm text-ink leading-relaxed">
        &ldquo;{testimonial.content}&rdquo;
      </p>
      <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
          {testimonial.name.split(' ').map((n) => n[0]).join('')}
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{testimonial.name}</p>
          <p className="text-xs text-ink-muted">{testimonial.role}, {testimonial.company}</p>
        </div>
      </div>
    </motion.div>
  );
}

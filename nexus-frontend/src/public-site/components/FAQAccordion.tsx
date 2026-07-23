import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FAQItem } from '../types';

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div
            className={cn(
              'rounded-xl border transition-all duration-200',
              openId === item.id
                ? 'border-accent/30 bg-white shadow-sm'
                : 'border-border bg-white hover:border-border-strong'
            )}
          >
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-ink">{item.question}</span>
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                openId === item.id ? 'bg-accent text-white' : 'bg-canvas text-ink-muted'
              )}>
                {openId === item.id ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </div>
            </button>
            <AnimatePresence>
              {openId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-sm text-ink-muted leading-relaxed">{item.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

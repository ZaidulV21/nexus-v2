import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TestimonialItem } from '../types';

interface TestimonialsCarouselProps {
  testimonials: TestimonialItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function TestimonialsCarousel({ testimonials, autoPlay = false, autoPlayInterval = 6000 }: TestimonialsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, testimonials.length - 1));
    setActiveIndex(clamped);
  }, [testimonials.length]);

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, goNext]);

  const t = testimonials[activeIndex];

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="px-8 pt-10 pb-10 sm:px-12 sm:pt-14 sm:pb-14 lg:px-20 lg:pt-16 lg:pb-16">
          <Quote className="h-8 w-8 text-accent/20 sm:h-10 sm:w-10" />

          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mt-6 flex gap-1">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>

            <blockquote className="mt-5 text-lg leading-relaxed text-ink sm:text-xl lg:text-2xl lg:leading-relaxed">
              &ldquo;{t.content}&rdquo;
            </blockquote>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-sm font-bold text-accent">
                {t.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-sm text-ink-muted">{t.role}, {t.company}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-all',
              activeIndex === 0
                ? 'cursor-not-allowed opacity-40'
                : 'hover:border-accent/30 hover:shadow-sm'
            )}
          >
            <ChevronLeft className="h-4 w-4 text-ink" />
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex === testimonials.length - 1}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-all',
              activeIndex === testimonials.length - 1
                ? 'cursor-not-allowed opacity-40'
                : 'hover:border-accent/30 hover:shadow-sm'
            )}
          >
            <ChevronRight className="h-4 w-4 text-ink" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === activeIndex ? 'w-6 bg-accent' : 'w-2 bg-border hover:bg-border-strong'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceGalleryProps {
  images: string[];
  alt: string;
  className?: string;
}

/**
 * Premium image carousel for service detail pages.
 * Crossfades the active image, supports arrows, dots, thumbnails,
 * and degrades gracefully when fewer than two images are provided.
 */
export function ServiceGallery({ images, alt, className }: ServiceGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const valid = images.filter(Boolean);
  const count = valid.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [alt]);

  if (count === 0) {
    return (
      <div
        className={cn(
          'flex aspect-[16/9] items-center justify-center rounded-2xl bg-gradient-to-br from-accent/15 to-accent-subtle',
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-ink-faint">
          <ImageIcon className="h-10 w-10" />
          <span className="text-sm">Gallery coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-canvas">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeIndex}
            src={valid[activeIndex]}
            alt={`${alt} — image ${activeIndex + 1} of ${count}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>

        {count > 1 && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-all hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md transition-all hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
              {activeIndex + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {valid.map((src, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to image ${index + 1}`}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                index === activeIndex
                  ? 'border-accent shadow-sm'
                  : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

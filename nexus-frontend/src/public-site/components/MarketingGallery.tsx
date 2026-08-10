import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceMedia } from '@/types';

interface MarketingGalleryProps {
  items: ServiceMedia[];
  alt: string;
  className?: string;
}

/**
 * The CMS-driven marketing gallery for a Service: an ordered grid of images
 * and videos with a lightbox. The featured item (when set) is highlighted
 * with a larger tile. Videos play inside the lightbox and show their poster
 * (or the first frame) in the grid.
 */
export function MarketingGallery({ items, alt, className }: MarketingGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (items.length === 0) return;
      setLightbox(((index % items.length) + items.length) % items.length);
    },
    [items.length]
  );

  // Keyboard navigation while the lightbox is open.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') goTo(lightbox - 1);
      if (e.key === 'ArrowRight') goTo(lightbox + 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, goTo]);

  if (items.length === 0) return null;

  const active = lightbox !== null ? items[lightbox] : null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 [grid-auto-flow:dense]">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(index)}
            aria-label={`Open ${item.type === 'VIDEO' ? 'video' : 'image'}: ${item.altText || item.caption || `item ${index + 1}`}`}
            className={cn(
              'group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-canvas transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
              item.isFeatured && 'col-span-2 row-span-2'
            )}
          >
            {item.type === 'VIDEO' ? (
              <video
                src={item.url}
                poster={item.posterUrl ?? undefined}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src={item.url}
                alt={item.altText || ''}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
                {item.type === 'VIDEO' ? <Play className="h-5 w-5" /> : <span className="text-xs font-semibold">View</span>}
              </span>
            </div>

            {item.type === 'VIDEO' && (
              <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Video
              </span>
            )}

            {item.caption && (
              <span className="absolute inset-x-0 bottom-0 translate-y-full px-3 pb-2.5 pt-6 text-left text-xs font-medium text-white transition-transform duration-300 group-hover:translate-y-0">
                {item.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setLightbox(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(lightbox! - 1);
                  }}
                  className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(lightbox! + 1);
                  }}
                  className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="flex max-h-full max-w-6xl flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {active.type === 'VIDEO' ? (
                <video
                  src={active.url}
                  poster={active.posterUrl ?? undefined}
                  controls
                  autoPlay
                  className="max-h-[80vh] w-auto rounded-xl bg-black object-contain"
                />
              ) : (
                <img
                  src={active.url}
                  alt={active.altText || alt}
                  loading="lazy"
                  className="max-h-[80vh] w-auto rounded-xl object-contain"
                />
              )}
              {(active.caption || active.altText) && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-white/90">{active.caption || active.altText}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {lightbox! + 1} of {items.length}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ProjectMedia, PublicPortfolioProject } from '@/types';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80';

/** Pick the thumbnail (featured > first image > video) for a project card. */
function pickThumb(media: ProjectMedia[]): ProjectMedia | undefined {
  const featured = media.find((m) => m.isFeatured && m.type !== 'DOCUMENT');
  if (featured) return featured;
  return media.find((m) => m.type === 'IMAGE') ?? media.find((m) => m.type === 'VIDEO');
}

/** The project media grid + lightbox shown when a portfolio card is opened. */
function PortfolioMediaView({ project }: { project: PublicPortfolioProject }) {
  const media = project.media;
  const documents = media.filter((m) => m.type === 'DOCUMENT');
  const visual = media.filter((m) => m.type !== 'DOCUMENT');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (visual.length === 0) return;
      setLightbox(((index % visual.length) + visual.length) % visual.length);
    },
    [visual.length]
  );

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

  const active = lightbox !== null ? visual[lightbox] : null;

  return (
    <div className="space-y-4">
      {visual.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visual.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(index)}
              aria-label={`Open ${item.type === 'VIDEO' ? 'video' : 'image'}: ${item.altText || item.caption || `item ${index + 1}`}`}
              className={cn(
                'group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-canvas transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg">
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
      )}

      {documents.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Documents
          </p>
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{doc.fileName || doc.title || 'Document'}</p>
                  {doc.caption && <p className="truncate text-xs text-ink-faint">{doc.caption}</p>}
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas"
                >
                  <Download className="h-3.5 w-3.5" /> Open
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
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
            {visual.length > 1 && (
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(lightbox! - 1);
                }}
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                <span className="text-2xl leading-none">‹</span>
              </button>
            )}
            {visual.length > 1 && (
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(lightbox! + 1);
                }}
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                <span className="text-2xl leading-none">›</span>
              </button>
            )}
            <div className="flex max-h-full max-w-6xl flex-col" onClick={(e) => e.stopPropagation()}>
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
                  alt={active.altText || project.title}
                  loading="lazy"
                  className="max-h-[80vh] w-auto rounded-xl object-contain"
                />
              )}
              {(active.caption || active.altText) && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-white/90">{active.caption || active.altText}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {lightbox! + 1} of {visual.length}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {media.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          Media for this project will be added soon.
        </div>
      )}
    </div>
  );
}

/**
 * A completed project on the public website. Shows the project cover (its
 * featured media or first image) and opens a detail modal with all completion
 * media. Clicking the card is the only interaction — the whole card is a
 * button so the grid stays touch-friendly.
 */
export function PortfolioProjectCard({
  project,
  index,
}: {
  project: PublicPortfolioProject;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const thumb = pickThumb(project.media);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        onClick={() => setOpen(true)}
        className="group overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/25"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          {thumb ? (
            thumb.type === 'VIDEO' ? (
              <video
                src={thumb.url}
                poster={thumb.posterUrl ?? undefined}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src={thumb.url}
                alt={thumb.altText || project.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <img
              src={FALLBACK_IMAGE}
              alt={project.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-accent shadow-sm backdrop-blur">
            Completed {formatDate(project.completedAt)}
          </span>
          {project.media.length > 0 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
              {project.media.length} item{project.media.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="p-6">
          <span className="text-xs text-ink-faint">{project.clientName}</span>
          <h3 className="mt-1 text-lg font-semibold text-ink transition-colors group-hover:text-accent">
            {project.title}
          </h3>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.services.slice(0, 4).map((s) => (
              <span key={s.id} className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink-muted">
                {s.name}
              </span>
            ))}
            {project.services.length > 4 && (
              <span className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink-muted">
                +{project.services.length - 4}
              </span>
            )}
          </div>
        </div>
      </motion.button>

      {/* Detail modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                    {project.clientName} · Completed {formatDate(project.completedAt)}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-ink">{project.title}</h3>
                  {project.services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.services.map((s) => (
                        <span key={s.id} className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink-muted">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted transition-colors hover:bg-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <PortfolioMediaView project={project} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

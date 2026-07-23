import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FEATURED_PROJECTS } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80';

export function ProjectsSection() {
  return (
    <section className="py-20 sm:py-28 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Work"
          title="Featured Projects"
          description="A selection of recent projects delivered across industries."
          action={{ label: 'View All Projects', href: '/projects' }}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/25"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={project.image || FALLBACK_IMAGE}
                  alt={project.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-xs font-medium text-accent shadow-sm">
                  {project.category}
                </span>
              </div>
              <div className="p-5">
                <span className="text-xs text-ink-faint">{project.industry}</span>
                <h3 className="mt-1 text-base font-semibold text-ink group-hover:text-accent transition-colors">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed line-clamp-2">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.services.map((s) => (
                    <span key={s} className="rounded-md bg-canvas px-2 py-0.5 text-xs text-ink-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-accent/30 hover:shadow-md"
          >
            View All Projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
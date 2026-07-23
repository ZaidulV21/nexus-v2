import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FEATURED_PROJECTS } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

export function ProjectsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
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
              className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-xs"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-accent-subtle to-accent/10 flex items-center justify-center">
                <div className="text-4xl opacity-30">
                  {project.category === 'Interior Design' ? '🏢' :
                   project.category === 'Solar Installation' ? '☀️' :
                   project.category === 'CCTV Installation' ? '📷' : '🏗️'}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                    {project.category}
                  </span>
                  <span className="text-xs text-ink-faint">{project.industry}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink group-hover:text-accent transition-colors">
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
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-accent/30 hover:shadow-md"
          >
            View All Projects
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

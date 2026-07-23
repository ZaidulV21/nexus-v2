import { motion } from 'framer-motion';
import { FEATURED_PROJECTS } from '../constants';
import { PageHero } from '../components/PageHero';

export function ProjectsPage() {
  return (
    <div>
      <PageHero
        title="Our Projects"
        description="Explore our portfolio of successful infrastructure projects delivered across multiple industries."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_PROJECTS.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group overflow-hidden rounded-2xl border border-border bg-white shadow-xs"
              >
                <div className="aspect-[16/10] bg-gradient-to-br from-accent-subtle to-accent/10 flex items-center justify-center">
                  <div className="text-5xl opacity-30">
                    {project.category === 'Interior Design' ? '\uD83C\uDFE2' :
                     project.category === 'Solar Installation' ? '\u2600\uFE0F' :
                     project.category === 'CCTV Installation' ? '\uD83D\uDCF7' : '\uD83C\uDFD7\uFE0F'}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                      {project.category}
                    </span>
                    <span className="text-xs text-ink-faint">{project.industry}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-ink group-hover:text-accent transition-colors">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
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
        </div>
      </section>
    </div>
  );
}

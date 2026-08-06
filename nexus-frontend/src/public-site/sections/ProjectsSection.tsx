import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useRecentProjects } from '@/queries/usePortfolio';
import { SectionHeader } from '../components/SectionHeader';
import { PortfolioProjectCard } from '../components/PortfolioProjectCard';

export function ProjectsSection() {
  const { data: projects = [], isLoading } = useRecentProjects(4);

  return (
    <section className="py-20 sm:py-28 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Work"
          title="Featured Projects"
          description="A selection of recently completed projects delivered across industries."
          action={{ label: 'View All Projects', href: '/projects' }}
        />

        {isLoading ? (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="aspect-[4/3] animate-pulse bg-canvas" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-canvas" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-canvas" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project, index) => (
              <PortfolioProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-14 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <h3 className="text-lg font-semibold text-ink">Completed projects land here</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              As projects are finished, they automatically appear on our public portfolio. Check back soon.
            </p>
          </div>
        )}

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

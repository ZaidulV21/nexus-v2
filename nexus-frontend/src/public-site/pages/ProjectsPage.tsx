import { useState } from 'react';
import { useRecentProjects } from '@/queries/usePortfolio';
import { PageHero } from '../components/PageHero';
import { PortfolioProjectCard } from '../components/PortfolioProjectCard';
import { usePublicCompany } from '../hooks';
import { SeoHead, siteUrl } from '../seo';

export function ProjectsPage() {
  const [limit, setLimit] = useState(9);
  const { data: projects = [], isLoading, isError } = useRecentProjects(limit);
  const visible = projects.slice(0, limit);
  const company = usePublicCompany();

  return (
    <div>
      <SeoHead
        title={`Our Projects | ${company.name}`}
        description="Explore our portfolio of successful infrastructure projects delivered across multiple industries."
        canonical={siteUrl('/projects')}
      />
      <PageHero
        title="Our Projects"
        description="Explore our portfolio of successful infrastructure projects delivered across multiple industries."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="aspect-[16/10] animate-pulse bg-canvas" />
                  <div className="space-y-3 p-6">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-canvas" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-canvas" />
                    <div className="h-3 w-full animate-pulse rounded bg-canvas" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError || visible.length === 0 ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <h3 className="text-xl font-semibold text-ink">No completed projects yet</h3>
              <p className="mt-3 text-sm text-ink-muted">
                Completed projects appear here automatically as soon as they're finished. Check back soon.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((project, index) => (
                  <PortfolioProjectCard key={project.id} project={project} index={index} />
                ))}
              </div>

              {projects.length > limit && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((current) => current + 9)}
                    className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-accent/30 hover:shadow-md"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

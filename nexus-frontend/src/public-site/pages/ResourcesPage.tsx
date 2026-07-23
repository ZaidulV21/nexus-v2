import { PageHero } from '../components/PageHero';
import { CTASection } from '../sections/CTASection';

export function ResourcesPage() {
  return (
    <div>
      <PageHero
        title="Resources"
        description="Insights, guides, and updates from Nexus to help you make informed decisions about your business infrastructure."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-surface p-10 sm:p-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-ink">Coming Soon</h2>
            <p className="mt-3 mx-auto max-w-md text-ink-muted leading-relaxed">
              We're working on comprehensive guides, industry insights, and project case studies. Check back soon for valuable resources.
            </p>
          </div>
        </div>
      </section>

      <CTASection />
    </div>
  );
}

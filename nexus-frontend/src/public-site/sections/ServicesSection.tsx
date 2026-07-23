import { Link } from 'react-router-dom';
import { ArrowRight, Palette, Sun, Zap, Camera, Monitor, Globe, ShoppingCart, ShieldCheck } from 'lucide-react';
import { usePublicServices } from '@/queries/usePublicServices';
import { SectionHeader } from '../components/SectionHeader';
import { FadeIn } from '../components/motion';

const iconMap: Record<string, React.ElementType> = {
  Palette, Sun, Zap, Camera, Monitor, Globe, ShoppingCart, ShieldCheck,
};

export function ServicesSection() {
  const { data: services = [], isLoading } = usePublicServices();

  if (isLoading || services.length === 0) return null;

  const featured = services.slice(0, 2);
  const compact = services.slice(2, 6);
  const medium = services.slice(6, 8);

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Services"
          title="Complete Infrastructure Solutions"
          description="Everything your business needs, managed under one roof. From interior design to IT infrastructure."
          action={{ label: 'View All Services', href: '/services' }}
        />

        <div className="mt-16 space-y-6">
          {/* First row: 2 large featured cards */}
          {featured.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {featured.map((service, index) => {
                const Icon = iconMap[service.icon] || Palette;
                return (
                  <FadeIn key={service.id} delay={index * 0.1}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="group block h-full rounded-2xl border border-border bg-canvas p-7 sm:p-8 transition-all duration-300 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5"
                    >
                      <div className="flex items-start gap-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white transition-transform group-hover:scale-105">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-ink transition-colors group-hover:text-accent">
                            {service.name}
                          </h3>
                          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                            {service.shortDescription}
                          </p>
                          <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all group-hover:opacity-100 group-hover:gap-2.5">
                            Learn more <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}

          {/* Middle row: 4 smaller cards */}
          {compact.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {compact.map((service, index) => {
                const Icon = iconMap[service.icon] || Palette;
                return (
                  <FadeIn key={service.id} delay={0.1 + index * 0.08}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="group block h-full rounded-2xl border border-border bg-white p-5 transition-all duration-300 hover:border-accent/25 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-ink transition-colors group-hover:text-accent">
                        {service.name}
                      </h3>
                      <p className="mt-2 text-sm text-ink-muted leading-relaxed line-clamp-2">
                        {service.shortDescription}
                      </p>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}

          {/* Bottom row: 2 medium cards */}
          {medium.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {medium.map((service, index) => {
                const Icon = iconMap[service.icon] || Palette;
                return (
                  <FadeIn key={service.id} delay={0.2 + index * 0.1}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="group block h-full rounded-2xl border border-border bg-canvas p-7 transition-all duration-300 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5"
                    >
                      <div className="flex items-start gap-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white transition-transform group-hover:scale-105">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-ink transition-colors group-hover:text-accent">
                            {service.name}
                          </h3>
                          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                            {service.shortDescription}
                          </p>
                          <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all group-hover:opacity-100 group-hover:gap-2.5">
                            Learn more <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

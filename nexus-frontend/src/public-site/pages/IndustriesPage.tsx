import { motion } from 'framer-motion';
import { Store, Heart, GraduationCap, Hotel, Factory, Building2, Warehouse, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INDUSTRIES } from '../constants';
import { PageHero } from '../components/PageHero';

const iconMap: Record<string, React.ElementType> = {
  Store, Heart, GraduationCap, Hotel, Factory, Building2, Warehouse, UtensilsCrossed,
};

export function IndustriesPage() {
  return (
    <div>
      <PageHero
        title="Industries We Serve"
        description="Specialized infrastructure solutions tailored to the unique requirements of every industry. We understand that each sector demands a different approach."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {INDUSTRIES.map((industry, index) => {
            const Icon = iconMap[industry.icon] || Store;
            const isReversed = index % 2 === 1;

            return (
              <motion.div
                key={industry.id}
                id={industry.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
                className={`grid gap-8 lg:grid-cols-2 items-center ${isReversed ? 'lg:direction-rtl' : ''}`}
              >
                <div className={isReversed ? 'lg:order-2' : ''}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h2 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">{industry.name}</h2>
                  <p className="mt-4 text-ink-muted leading-relaxed">{industry.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {industry.services.map((s) => (
                      <span key={s} className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                        {s}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/get-quote"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:gap-3 transition-all"
                  >
                    Get a Quote for {industry.name} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className={`rounded-2xl border border-border bg-gradient-to-br from-accent-subtle/50 to-canvas p-10 ${isReversed ? 'lg:order-1' : ''}`}>
                  <div className="flex items-center justify-center h-48">
                    <Icon className="h-20 w-20 text-accent/20" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

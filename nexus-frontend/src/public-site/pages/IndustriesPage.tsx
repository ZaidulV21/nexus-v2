import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INDUSTRIES } from '../constants';
import { PageHero } from '../components/PageHero';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80';

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
            const isReversed = index % 2 === 1;

            return (
              <motion.div
                key={industry.id}
                id={industry.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
                className="grid gap-8 lg:grid-cols-2 items-center"
              >
                <div className={isReversed ? 'lg:order-2' : ''}>
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Industry
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{industry.name}</h2>
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
                <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl border border-border shadow-xs ${isReversed ? 'lg:order-1' : ''}`}>
                  <img
                    src={industry.image || FALLBACK_IMAGE}
                    alt={industry.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
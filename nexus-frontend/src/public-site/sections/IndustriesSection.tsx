import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Store, Heart, GraduationCap, Hotel, Factory, Building2, Warehouse, UtensilsCrossed } from 'lucide-react';
import { INDUSTRIES } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

const iconMap: Record<string, React.ElementType> = {
  Store, Heart, GraduationCap, Hotel, Factory, Building2, Warehouse, UtensilsCrossed,
};

export function IndustriesSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Industries"
          title="Solutions for Every Industry"
          description="Specialized infrastructure solutions tailored to the unique needs of your industry."
          action={{ label: 'Explore All Industries', href: '/industries' }}
        />

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {INDUSTRIES.map((industry, index) => {
            const Icon = iconMap[industry.icon] || Store;
            return (
              <motion.div
                key={industry.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
              >
                <Link
                  to={`/industries#${industry.slug}`}
                  className="group flex flex-col items-center rounded-2xl border border-border bg-white p-6 text-center transition-all hover:border-accent/30 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-subtle text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-ink">{industry.name}</h3>
                  <p className="mt-1.5 text-xs text-ink-muted leading-relaxed line-clamp-2">{industry.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-all group-hover:opacity-100">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

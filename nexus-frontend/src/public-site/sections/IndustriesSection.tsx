import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { INDUSTRIES } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80';

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
          {INDUSTRIES.map((industry, index) => (
            <motion.div
              key={industry.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
            >
              <Link
                to={`/industries#${industry.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-xs transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1"
              >
                <img
                  src={industry.image || FALLBACK_IMAGE}
                  alt={industry.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5 transition-colors duration-300 group-hover:from-accent/90 group-hover:via-black/50" />

                <div className="relative p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-white sm:text-base">{industry.name}</h3>
                  <p className="mt-1 text-xs text-white/75 leading-relaxed line-clamp-2">
                    {industry.description}
                  </p>
                  <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
                    Explore <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
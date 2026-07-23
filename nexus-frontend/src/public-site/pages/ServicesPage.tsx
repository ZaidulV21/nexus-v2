import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SERVICES } from '../constants';
import { PageHero } from '../components/PageHero';
import { ServiceCard } from '../components/ServiceCard';

export function ServicesPage() {
  return (
    <div>
      <PageHero
        title="Our Services"
        description="Comprehensive infrastructure solutions managed under one platform. From interior design to IT services, we coordinate trusted vendors for every project."
      />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SERVICES.map((service, index) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                slug={service.slug}
                description={service.shortDescription}
                icon={service.icon}
                index={index}
                variant="featured"
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-20 rounded-2xl bg-gradient-to-br from-accent to-[#2d3abf] p-10 sm:p-14 text-center text-white"
          >
            <h2 className="text-2xl font-bold sm:text-3xl">Need Multiple Services?</h2>
            <p className="mt-3 mx-auto max-w-xl text-white/70">
              One of our biggest advantages is coordinating multiple services under a single project. Select all the services you need in one quote request.
            </p>
            <Link
              to="/get-quote"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-accent transition-all hover:bg-white/90"
            >
              Get a Combined Quote
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

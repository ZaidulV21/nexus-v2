import { SERVICES } from '../constants';
import { ServiceCard } from '../components/ServiceCard';
import { SectionHeader } from '../components/SectionHeader';

export function ServicesSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Our Services"
          title="Complete Infrastructure Solutions"
          description="Everything your business needs, managed under one roof. From interior design to IT infrastructure."
          action={{ label: 'View All Services', href: '/services' }}
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, index) => (
            <ServiceCard
              key={service.id}
              name={service.name}
              slug={service.slug}
              description={service.shortDescription}
              icon={service.icon}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

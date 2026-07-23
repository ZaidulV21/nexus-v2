import { TESTIMONIALS } from '../constants';
import { TestimonialCard } from '../components/TestimonialCard';
import { SectionHeader } from '../components/SectionHeader';

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Testimonials"
          title="What Our Clients Say"
          description="Hear from businesses that have transformed their infrastructure with Nexus."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

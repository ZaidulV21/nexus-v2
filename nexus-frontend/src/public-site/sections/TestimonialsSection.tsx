import { TESTIMONIALS } from '../constants';
import { TestimonialsCarousel } from '../components/TestimonialsCarousel';
import { SectionHeader } from '../components/SectionHeader';
import { FadeIn } from '../components/motion';

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Testimonials"
          title="What Our Clients Say"
          description="Hear from businesses that have transformed their infrastructure with Nexus."
        />

        <FadeIn className="mt-14">
          <TestimonialsCarousel testimonials={TESTIMONIALS} />
        </FadeIn>
      </div>
    </section>
  );
}

import { FAQS } from '../constants';
import { FAQAccordion } from '../components/FAQAccordion';
import { SectionHeader } from '../components/SectionHeader';

export function FAQSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="FAQs"
          title="Frequently Asked Questions"
          description="Everything you need to know about working with Nexus."
        />

        <div className="mt-14">
          <FAQAccordion items={FAQS} />
        </div>
      </div>
    </section>
  );
}

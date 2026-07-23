import { PageHero } from '../components/PageHero';
import { ProcessSection } from '../sections/ProcessSection';
import { CTASection } from '../sections/CTASection';

export function HowItWorksPage() {
  return (
    <div>
      <PageHero
        title="How It Works"
        description="Our streamlined 6-step process ensures every project is delivered on time, within budget, and to the highest quality standards."
      />
      <ProcessSection />
      <CTASection />
    </div>
  );
}

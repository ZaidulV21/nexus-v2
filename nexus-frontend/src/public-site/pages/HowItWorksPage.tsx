import { PageHero } from '../components/PageHero';
import { ProcessSection } from '../sections/ProcessSection';
import { CTASection } from '../sections/CTASection';
import { usePublicCompany } from '../hooks';
import { SeoHead, siteUrl } from '../seo';

export function HowItWorksPage() {
  const company = usePublicCompany();

  return (
    <div>
      <SeoHead
        title={`How It Works | ${company.name}`}
        description="Our streamlined 6-step process ensures every project is delivered on time, within budget, and to the highest quality standards."
        canonical={siteUrl('/how-it-works')}
      />
      <PageHero
        title="How It Works"
        description="Our streamlined 6-step process ensures every project is delivered on time, within budget, and to the highest quality standards."
      />
      <ProcessSection />
      <CTASection />
    </div>
  );
}

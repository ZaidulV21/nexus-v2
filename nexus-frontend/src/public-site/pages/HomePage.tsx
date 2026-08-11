import { HeroSection } from '../sections/HeroSection';
import { ClientLogosSection } from '../sections/ClientLogosSection';
import { ProblemSolutionSection } from '../sections/ProblemSolutionSection';
import { ProcessSection } from '../sections/ProcessSection';
import { ServicesSection } from '../sections/ServicesSection';
import { StatsSection } from '../sections/StatsSection';
import { ProjectsSection } from '../sections/ProjectsSection';
import { IndustriesSection } from '../sections/IndustriesSection';
import { TestimonialsSection } from '../sections/TestimonialsSection';
import { FAQSection } from '../sections/FAQSection';
import { CTASection } from '../sections/CTASection';
import { usePublicCompany } from '../hooks';
import { SeoHead, siteUrl, buildOrganizationJsonLd, buildWebSiteJsonLd } from '../seo';

export function HomePage() {
  const company = usePublicCompany();

  return (
    <>
      <SeoHead
        title={`${company.name} | ${company.tagline}`}
        description="Nexus is a managed infrastructure platform that coordinates trusted vendors for interior design, solar installation, electrical works, CCTV, signage, and IT projects - one partner for all your business infrastructure needs."
        canonical={siteUrl('/')}
        siteName={company.name}
        ogImage={company.logoUrl ?? undefined}
        jsonLd={[
          buildOrganizationJsonLd(company, siteUrl('/')),
          buildWebSiteJsonLd(company, siteUrl('/')),
        ]}
      />
      <HeroSection />
      <ClientLogosSection />
      <ProblemSolutionSection />
      <ServicesSection />
      <ProcessSection />
      <StatsSection />
      <ProjectsSection />
      <IndustriesSection />
      <TestimonialsSection />
      <FAQSection /> 
      <CTASection />
    </>
  );
}

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

export function HomePage() {
  return (
    <>
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

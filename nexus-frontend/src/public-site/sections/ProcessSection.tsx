import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ClipboardList, MessageSquare, MapPin, FileText, Hammer, CheckCircle } from 'lucide-react';
import { PROCESS_STEPS } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

const iconMap: Record<string, React.ElementType> = {
  ClipboardList,
  MessageSquare,
  MapPin,
  FileText,
  Hammer,
  CheckCircle,
};

export function ProcessSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start center', 'end center'],
  });

  const fillHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="How It Works"
          title="Our Trusted Process"
          description="From initial requirement to final handover, every project follows our proven 6-step process."
        />

        <div ref={containerRef} className="mt-16 relative">
          {/* Track line (background, full length, faint) */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border lg:left-1/2 lg:-translate-x-px" />

          {/* Fill line (animates in on scroll) */}
          <motion.div
            className="absolute left-6 top-0 w-px bg-accent lg:left-1/2 lg:-translate-x-px"
            style={{ height: fillHeight }}
          />

          <div className="space-y-8 lg:space-y-0">
            {PROCESS_STEPS.map((step, index) => {
              const Icon = iconMap[step.icon] || ClipboardList;
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative flex items-center gap-6 lg:gap-0 ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                >
                  <div className={`flex-1 ${isLeft ? 'lg:text-right lg:pr-12' : 'lg:text-left lg:pl-12'}`}>
                    <div className={`inline-block rounded-2xl border border-border bg-white p-6 shadow-xs transition-all hover:shadow-md ${isLeft ? 'lg:ml-auto' : ''}`}>
                      <div className={`flex items-center gap-3 ${isLeft ? 'lg:flex-row-reverse' : ''}`}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-accent uppercase tracking-wider">Step {step.step}</span>
                          <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-ink-muted leading-relaxed max-w-sm">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-white text-sm font-bold text-accent shadow-sm lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                    {step.step}
                  </div>

                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
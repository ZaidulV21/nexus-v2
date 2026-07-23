import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { STATS } from '../constants';
import { SectionHeader } from '../components/SectionHeader';

function AnimatedCounter({ value, suffix }: { value: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const target = parseInt(value);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <div ref={ref} className="text-4xl font-bold text-ink sm:text-5xl">
      {count}{suffix}
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          tag="Why Choose Us"
          title="Why Businesses Choose Nexus"
          description="Numbers speak louder than words. Here's our track record."
        />

        <div className="mt-14 grid grid-cols-2 gap-6 lg:grid-cols-5">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="rounded-2xl border border-border bg-white p-6 text-center shadow-xs"
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="mt-2 text-sm font-medium text-ink">{stat.label}</p>
              <p className="mt-1 text-xs text-ink-muted">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

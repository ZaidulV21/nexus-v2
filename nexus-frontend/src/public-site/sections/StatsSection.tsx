import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { STATS } from '../constants';
import { FadeIn } from '../components/motion';

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
    <div ref={ref} className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
      {count}{suffix}
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-ink py-20 sm:py-28">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-[#1a1a2e]" />
        <div className="absolute top-0 left-1/3 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-accent/3 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center max-w-3xl mx-auto mb-14">
          <span className="mb-3 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/60 uppercase">
            Track Record
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Numbers That Speak
          </h2>
          <p className="mt-4 text-lg text-white/40">
            A decade of delivering infrastructure projects across India.
          </p>
        </FadeIn>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 sm:p-6 text-center backdrop-blur-sm"
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <p className="mt-2 text-sm font-medium text-white/70">{stat.label}</p>
              <p className="mt-1 text-xs text-white/35">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

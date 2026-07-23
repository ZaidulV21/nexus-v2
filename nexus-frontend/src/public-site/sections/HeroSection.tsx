import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Play, Shield, Clock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Slide {
  label: string;
  badge: string;
  headline: string;
  headlineAccent?: string;
  headlineSuffix?: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  image: string;
  imageAlt: string;
}

const SLIDES: Slide[] = [
  {
    label: 'Overview',
    badge: 'Trusted by 500+ businesses across India',
    headline: 'One Partner For All Your',
    headlineAccent: 'Business Infrastructure',
    headlineSuffix: 'Needs',
    subtext: 'Nexus coordinates trusted vendors for Interior, Solar, Electrical, CCTV, Signage and IT projects through one managed platform. From concept to handover, we handle everything.',
    ctaLabel: 'Get Free Quote',
    ctaHref: '/get-quote',
    secondaryCtaLabel: 'See How It Works',
    secondaryCtaHref: '/how-it-works',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Modern commercial office interior under natural light',
  },
  {
    label: 'Process',
    badge: 'End-to-end project management',
    headline: 'From Concept to Completion',
    headlineAccent: 'Managed by Experts',
    subtext: 'Our 6-step process ensures quality at every stage — site visit, vendor matching, project oversight, and final handover. You stay informed through our Client Portal.',
    ctaLabel: 'Book Consultation',
    ctaHref: '/contact',
    secondaryCtaLabel: 'View Our Process',
    secondaryCtaHref: '/how-it-works',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Project team reviewing site plans on location',
  },
  {
    label: 'Services',
    badge: '8+ infrastructure services',
    headline: 'Interior • Solar • Electrical',
    headlineAccent: 'IT • Signage • CCTV',
    subtext: 'One platform for all your infrastructure needs. Multi-service coordination under a single project, single point of contact, single invoice.',
    ctaLabel: 'Explore Services',
    ctaHref: '/services',
    secondaryCtaLabel: 'Get a Combined Quote',
    secondaryCtaHref: '/get-quote',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Rooftop solar panel installation at golden hour',
  },
  {
    label: 'On-Site',
    badge: 'Verified vendors, on-site accountability',
    headline: 'Certified Crews,',
    headlineAccent: 'Zero Guesswork',
    headlineSuffix: 'On Every Job',
    subtext: 'Every technician on a Nexus project is vetted and insured. Site progress, photos, and sign-offs are logged in real time so you always know exactly where things stand.',
    ctaLabel: 'Talk to a Coordinator',
    ctaHref: '/contact',
    secondaryCtaLabel: 'See Our Vendors',
    secondaryCtaHref: '/how-it-works',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Electrical technician working on a panel installation',
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'Verified Vendors' },
  { icon: Clock, label: '24hr Response' },
  { icon: Award, label: '98% Satisfaction' },
];

const AUTO_ROTATE_INTERVAL = 7000;

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(goNext, AUTO_ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, goNext]);

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  const slide = SLIDES[activeIndex];

  return (
    <section
      className="relative overflow-hidden bg-ink"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes hero-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .hero-progress-bar {
          animation-name: hero-progress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>

      {/* Background image layer — crossfades + slow ken-burns zoom per slide */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <motion.img
              src={slide.image}
              alt={slide.imageAlt}
              initial={{ scale: 1 }}
              animate={{ scale: 1.09 }}
              transition={{ duration: AUTO_ROTATE_INTERVAL / 1000 + 1, ease: 'linear' }}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {/* Readability scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40 lg:via-ink/75 lg:to-ink/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 lg:pt-10">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-20 items-end lg:items-center">
          {/* Left: Text content with AnimatePresence for slide transitions */}
          <div className="relative min-h-[360px] sm:min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {slide.badge}
                </div>

                {/* Headline */}
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem] leading-[1.08] [text-wrap:balance]">
                  {slide.headline}{' '}
                  {slide.headlineAccent && (
                    <>
                      <br className="hidden sm:block" />
                      <span className="bg-gradient-to-r from-accent via-blue-400 to-accent bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                        {slide.headlineAccent}
                      </span>{' '}
                    </>
                  )}
                  {slide.headlineSuffix}
                </h1>

                {/* Subtext */}
                <p className="mt-6 max-w-xl text-lg text-white/60 leading-relaxed">
                  {slide.subtext}
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    to={slide.ctaHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30"
                  >
                    {slide.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={slide.secondaryCtaHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
                  >
                    <Play className="h-4 w-4" />
                    {slide.secondaryCtaLabel}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right side — floating live-project card over the background photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative hidden lg:block lg:justify-self-end lg:w-[420px]"
          >
            <div className="relative rounded-2xl border border-white/10 bg-ink/40 p-1 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8">
                {/* Dashboard header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm font-medium text-white/80">Active Projects</p>
                    <p className="text-xs text-white/40">Real-time overview</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Interior Design', client: 'TechVista Solutions', status: 'In Progress', progress: 75, color: 'bg-accent', statusColor: 'bg-accent/15 text-accent' },
                    { label: 'Solar Installation', client: 'GreenEnergy Corp', status: 'Site Visit', progress: 30, color: 'bg-emerald-400', statusColor: 'bg-emerald-400/15 text-emerald-400' },
                    { label: 'CCTV Setup', client: 'Patel Retail Group', status: 'Quotation', progress: 50, color: 'bg-amber-400', statusColor: 'bg-amber-400/15 text-amber-400' },
                    { label: 'Electrical Works', client: 'MedCare Hospitals', status: 'Completed', progress: 100, color: 'bg-emerald-400', statusColor: 'bg-emerald-400/15 text-emerald-400' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.5 + i * 0.1 }}
                      className="rounded-lg border border-white/8 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-white/90">{item.label}</span>
                          <span className="ml-2 text-xs text-white/35">{item.client}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 1.2, delay: 0.7 + i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { value: '12', label: 'Active' },
                    { value: '98%', label: 'On Time' },
                    { value: '4.9', label: 'Rating' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1 + i * 0.1 }}
                      className="rounded-lg border border-white/8 bg-white/[0.03] p-3 text-center"
                    >
                      <p className="text-lg font-bold text-white/90">{stat.value}</p>
                      <p className="text-[11px] text-white/40">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating accent glow */}
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/10 blur-[60px]" />
          </motion.div>
        </div>

        {/* Navigation — labeled slide tabs with autoplay progress, arrows, trust badges */}
        <div className="mt-12 flex flex-col gap-6 lg:mt-16">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.label}
                onClick={() => goTo(i)}
                aria-current={i === activeIndex}
                aria-label={`Show ${s.label} slide`}
                className={cn(
                  'group relative flex-1 overflow-hidden rounded-full border transition-colors duration-300',
                  i === activeIndex
                    ? 'border-white/25 bg-white/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                )}
              >
                <span
                  className={cn(
                    'block px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-colors sm:text-xs',
                    i === activeIndex ? 'text-white' : 'text-white/45 group-hover:text-white/70'
                  )}
                >
                  {s.label}
                </span>
                {i === activeIndex && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/15">
                    <span
                      key={activeIndex}
                      style={{
                        animationDuration: `${AUTO_ROTATE_INTERVAL}ms`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                      className="hero-progress-bar block h-full origin-left bg-accent"
                    />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            {/* Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/8 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="ml-2 text-xs tabular-nums text-white/35">
                {String(activeIndex + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
              </span>
            </div>

            {/* Trust badges — desktop only */}
            <div className="hidden sm:flex items-center gap-6">
              {TRUST_BADGES.map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-sm text-white/40">
                  <badge.icon className="h-4 w-4 text-accent/60" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
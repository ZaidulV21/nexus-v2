import { FadeIn } from '../components/motion';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PROBLEMS = [
  {
    title: 'Multiple vendors, zero coordination',
    description: 'Managing separate teams for interior, electrical, solar, and IT creates chaos, delays, and budget overruns.',
  },
  {
    title: 'No single point of accountability',
    description: 'When things go wrong, vendors point fingers. You are left chasing different contacts with no clear owner.',
  },
  {
    title: 'Unpredictable quality and timelines',
    description: 'Without a structured process, projects stretch indefinitely and quality varies wildly between workstreams.',
  },
];

const SOLUTIONS = [
  {
    title: 'One partner, every service',
    description: 'Nexus coordinates all 8+ infrastructure services under one managed platform — interior, solar, electrical, CCTV, signage, IT, e-commerce, and security.',
  },
  {
    title: 'Single project manager',
    description: 'One dedicated point of contact manages the entire lifecycle. Clear communication, clear accountability.',
  },
  {
    title: 'Proven 6-step process',
    description: 'From requirement to handover, every project follows a structured, transparent process with milestone-based progress.',
  },
];

export function ProblemSolutionSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center max-w-3xl mx-auto mb-16">
          <span className="mb-3 inline-block rounded-full bg-accent-subtle px-4 py-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
            Why Nexus
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            Infrastructure projects are complex.
            <br />
            <span className="text-accent">We make them simple.</span>
          </h2>
        </FadeIn>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* Problems */}
          <FadeIn direction="left">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-subtle">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                </div>
                <span className="text-sm font-semibold text-danger uppercase tracking-wide">The Problem</span>
              </div>

              {PROBLEMS.map((problem, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-white p-5 transition-all hover:shadow-sm"
                >
                  <h3 className="text-base font-semibold text-ink">{problem.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{problem.description}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Arrow divider on desktop */}
          <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2">
          </div>

          {/* Solutions */}
          <FadeIn direction="right">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle">
                  <CheckCircle className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-semibold text-accent uppercase tracking-wide">The Nexus Solution</span>
              </div>

              {SOLUTIONS.map((solution, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-accent/15 bg-accent-subtle/30 p-5 transition-all hover:shadow-sm hover:border-accent/30"
                >
                  <h3 className="text-base font-semibold text-ink">{solution.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{solution.description}</p>
                </div>
              ))}

              <Link
                to="/how-it-works"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:gap-3 transition-all"
              >
                See how it works <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

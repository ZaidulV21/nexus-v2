import { FadeIn } from '../components/motion';
import {
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowDown,
  Users,
  UserX,
  UserCheck,
  Clock,
  ListChecks,
  Network,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PAIRS = [
  {
    problem: {
      icon: Network,
      title: 'Multiple vendors, zero coordination',
      description: 'Managing separate teams for interior, electrical, solar, and IT creates chaos, delays, and budget overruns.',
    },
    solution: {
      icon: Users,
      title: 'One partner, every service',
      description: 'Nexus coordinates all 8+ infrastructure services under one managed platform — interior, solar, electrical, CCTV, signage, IT, e-commerce, and security.',
    },
  },
  {
    problem: {
      icon: UserX,
      title: 'No single point of accountability',
      description: 'When things go wrong, vendors point fingers. You are left chasing different contacts with no clear owner.',
    },
    solution: {
      icon: UserCheck,
      title: 'Single project manager',
      description: 'One dedicated point of contact manages the entire lifecycle. Clear communication, clear accountability.',
    },
  },
  {
    problem: {
      icon: Clock,
      title: 'Unpredictable quality and timelines',
      description: 'Without a structured process, projects stretch indefinitely and quality varies wildly between workstreams.',
    },
    solution: {
      icon: ListChecks,
      title: 'Proven 6-step process',
      description: 'From requirement to handover, every project follows a structured, transparent process with milestone-based progress.',
    },
  },
];

export function ProblemSolutionSection() {
  return (
    <section className="py-20 sm:py-28 bg-canvas overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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

        {/* Column labels — desktop only */}
        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-6">
          <div className="flex items-center gap-2 justify-self-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-subtle">
              <AlertTriangle className="h-4 w-4 text-danger" />
            </div>
            <span className="text-sm font-semibold text-danger uppercase tracking-wide">The Problem</span>
          </div>
          <div className="w-10" />
          <div className="flex items-center gap-2 justify-self-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-subtle">
              <CheckCircle className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm font-semibold text-accent uppercase tracking-wide">The Nexus Solution</span>
          </div>
        </div>

        <div className="space-y-5 lg:space-y-6">
          {PAIRS.map((pair, i) => {
            const ProblemIcon = pair.problem.icon;
            const SolutionIcon = pair.solution.icon;
            return (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-4">
                  {/* Problem card */}
                  <div className="group relative rounded-2xl border border-danger/15 bg-surface p-5 sm:p-6 transition-all hover:border-danger/30 hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-subtle text-danger">
                        <ProblemIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-ink">{pair.problem.title}</h3>
                        <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                          {pair.problem.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="flex items-center justify-center py-1 lg:py-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-subtle text-accent shadow-sm">
                      <ArrowDown className="h-4 w-4 lg:hidden" />
                      <ArrowRight className="h-4 w-4 hidden lg:block" />
                    </div>
                  </div>

                  {/* Solution card */}
                  <div className="group relative rounded-2xl border border-accent/15 bg-accent-subtle/30 p-5 sm:p-6 transition-all hover:border-accent/30 hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                        <SolutionIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-ink">{pair.solution.title}</h3>
                        <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
                          {pair.solution.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn className="mt-12 text-center">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition-all hover:border-accent/30 hover:shadow-md"
          >
            See how it works <ArrowRight className="h-4 w-4" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
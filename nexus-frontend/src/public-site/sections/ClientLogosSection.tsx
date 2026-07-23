import { useState } from 'react';
import { FadeIn } from '../components/motion';

const CLIENTS = [
  { name: 'TechVista Solutions', initials: 'TV', glow: '#6366f1' },
  { name: 'GreenEnergy Corp', initials: 'GE', glow: '#22c55e' },
  { name: 'MedCare Hospitals', initials: 'MC', glow: '#ef4444' },
  { name: 'Patel Retail Group', initials: 'PR', glow: '#f59e0b' },
  { name: 'Singh Manufacturing', initials: 'SM', glow: '#0ea5e9' },
  { name: 'Horizon Hotels', initials: 'HH', glow: '#a855f7' },
  { name: 'BrightPath Education', initials: 'BP', glow: '#14b8a6' },
  { name: 'CloudKitchens India', initials: 'CK', glow: '#ec4899' },
];

export function ClientLogosSection() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="py-14 sm:py-16 bg-white border-b border-border/50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-sm font-medium text-ink-faint uppercase tracking-widest mb-10">
            Trusted by forward-thinking companies
          </p>
        </FadeIn>
      </div>

      <FadeIn>
        <div
          className="marquee-viewport"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Edge fades */}
          <div className="marquee-fade marquee-fade-left" />
          <div className="marquee-fade marquee-fade-right" />

          {/* Single track holding two duplicated sets, animated as one */}
          <div
            className="marquee-track"
            style={{ animationPlayState: paused ? 'paused' : 'running' }}
          >
            {[...CLIENTS, ...CLIENTS].map((client, i) => (
              <div
                key={`${client.name}-${i}`}
                className="marquee-item"
                style={{ ['--glow' as string]: client.glow }}
              >
                <div className="marquee-badge" style={{ color: client.glow }}>
                  {client.initials}
                </div>
                <span className="marquee-name">{client.name}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      <style>{`
        .marquee-viewport {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .marquee-fade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4rem;
          z-index: 10;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .marquee-fade { width: 8rem; }
        }
        .marquee-fade-left {
          left: 0;
          background: linear-gradient(to right, #ffffff, transparent);
        }
        .marquee-fade-right {
          right: 0;
          background: linear-gradient(to left, #ffffff, transparent);
        }

        .marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: 2.5rem;
          animation: marquee-ltr 28s linear infinite;
        }
        @media (min-width: 640px) {
          .marquee-track { gap: 4rem; }
        }

        @keyframes marquee-ltr {
          from { transform: translateX(-50%); }
          to { transform: translateX(0%); }
        }

        .marquee-item {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 0.625rem;
          user-select: none;
          padding: 0.5rem 0.25rem;
        }

        .marquee-badge {
          display: flex;
          height: 2.25rem;
          width: 2.25rem;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          background: #f8f9fb;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.04), 0 0 14px 2px var(--glow);
          opacity: 0.9;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .marquee-item:hover .marquee-badge {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 0 0 1px rgba(0,0,0,0.04), 0 0 22px 4px var(--glow);
        }

        .marquee-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}
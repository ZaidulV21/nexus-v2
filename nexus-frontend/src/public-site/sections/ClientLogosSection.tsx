import { FadeIn } from '../components/motion';

const CLIENTS = [
  { name: 'TechVista Solutions', initials: 'TV' },
  { name: 'GreenEnergy Corp', initials: 'GE' },
  { name: 'MedCare Hospitals', initials: 'MC' },
  { name: 'Patel Retail Group', initials: 'PR' },
  { name: 'Singh Manufacturing', initials: 'SM' },
  { name: 'Horizon Hotels', initials: 'HH' },
  { name: 'BrightPath Education', initials: 'BP' },
  { name: 'CloudKitchens India', initials: 'CK' },
];

export function ClientLogosSection() {
  return (
    <section className="py-14 sm:py-16 bg-white border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="text-center text-sm font-medium text-ink-faint uppercase tracking-widest mb-10">
            Trusted by forward-thinking companies
          </p>
        </FadeIn>

        <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 lg:grid-cols-8 items-center justify-items-center opacity-50">
          {CLIENTS.map((client, i) => (
            <FadeIn key={client.name} delay={i * 0.05}>
              <div className="flex items-center gap-2.5 select-none">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas text-xs font-bold text-ink-muted">
                  {client.initials}
                </div>
                <span className="text-sm font-medium text-ink-muted whitespace-nowrap hidden sm:block">
                  {client.name}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// The product's signature mark: three nodes converging into one thread -
// echoes what Nexus actually does (multiple service enquiries converging
// into one Lead/Project pipeline), not a decorative abstract shape.
export function NexusLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="6" r="2" className="fill-ink-faint" />
      <circle cx="5" cy="18" r="2" className="fill-ink-faint" />
      <circle cx="5" cy="12" r="2" className="fill-ink-faint" />
      <path d="M7 6H12C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18H7" className="stroke-border-strong" strokeWidth="1.5" />
      <circle cx="19" cy="12" r="2.5" className="fill-accent" />
    </svg>
  );
}

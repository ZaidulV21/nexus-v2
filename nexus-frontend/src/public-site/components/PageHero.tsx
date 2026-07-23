import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({ title, description, children, className }: PageHeroProps) {
  return (
    <section className={cn('relative overflow-hidden bg-gradient-to-b from-accent-subtle/50 to-canvas pt-24 pb-16 sm:pt-28 sm:pb-20', className)}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-6 text-lg text-ink-muted leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}

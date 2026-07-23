import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  tag?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  center?: boolean;
}

export function SectionHeader({ tag, title, description, action, className, center = true }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={cn(center && 'text-center', 'max-w-3xl', center && 'mx-auto', className)}
    >
      {tag && (
        <span className="mb-3 inline-block rounded-full bg-accent-subtle px-4 py-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
          {tag}
        </span>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg text-ink-muted leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Link
          to={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover shadow-sm hover:shadow-md"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </motion.div>
  );
}

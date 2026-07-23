import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  name: string;
  slug: string;
  description: string;
  icon: string;
  index?: number;
  variant?: 'default' | 'featured';
}

const iconMap: Record<string, string> = {
  Palette: '🎨',
  Sun: '☀️',
  Zap: '⚡',
  Camera: '📷',
  Monitor: '🖥️',
  Globe: '🌐',
  ShoppingCart: '🛒',
  ShieldCheck: '🛡️',
};

export function ServiceCard({ name, slug, description, icon, index = 0, variant = 'default' }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link
        to={`/services/${slug}`}
        className={cn(
          'group block h-full rounded-2xl border border-border bg-white p-6 transition-all duration-300',
          'hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-1',
          variant === 'featured' && 'sm:p-8'
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-subtle text-2xl transition-colors group-hover:bg-accent group-hover:text-white">
          {iconMap[icon] || '📋'}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-ink transition-colors group-hover:text-accent">
          {name}
        </h3>
        <p className="mt-2.5 text-sm text-ink-muted leading-relaxed line-clamp-3">
          {description}
        </p>
        <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent opacity-0 transition-all group-hover:opacity-100 group-hover:gap-2.5">
          Learn more
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </Link>
    </motion.div>
  );
}

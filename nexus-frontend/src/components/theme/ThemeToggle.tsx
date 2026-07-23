import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeContext();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className={cn('flex items-center rounded-lg border border-border bg-canvas p-0.5', className)}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            theme === value
              ? 'bg-surface text-accent shadow-sm'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

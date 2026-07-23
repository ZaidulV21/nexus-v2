import { Link } from 'react-router-dom';
import { CompassIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/routes/routes';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas ring-1 ring-border">
        <CompassIcon className="h-5 w-5 text-ink-faint" strokeWidth={1.75} />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-ink">Page not found</h1>
        <p className="mt-1 text-sm text-ink-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      </div>
      <Button asChild size="sm">
        <Link to={ROUTES.admin.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  );
}

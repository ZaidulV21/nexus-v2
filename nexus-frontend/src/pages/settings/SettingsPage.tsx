import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck, UserCircle2, Building2, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/hooks/useToast';
import { authService } from '@/services/authService';
import { useCompanySettings } from '@/queries/useCompany';
import { ROUTES } from '@/routes/routes';
import { ApiError } from '@/lib/api';

// Mirrors the backend's changePasswordSchema (auth.validation.ts) for
// inline feedback - the backend still validates authoritatively.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ProfileCard() {
  const { actor } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-ink-faint" /> Profile
          </span>
        </CardTitle>
        <CardDescription>Your signed-in account. Contact details are managed by the system administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar name={actor?.email ?? 'Admin'} size={48} />
          <div>
            <p className="text-sm font-medium text-ink">{actor?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="accent">{actor?.type}</Badge>
              {actor?.role && <Badge tone="neutral">{actor.role}</Badge>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyCard() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useCompanySettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-ink-faint" /> Company Profile
          </span>
        </CardTitle>
        <CardDescription>Your company branding, contact details, and business configuration.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : settings ? (
          <div className="flex items-start gap-4">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'Company Logo'}
                className="h-12 w-12 shrink-0 rounded border border-border object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-canvas">
                <Building2 className="h-5 w-5 text-ink-faint" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              {settings.companyName && (
                <p className="truncate text-sm font-medium text-ink">{settings.companyName}</p>
              )}
              {settings.email && (
                <p className="truncate text-xs text-ink-muted">{settings.email}</p>
              )}
              {settings.phone && (
                <p className="truncate text-xs text-ink-muted">{settings.phone}</p>
              )}
              {(settings.city || settings.state) && (
                <p className="truncate text-xs text-ink-muted">
                  {[settings.city, settings.state].filter(Boolean).join(', ')}
                </p>
              )}
              {!settings.companyName && !settings.email && !settings.phone && (
                <p className="text-xs text-ink-faint">No company details configured yet.</p>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.companySettings)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">Set up your company profile, branding, and business details.</p>
            <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.companySettings)}>
              <Building2 className="h-3.5 w-3.5" />
              Set up Company Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    setServerError(null);
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: 'Password updated', variant: 'success' });
      reset();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-ink-faint" /> Change password
          </span>
        </CardTitle>
        <CardDescription>Requires your current password. New password must be at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4" noValidate>
          <FormField label="Current password" htmlFor="current-password" required error={errors.currentPassword?.message}>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              error={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </FormField>

          <FormField label="New password" htmlFor="new-password" required error={errors.newPassword?.message}>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              error={!!errors.newPassword}
              {...register('newPassword')}
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirm-password" required error={errors.confirmPassword?.message}>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </FormField>

          {serverError && <p className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{serverError}</p>}

          <div>
            <Button type="submit" size="sm" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your account and security settings."
        actions={
          <span className="flex items-center gap-2 text-sm text-ink-muted">
            <ShieldCheck className="h-4 w-4" /> Account
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard />
        <CompanyCard />
        <ChangePasswordCard />
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Company profile, branding, email, and invoice configuration are managed in{' '}
        <button
          onClick={() => navigate(ROUTES.companySettings)}
          className="text-accent hover:underline"
        >
          Company Settings
        </button>.
      </p>
    </div>
  );
}

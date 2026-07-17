import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react';
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
        <ChangePasswordCard />
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Company profile, branding, email, and invoice configuration are provisioned at deployment in V1 and will become
        editable here when the backend exposes configuration APIs.
      </p>
    </div>
  );
}

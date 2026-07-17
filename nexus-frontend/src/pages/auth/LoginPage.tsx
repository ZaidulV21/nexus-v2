import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { NexusLogo } from '@/components/layout/NexusLogo';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/hooks/useToast';
import { ApiError } from '@/lib/api';
import { ROUTES } from '@/routes/routes';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  actorType: z.enum(['ADMIN', 'CLIENT']),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isAuthenticated, isInitializing, actor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { actorType: 'ADMIN' },
  });
  const actorType = watch('actorType');

  if (!isInitializing && isAuthenticated) {
    const stateFrom = (location.state as { from?: string } | null)?.from;
    const isClient = actor?.type === 'CLIENT';
    const fallback = isClient ? ROUTES.portal.dashboard : ROUTES.dashboard;
    // Only honor `from` when it belongs to this actor's own area. A
    // role-mismatched `from` (e.g. a CLIENT bounced off an Admin URL)
    // would otherwise ping-pong between the route guard and this
    // redirect forever - an infinite <Navigate> loop and a white screen.
    const fromIsCompatible = stateFrom
      ? isClient
        ? stateFrom.startsWith('/portal')
        : !stateFrom.startsWith('/portal')
      : false;
    return <Navigate to={fromIsCompatible ? (stateFrom as string) : fallback} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values);
      toast({ title: 'Welcome back', variant: 'success' });
      const stateFrom = (location.state as { from?: string } | null)?.from;
      const isClient = values.actorType === 'CLIENT';
      const fallback = isClient ? ROUTES.portal.dashboard : ROUTES.dashboard;
      const fromIsCompatible = stateFrom
        ? isClient
          ? stateFrom.startsWith('/portal')
          : !stateFrom.startsWith('/portal')
        : false;
      navigate(fromIsCompatible ? (stateFrom as string) : fallback, { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <NexusLogo className="h-7 w-7" />
          <h1 className="text-lg font-semibold text-ink">Sign in to Nexus</h1>
          <p className="text-sm text-ink-muted">Business Service Management Platform</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <FormField label="Login as" htmlFor="actorType" required error={errors.actorType?.message}>
                <Select
                  value={actorType}
                  onValueChange={(value) => setValue('actorType', value as 'ADMIN' | 'CLIENT', { shouldValidate: true })}
                >
                  <SelectTrigger id="actorType">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@nexus.local"
                  leadingIcon={<Mail className="h-3.5 w-3.5" />}
                  error={!!errors.email}
                  {...register('email')}
                />
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leadingIcon={<Lock className="h-3.5 w-3.5" />}
                  error={!!errors.password}
                  {...register('password')}
                />
              </FormField>

              {serverError && (
                <p className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{serverError}</p>
              )}

              <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
                {actorType === 'CLIENT' ? 'Sign in to Client Portal' : 'Sign in to Admin'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

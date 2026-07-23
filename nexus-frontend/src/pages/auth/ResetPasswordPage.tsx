import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { CompanyLogo } from '@/components/layout/CompanyLogo';
import { publicAuthService } from '@/services/publicAuthService';
import { ApiError } from '@/lib/api';
import { ROUTES } from '@/routes/routes';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = newPassword === confirmPassword;
  const isStrongEnough = newPassword.length >= 8;
  const canSubmit = token && isStrongEnough && passwordsMatch && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setIsSubmitting(true);
    try {
      await publicAuthService.resetPassword({ token, newPassword });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm text-center">
          <CompanyLogo className="mx-auto h-7 w-7" />
          <h1 className="mt-4 text-lg font-semibold text-ink">Invalid Reset Link</h1>
          <p className="mt-2 text-sm text-ink-muted">
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <CompanyLogo className="h-7 w-7" />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-ink">Password Reset Successfully</h1>
            <p className="text-sm text-ink-muted">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6 text-center">
              <Link
                to={ROUTES.login}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Sign in to Client Portal
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <CompanyLogo className="h-7 w-7" />
          <h1 className="text-lg font-semibold text-ink">Create new password</h1>
          <p className="text-sm text-ink-muted">Choose a strong password for your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <FormField label="New Password" htmlFor="newPassword" required error={newPassword && !isStrongEnough ? 'Password must be at least 8 characters' : undefined}>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    leadingIcon={<Lock className="h-3.5 w-3.5" />}
                    error={!!(newPassword && !isStrongEnough)}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <FormField label="Confirm Password" htmlFor="confirmPassword" required error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    leadingIcon={<Lock className="h-3.5 w-3.5" />}
                    error={!!(confirmPassword && !passwordsMatch)}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              {error && (
                <p className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{error}</p>
              )}

              <Button type="submit" loading={isSubmitting} disabled={!canSubmit} className="mt-1 w-full">
                Reset Password
              </Button>

              <div className="text-center">
                <Link
                  to={ROUTES.login}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

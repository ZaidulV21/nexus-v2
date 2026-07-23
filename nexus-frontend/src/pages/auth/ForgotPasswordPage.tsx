import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { CompanyLogo } from '@/components/layout/CompanyLogo';
import { publicAuthService } from '@/services/publicAuthService';
import { ApiError } from '@/lib/api';
import { ROUTES } from '@/routes/routes';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await publicAuthService.forgotPassword({ email });
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <CompanyLogo className="h-7 w-7" />
          <h1 className="text-lg font-semibold text-ink">Reset your password</h1>
          <p className="text-sm text-ink-muted">We'll send you a link to create a new password</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isSubmitted ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="mt-4 text-sm font-semibold text-ink">Check your email</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  If an account exists for <span className="font-medium text-ink">{email}</span>, we've sent a password reset link.
                </p>
                <p className="mt-4 text-xs text-ink-faint">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="mt-6">
                  <Link
                    to={ROUTES.login}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <FormField label="Email" htmlFor="email" required error={error || undefined}>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    leadingIcon={<Mail className="h-3.5 w-3.5" />}
                    error={!!error}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  />
                </FormField>

                {error && (
                  <p className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{error}</p>
                )}

                <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
                  Send Reset Link
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

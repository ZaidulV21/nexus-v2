import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { LoginInput } from '@/services/authService';

interface StepLoginProps {
  email: string;
  authLogin: (input: LoginInput) => Promise<void>;
  onLoginSuccess: () => void;
  loginError: string | null;
  onClearError: () => void;
}

export function StepLogin({ email, authLogin, onLoginSuccess, loginError, onClearError }: StepLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const displayError = error || loginError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError('');
    onClearError();

    try {
      await authLogin({ email, password, actorType: 'CLIENT' });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Welcome Back!</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        We found an existing Nexus account with this email.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 space-y-4"
      >
        <div className="rounded-2xl border border-border bg-canvas p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Existing Account</h3>
              <p className="text-xs text-ink-muted">Sign in to continue with your quote request</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); onClearError(); }}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{displayError}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                'Sign In & Continue'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password?returnTo=get-quote"
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

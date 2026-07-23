import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { WizardContactInfo, WizardAccountInfo } from '../types';

interface StepAccountProps {
  contact: WizardContactInfo;
  account: WizardAccountInfo;
  onUpdate: (partial: Partial<WizardAccountInfo>) => void;
}

export function StepAccount({ contact, account, onUpdate }: StepAccountProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordError = account.password && account.password.length < 8
    ? 'Password must be at least 8 characters'
    : '';

  const confirmError = account.confirmPassword && account.password !== account.confirmPassword
    ? 'Passwords do not match'
    : '';

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Create Your Account</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Set up your Client Portal account to track this quote and manage future projects.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 space-y-4"
      >
        <div className="rounded-2xl border border-border bg-canvas p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle text-accent">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Account Details</h3>
              <p className="text-xs text-ink-muted">Create a password for your portal account</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Email</label>
              <input
                type="email"
                value={contact.email}
                readOnly
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={account.password}
                  onChange={(e) => onUpdate({ password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    passwordError ? 'border-red-300 bg-red-50' : 'border-border bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-red-500">{passwordError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={account.confirmPassword}
                  onChange={(e) => onUpdate({ confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                    confirmError ? 'border-red-300 bg-red-50' : 'border-border bg-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="mt-1 text-xs text-red-500">{confirmError}</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

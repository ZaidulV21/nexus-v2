import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, MailCheck, Eye, EyeOff, AlertCircle, ShieldAlert, Send, RotateCcw } from 'lucide-react';
import type { LoginInput } from '@/services/authService';
import type { AccountCheckAccount } from '@/services/publicAuthService';

interface StepLoginProps {
  /** The email the visitor typed on the Contact step. */
  enteredEmail: string;
  /** The matched account (identifiers masked). */
  account: AccountCheckAccount | null;
  flags: { phoneMismatch: boolean; emailMismatch: boolean };
  authLogin: (input: LoginInput) => Promise<void>;
  onLoginSuccess: () => void;
  loginError: string | null;
  onClearError: () => void;
  /** Sends a one-time code to the account's email on file. */
  sendOtpLogin: () => Promise<void>;
  /** Verifies the code; resolves once the session has been established. */
  verifyOtpLogin: (otp: string) => Promise<void>;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type Method = 'password' | 'otp';

export function StepLogin({
  enteredEmail,
  account,
  flags,
  authLogin,
  onLoginSuccess,
  loginError,
  onClearError,
  sendOtpLogin,
  verifyOtpLogin,
}: StepLoginProps) {
  const [method, setMethod] = useState<Method>(flags.emailMismatch ? 'otp' : 'password');

  // Password
  const [emailInput, setEmailInput] = useState(enteredEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // OTP
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpSent, setOtpSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState('');
  const displayError = error || loginError;

  const clearError = useCallback(() => {
    setError('');
    onClearError();
  }, [onClearError]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoggingIn(true);
    clearError();
    try {
      await authLogin({ email: emailInput, password });
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSendOtp = useCallback(async () => {
    clearError();
    setIsSending(true);
    try {
      await sendOtpLogin();
      setOtpSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  }, [sendOtpLogin, clearError]);

  const handleVerifyOtp = useCallback(
    async (otpString: string) => {
      if (otpString.length !== OTP_LENGTH) return;
      setIsVerifying(true);
      clearError();
      try {
        await verifyOtpLogin(otpString);
        onLoginSuccess();
      } catch (err: any) {
        setError(err.message || 'Invalid verification code');
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [verifyOtpLogin, onLoginSuccess, clearError]
  );

  // Cooldown timer for the resend link
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '');
    if (digit.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    onClearError();

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        setTimeout(() => handleVerifyOtp(fullOtp), 100);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const subtitle = flags.emailMismatch
    ? "We found an existing Nexus account linked to the phone number you provided. Sign in to continue with your quote request."
    : 'We found an existing Nexus account with this email.';

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Welcome Back!</h2>
      <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>

      {/* Identity mismatch notices - never silently merge accounts, ask for
          real verification instead */}
      {(flags.phoneMismatch || flags.emailMismatch) && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
        >
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            {flags.emailMismatch
              ? 'For your security, please verify your identity before we link this request to your account. We will send a one-time code to the email registered on your account.'
              : 'The phone number on this request does not match the one on your account. Please verify your identity to continue — the request will keep the phone number you entered.'}
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 space-y-4"
      >
        <div className="rounded-2xl border border-border bg-canvas p-6">
          {/* Method toggle */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-canvas border border-border p-1">
            <button
              type="button"
              onClick={() => { setMethod('password'); clearError(); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                method === 'password' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Password
            </button>
            <button
              type="button"
              onClick={() => { setMethod('otp'); clearError(); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                method === 'otp' ? 'bg-surface text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <MailCheck className="h-4 w-4" />
              Email Code
            </button>
          </div>

          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
            >
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{displayError}</p>
            </motion.div>
          )}

          {method === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Account Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); clearError(); }}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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

              <button
                type="submit"
                disabled={!password || isLoggingIn}
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  'Sign In & Continue'
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/forgot-password?returnTo=get-quote"
                  className="text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                {account?.emailMasked
                  ? `We will send a one-time code to ${account.emailMasked}.`
                  : 'We will send a one-time code to your registered email.'}
              </p>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSending}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Code
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="flex justify-center gap-3">
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <motion.input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i] || ''}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        disabled={isVerifying}
                        className="h-12 w-12 rounded-xl border border-border bg-surface text-center text-lg font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyOtp(otp.join(''))}
                    disabled={otp.join('').length !== OTP_LENGTH || isVerifying}
                    className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Continue'
                    )}
                  </button>

                  <div className="text-center">
                    {cooldown > 0 ? (
                      <p className="text-sm text-ink-muted">Resend code in {cooldown}s</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSending}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Resend Code
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

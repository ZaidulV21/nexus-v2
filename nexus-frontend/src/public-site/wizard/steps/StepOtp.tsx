import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { publicAuthService } from '@/services/publicAuthService';

interface StepOtpProps {
  email: string;
  isVerified: boolean;
  onVerify: () => void;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function StepOtp({ email, isVerified, onVerify }: StepOtpProps) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [otpSent, setOtpSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send OTP on mount
  useEffect(() => {
    if (!otpSent && email) {
      handleSendOtp();
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = useCallback(async () => {
    if (!email) return;
    setIsSending(true);
    setError('');
    try {
      await publicAuthService.sendOtp({ email });
      setOtpSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  }, [email]);

  const handleVerify = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) return;

    setIsLoading(true);
    setError('');
    try {
      await publicAuthService.verifyOtp({ email, otp: otpString });
      onVerify();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, onVerify]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '');
    if (digit.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        setTimeout(() => {
          setIsLoading(true);
          publicAuthService.verifyOtp({ email, otp: fullOtp })
            .then(() => onVerify())
            .catch((err: any) => {
              setError(err.message || 'Invalid verification code');
              setOtp(Array(OTP_LENGTH).fill(''));
              inputRefs.current[0]?.focus();
            })
            .finally(() => setIsLoading(false));
        }, 100);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  if (isVerified) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        >
          <CheckCircle className="h-8 w-8 text-green-600" />
        </motion.div>
        <h2 className="mt-4 text-xl font-bold text-ink">Email Verified!</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Your email address <span className="font-medium text-ink">{email}</span> has been verified.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Verify Your Email</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        We've sent a verification code to <span className="font-medium text-ink">{email}</span>
      </p>

      <div className="mt-8 space-y-6">
        {isSending && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-sm text-ink-muted">Sending verification code...</span>
          </div>
        )}

        {!isSending && (
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
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={isLoading}
                  className="h-12 w-12 rounded-xl border border-border bg-white text-center text-lg font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            <button
              type="button"
              onClick={handleVerify}
              disabled={otp.join('').length !== OTP_LENGTH || isLoading}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>

            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-sm text-ink-muted">
                  Resend code in {cooldown}s
                </p>
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
    </div>
  );
}

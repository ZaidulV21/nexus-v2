import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
interface StepOtpProps {
  email: string;
  isVerified: boolean;
  onVerify: () => void;
}

export function StepOtp({ email, isVerified, onVerify }: StepOtpProps) {
  const [otp, setOtp] = useState('');
  const otpLength = 6;

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

  const handleVerify = () => {
    if (otp.length === otpLength) {
      onVerify();
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-ink">Verify Your Email</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Enter the 6-digit code sent to <span className="font-medium text-ink">{email}</span>.
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex justify-center gap-3">
          {Array.from({ length: otpLength }).map((_, i) => (
            <motion.input
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[i] || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length === 1) {
                  const newOtp = otp.substring(0, i) + val + otp.substring(i + 1);
                  setOtp(newOtp);
                  if (i < otpLength - 1) {
                    (e.target.nextElementSibling as HTMLElement)?.focus();
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !otp[i] && i > 0) {
                  const prevEl = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                  if (prevEl) {
                    prevEl.focus();
                    setOtp(otp.substring(0, i - 1) + otp.substring(i));
                  }
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').substring(0, otpLength);
                if (paste.length === otpLength) {
                  setOtp(paste);
                }
              }}
              className="h-12 w-12 rounded-xl border border-border bg-white text-center text-lg font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={otp.length !== otpLength}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Verify Email
        </button>
      </div>
    </div>
  );
}

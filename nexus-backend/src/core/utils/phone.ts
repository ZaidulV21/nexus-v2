/**
 * Phone normalization for client identification. Kept deliberately simple:
 * digits only, so "+91 98765 43210", "(98765) 43210" and "9876543210" all
 * compare equal. No country-code/prefix rewriting - two numbers are only
 * "the same" when their raw digits match.
 */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/[^\d]/g, '');
}

/** Masks a phone for display, revealing only the last 4 digits. */
export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  return `****${digits.slice(-4)}`;
}

/** Masks an email for display, keeping the first and last characters of the local part. */
export function maskEmail(email: string): string {
  const value = (email || '').trim();
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0) return value;
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  if (local.length <= 2) {
    return `${local[0]}*${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}

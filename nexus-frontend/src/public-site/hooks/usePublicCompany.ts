import { useCompanySettings } from '@/queries/useCompany';
import { COMPANY_INFO } from '../constants';
import type { CompanySetting } from '@/types';

/**
 * Safely extract a non-null, non-empty string from a CompanySetting field.
 * Returns the fallback if the value is null, undefined, or empty.
 */
function safe(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

/**
 * Build a full address string from individual address fields.
 * Skips empty parts and joins with ", ".
 */
function buildAddress(settings: CompanySetting): string {
  const parts = [
    settings.addressLine1,
    settings.addressLine2,
    settings.city,
    settings.state,
    settings.country,
    settings.pincode,
  ].filter((p) => p?.trim());
  return parts.length > 0 ? parts.join(', ') : '';
}

/**
 * Public-facing company settings hook.
 *
 * Wraps the existing `useCompanySettings()` hook with graceful fallbacks.
 * If a field is empty/null in the backend, falls back to the hardcoded
 * `COMPANY_INFO` constant so the public website never shows blanks.
 *
 * Uses the same React Query cache as the Admin Panel — no duplicate API calls.
 */
export function usePublicCompany() {
  const { data: settings, isLoading, isError } = useCompanySettings();

  // If settings haven't loaded yet or the request failed, return all fallbacks
  if (!settings || isError) {
    return {
      isLoading,
      name: COMPANY_INFO.name,
      tagline: COMPANY_INFO.tagline,
      logoUrl: null as string | null,
      email: COMPANY_INFO.email,
      phone: COMPANY_INFO.phone,
      address: COMPANY_INFO.address,
      city: '',
      state: '',
      country: '',
      fullAddress: COMPANY_INFO.address,
      website: '' as string,
      supportEmail: '' as string,
      social: {
        facebook: '' as string,
        instagram: '' as string,
        linkedin: '' as string,
        twitter: '' as string,
        youtube: '' as string,
      },
    };
  }

  const fullAddress = buildAddress(settings);

  return {
    isLoading,
    name: safe(settings.companyName, COMPANY_INFO.name),
    tagline: COMPANY_INFO.tagline,
    logoUrl: settings.logoUrl || null,
    email: safe(settings.email, COMPANY_INFO.email),
    phone: safe(settings.phone, COMPANY_INFO.phone),
    address: safe(settings.addressLine1, COMPANY_INFO.address),
    city: settings.city || '',
    state: settings.state || '',
    country: settings.country || '',
    fullAddress: fullAddress || COMPANY_INFO.address,
    website: settings.website || '',
    supportEmail: settings.supportEmail || '',
    social: {
      facebook: settings.facebook || '',
      instagram: settings.instagram || '',
      linkedin: settings.linkedin || '',
      twitter: settings.twitter || '',
      youtube: settings.youtube || '',
    },
  };
}

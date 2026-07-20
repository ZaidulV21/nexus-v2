import { companyService } from './company.service';

/**
 * Returns the branding subset of Company Settings for use in PDF generation,
 * email templates, and other downstream consumers. Caches the result for
 * the lifetime of the process to avoid hitting the DB on every call.
 *
 * Call `clearBrandingCache()` after settings are updated to pick up changes
 * immediately.
 */
let cachedBranding: Record<string, unknown> | null = null;

export async function getCompanyBranding() {
  if (cachedBranding) return cachedBranding;

  const s = await companyService.get();
  cachedBranding = {
    companyName: s.companyName,
    legalBusinessName: s.legalBusinessName,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    gstNumber: s.gstNumber,
    panNumber: s.panNumber,
    cin: s.cin,
    email: s.email,
    phone: s.phone,
    whatsappNumber: s.whatsappNumber,
    website: s.website,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    city: s.city,
    state: s.state,
    country: s.country,
    pincode: s.pincode,
    currency: s.currency,
    currencySymbol: s.currencySymbol,
    timezone: s.timezone,
    dateFormat: s.dateFormat,
    invoicePrefix: s.invoicePrefix,
    quotationPrefix: s.quotationPrefix,
    projectPrefix: s.projectPrefix,
    clientPrefix: s.clientPrefix,
    leadPrefix: s.leadPrefix,
    defaultGstPercent: s.defaultGstPercent,
    defaultPaymentTerms: s.defaultPaymentTerms,
    bankName: s.bankName,
    accountHolder: s.accountHolder,
    accountNumber: s.accountNumber,
    ifsc: s.ifsc,
    branch: s.branch,
    upiId: s.upiId,
    qrCodeUrl: s.qrCodeUrl,
    senderName: s.senderName,
    replyToEmail: s.replyToEmail,
    supportEmail: s.supportEmail,
    companySignatureUrl: s.companySignatureUrl,
    companyStampUrl: s.companyStampUrl,
  };
  return cachedBranding;
}

export function clearBrandingCache() {
  cachedBranding = null;
}

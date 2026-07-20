import { useCompanySettings } from '@/queries/useCompany';

export function CompanyLogo({ className = 'h-6 w-6' }: { className?: string }) {
  const { data: settings } = useCompanySettings();

  if (settings?.logoUrl) {
    return (
      <img
        src={settings.logoUrl}
        alt={settings.companyName || 'Company Logo'}
        className={`${className} shrink-0 rounded object-contain`}
      />
    );
  }

  return null;
}

export function CompanyName({ fallback = 'Nexus', className = '' }: { fallback?: string; className?: string }) {
  const { data: settings } = useCompanySettings();
  return <span className={className}>{settings?.companyName || fallback}</span>;
}

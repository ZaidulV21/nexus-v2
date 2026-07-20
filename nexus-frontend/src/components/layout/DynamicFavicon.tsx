import { useEffect } from 'react';
import { useCompanySettings } from '@/queries/useCompany';

export function DynamicFavicon() {
  const { data: settings } = useCompanySettings();

  useEffect(() => {
    const url = settings?.faviconUrl;
    if (!url) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;

    const sizes = url.endsWith('.svg') ? 'any' : '48x48';
    link.setAttribute('sizes', sizes);
  }, [settings?.faviconUrl]);

  return null;
}

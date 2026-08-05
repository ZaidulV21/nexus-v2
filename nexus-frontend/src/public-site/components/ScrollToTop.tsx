import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to the top on route changes, EXCEPT when navigating between
 * sub-services of the same main service (e.g. /services/signage/new-signage
 * → /services/signage/signage-repair). Those switches update only the content
 * area in place, so a hard scroll-to-top would feel like a page reload.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const prevSegments = prevPathname.current.split('/').filter(Boolean);
    const nextSegments = pathname.split('/').filter(Boolean);

    const sameServiceSubSwitch =
      prevSegments[0] === 'services' &&
      nextSegments[0] === 'services' &&
      prevSegments[1] === nextSegments[1] &&
      prevSegments.length >= 3 &&
      nextSegments.length >= 3;

    if (!sameServiceSubSwitch) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}

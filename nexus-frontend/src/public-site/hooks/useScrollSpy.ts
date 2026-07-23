import { useState, useEffect } from 'react';

export function useScrollSpy(offset = 100) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: `-${offset}px 0px -80% 0px` }
    );

    const elements = document.querySelectorAll('[data-scrollspy]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [offset]);

  return activeId;
}

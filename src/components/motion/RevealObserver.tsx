'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Un único observador para todas las apariciones al hacer scroll.
 *
 * Los bloques marcados con `data-reveal` arrancan ocultos (solo si hay JS, ver
 * globals.css) y aparecen una vez al entrar en pantalla. Con movimiento reducido
 * se muestran de inmediato. Evita convertir cada bloque en componente cliente.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="visible"])'));

    if (reduce || !('IntersectionObserver' in window)) {
      pending().forEach((el) => (el.dataset.reveal = 'visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'visible';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const observeAll = () => pending().forEach((el) => observer.observe(el));
    observeAll();

    // Contenido que llega después (navegación del cliente, Suspense).
    const mutations = new MutationObserver(observeAll);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}

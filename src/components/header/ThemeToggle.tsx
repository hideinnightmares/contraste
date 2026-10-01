'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Mark } from '@/components/brand/Mark';
import { applyTheme, currentTheme, type Theme } from './theme';
import styles from './ThemeToggle.module.css';

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  media.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener('change', onChange);
  };
}

/**
 * Selector de modo claro/oscuro. Es un botón conmutador (`aria-pressed`) con un
 * nombre fijo, "Modo oscuro", así el lector de pantalla anuncia el estado sin
 * cambiar de etiqueta.
 */
export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => 'light');
  const isDark = theme === 'dark';

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => applyTheme(next));
    else applyTheme(next);
  }, []);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={isDark}
      onClick={toggle}
      aria-label={showLabel ? undefined : 'Modo oscuro'}
    >
      <Mark className={`${styles.icon} ${isDark ? styles.iconDark : ''}`} size={18} />
      {showLabel && <span>Modo oscuro</span>}
    </button>
  );
}

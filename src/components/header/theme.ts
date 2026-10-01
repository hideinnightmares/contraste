export const THEME_STORAGE_KEY = 'contraste-theme';

export type Theme = 'light' | 'dark';

/** Tema efectivo: el elegido por la persona o, si no eligió, el del sistema. */
export function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el tema dura hasta recargar.
  }
}

'use client';

import { Search } from 'lucide-react';
import { OPEN_SEARCH_EVENT } from './events';
import styles from './SearchButton.module.css';

export function SearchButton({ variant }: { variant: 'labelled' | 'icon' }) {
  const open = () => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
  if (variant === 'icon') {
    return (
      <button type="button" className={styles.icon} onClick={open} aria-label="Buscar">
        <Search size={19} strokeWidth={1.75} aria-hidden="true" />
      </button>
    );
  }
  return (
    <button type="button" className={styles.labelled} onClick={open} aria-keyshortcuts="/">
      <Search size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className={styles.text}>Buscar</span>
      <kbd className={styles.kbd} aria-hidden="true">
        /
      </kbd>
    </button>
  );
}

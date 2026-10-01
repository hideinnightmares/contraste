import Link from 'next/link';
import { site } from '@/config/site';
import { Mark } from './Mark';
import styles from './Logo.module.css';

export function Logo({ size = 'bar' }: { size?: 'bar' | 'large' }) {
  return (
    <Link href="/" className={`${styles.logo} ${styles[size]}`} aria-label={`${site.name}, ir a la portada`}>
      <Mark className={styles.mark} size={28} />
      <span className={styles.word} aria-hidden="true">
        {site.name}
      </span>
    </Link>
  );
}

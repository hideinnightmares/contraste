import type { Metadata } from 'next';
import styles from './desk.module.css';

export const metadata: Metadata = {
  title: 'Redacción',
  robots: { index: false, follow: false },
};

/** Mesa de redacción: sin el marco del diario (ver SiteFrame) ni publicidad. */
export default function DeskLayout({ children }: LayoutProps<'/redaccion'>) {
  return <div className={styles.desk}>{children}</div>;
}

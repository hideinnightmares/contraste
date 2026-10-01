import Link from 'next/link';
import styles from './status.module.css';

export function NewsletterStatus({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'error';
}) {
  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.card} data-tone={tone}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.body}>{children}</div>
        <p className={styles.back}>
          <Link href="/">Volver a la portada</Link>
        </p>
      </div>
    </div>
  );
}

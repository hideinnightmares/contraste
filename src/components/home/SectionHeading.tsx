import Link from 'next/link';
import styles from './SectionHeading.module.css';

interface Props {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  description?: string;
}

export function SectionHeading({ id, title, href, linkLabel, description }: Props) {
  return (
    <div className={styles.heading}>
      <div className={styles.row}>
        <h2 id={id} className={styles.title}>
          {href ? (
            <Link href={href} className={styles.titleLink}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {href && linkLabel && (
          <Link href={href} className={styles.more}>
            {linkLabel}
          </Link>
        )}
      </div>
      {description && <p className={styles.description}>{description}</p>}
    </div>
  );
}

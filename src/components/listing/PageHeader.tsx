import styles from './PageHeader.module.css';

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </header>
  );
}

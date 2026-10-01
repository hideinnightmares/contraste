'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MainNav.module.css';

interface Props {
  sections: { slug: string; name: string }[];
  /** `bar`: dentro de la barra fija (escritorio). `strip`: franja desplazable bajo la cabecera (teléfono). */
  placement: 'bar' | 'strip';
}

/** Navegación por secciones. Se muestra una sola variante según el ancho. */
export function MainNav({ sections, placement }: Props) {
  const pathname = usePathname();
  return (
    <nav className={`${styles.nav} ${styles[placement]}`} aria-label="Navegación principal">
      <ul role="list" className={styles.list}>
        {sections.map((s) => {
          const href = `/seccion/${s.slug}`;
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={s.slug}>
              <Link href={href} className={styles.link} aria-current={current ? 'page' : undefined}>
                {s.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

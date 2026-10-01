'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { newsletter } from '@/config/newsletter';
import { ThemeToggle } from './ThemeToggle';
import styles from './MobileMenu.module.css';

interface Props {
  sections: { slug: string; name: string }[];
}

/** Menú de pantalla completa para teléfonos y tablets, sobre un `<dialog>` modal. */
export function MobileMenu({ sections }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const titleId = useId();

  // Al navegar, se cierra.
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  const open = () => dialog.current?.showModal();
  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} aria-haspopup="dialog">
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className={styles.triggerText}>Menú</span>
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
        <div className={styles.top}>
          <h2 id={titleId} className={styles.title}>
            Secciones
          </h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Cerrar el menú">
            <X size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <nav aria-labelledby={titleId}>
          <ul role="list" className={styles.sections}>
            {sections.map((s, i) => {
              const href = `/seccion/${s.slug}`;
              return (
                <li key={s.slug} style={{ '--i': i } as React.CSSProperties}>
                  <Link href={href} className={styles.section} aria-current={pathname === href ? 'page' : undefined}>
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.secondary}>
          <ul role="list" className={styles.links}>
            <li>
              <Link href="/ultimas">Últimas noticias</Link>
            </li>
            <li>
              <Link href="/buscar">Búsqueda avanzada</Link>
            </li>
            <li>
              <Link href="/metodologia">Cómo trabajamos</Link>
            </li>
            <li>
              {newsletter.endpoint ? (
                <Link href="/#newsletter" onClick={close}>
                  Newsletter
                </Link>
              ) : (
                <a href="/rss.xml">RSS</a>
              )}
            </li>
          </ul>
          <ThemeToggle />
        </div>
      </dialog>
    </>
  );
}

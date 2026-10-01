import Link from 'next/link';
import { categories } from '@/config/categories';
import { site } from '@/config/site';
import { newsletter } from '@/config/newsletter';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from './ThemeToggle';
import { TodayDate } from './TodayDate';
import { MainNav } from './MainNav';
import { MobileMenu } from './MobileMenu';
import { SearchButton } from '@/components/search/SearchButton';
import { SearchDialog } from '@/components/search/SearchDialog';
import styles from './SiteHeader.module.css';

/**
 * Cabecera en dos niveles: una franja negra fina (fecha, aviso de demostración,
 * tema) que se va al bajar, y una barra fija en una sola línea con el logo, las
 * secciones y el buscador. La cabecera entera es `sticky` con desplazamiento
 * negativo igual al alto de la franja: así solo queda fija la barra.
 */
export function SiteHeader() {
  const nav = categories.map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <>
      <header className={styles.header} style={{ viewTransitionName: 'site-header' }}>
        <div className={`invert ${styles.topbar}`}>
          <div className={`container ${styles.topbarInner}`}>
            <TodayDate className={styles.date} />
            {site.demoMode && (
              <section className={styles.demo} aria-label="Aviso de edición de demostración">
                <p>
                  <strong>Edición de demostración.</strong> Todas las noticias son ficticias.{' '}
                  <Link href="/metodologia#demo" className={styles.demoLink}>
                    Qué es real y qué no
                  </Link>
                </p>
              </section>
            )}
            <div className={styles.topActions}>
              <Link href="/ultimas" className={styles.topLink}>
                Últimas noticias
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className={styles.bar}>
          <div className={`container ${styles.barInner}`}>
            <div className={styles.menu}>
              <MobileMenu sections={nav} />
            </div>
            <Logo />
            <MainNav sections={nav} placement="bar" />
            <div className={styles.actions}>
              <SearchButton variant="labelled" />
              {/* Sin newsletter todavía, el botón lleva al RSS en lugar de prometer algo que no existe. */}
              {newsletter.endpoint ? (
                <Link href="/#newsletter" className={styles.subscribe}>
                  Newsletter
                </Link>
              ) : (
                <a href="/rss.xml" className={styles.subscribe}>
                  RSS
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
      <MainNav sections={nav} placement="strip" />
      <SearchDialog sections={nav} />
    </>
  );
}

import Link from 'next/link';
import { categories } from '@/config/categories';
import { site } from '@/config/site';
import { newsletter } from '@/config/newsletter';
import { Logo } from '@/components/brand/Logo';
import { CookiePreferencesButton } from '@/components/privacy/ConsentBanner';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  const year = new Date().getFullYear();
  const legalName = site.organization.legalName;
  return (
    <footer className={`invert ${styles.footer}`}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Logo size="large" />
          <p className={styles.tagline}>{site.tagline}. Cada nota muestra las fuentes que consultamos y qué está confirmado.</p>
        </div>

        <nav aria-labelledby="footer-secciones" className={styles.column}>
          <h2 id="footer-secciones" className={styles.heading}>
            Secciones
          </h2>
          <ul role="list" className={styles.sections}>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/seccion/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-diario" className={styles.column}>
          <h2 id="footer-diario" className={styles.heading}>
            El diario
          </h2>
          <ul role="list" className={styles.links}>
            <li>
              <Link href="/quienes-somos">Quiénes somos</Link>
            </li>
            <li>
              <Link href="/metodologia">Cómo trabajamos</Link>
            </li>
            <li>
              <Link href="/metodologia#verificacion">Verificación y fuentes</Link>
            </li>
            <li>
              <Link href="/metodologia#correcciones">Correcciones</Link>
            </li>
            <li>
              <Link href="/ultimas">Últimas noticias</Link>
            </li>
            {newsletter.endpoint && (
              <li>
                <Link href="/#newsletter">Newsletter</Link>
              </li>
            )}
            <li>
              <a href="/rss.xml">RSS</a>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal" className={styles.column}>
          <h2 id="footer-legal" className={styles.heading}>
            Legal
          </h2>
          <ul role="list" className={styles.links}>
            <li>
              <Link href="/privacidad">Política de privacidad</Link>
            </li>
            <li>
              <Link href="/terminos">Términos y condiciones</Link>
            </li>
            <li>
              <Link href="/cookies">Política de cookies</Link>
            </li>
            <li>
              <CookiePreferencesButton className={styles.linkButton} />
            </li>
          </ul>
        </nav>
      </div>

      <div className={`container ${styles.bottom}`}>
        {site.demoMode && (
          <p className={styles.demo}>
            Edición de demostración: las noticias, las fuentes y las cifras publicadas son ficticias. Las fotos son reales y
            se usan como ilustración, con su autor y licencia indicados en cada nota.
          </p>
        )}
        <p>
          © {year} {legalName ?? site.name}.{' '}
          {!legalName && <span className={styles.pending}>Razón social y datos de contacto a completar por el responsable del medio.</span>}
        </p>
      </div>
    </footer>
  );
}

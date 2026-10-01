import type { Metadata } from 'next';
import { consentCategories, storage, thirdParties } from '@/config/privacy';
import { isAdSenseConfigured } from '@/config/ads';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { LegalNotice, Prose } from '@/components/prose/Prose';
import { CookiePreferencesButton } from '@/components/privacy/ConsentBanner';
import listing from '../listing.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Qué guarda Contraste en tu navegador, qué servicios de terceros puede usar y cómo cambiar tus preferencias.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <div className={`container ${listing.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Política de cookies', path: '/cookies' }]} />
      <PageHeader title="Política de cookies" description="Lo que este sitio guarda en tu navegador, sin letra chica. La lista sale del mismo código que lo guarda." />
      <LegalNotice updated="1 de octubre de 2026" />
      <Prose>
        <h2 id="que-son">Qué son</h2>
        <p>
          Las cookies y el almacenamiento local son pequeños datos que un sitio guarda en tu navegador. Algunos son necesarios
          para que el sitio recuerde tus preferencias; otros sirven para medir audiencia o personalizar publicidad.
        </p>

        <h2 id="propias">Lo que guarda Contraste hoy</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Tipo</th>
                <th scope="col">Para qué</th>
                <th scope="col">Duración</th>
              </tr>
            </thead>
            <tbody>
              {storage.map((s) => (
                <tr key={s.key}>
                  <td>
                    <code>{s.key}</code>
                  </td>
                  <td>{s.kind === 'localStorage' ? 'Almacenamiento local' : 'Cookie'}</td>
                  <td>{s.purpose}</td>
                  <td>{s.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Ninguno de los dos se envía a nuestros servidores ni sirve para identificarte. El sitio no usa cookies propias de
          seguimiento.
        </p>

        <h2 id="categorias">Categorías que podés elegir</h2>
        <dl>
          {Object.entries(consentCategories).map(([key, c]) => (
            <div key={key}>
              <dt>
                {c.name}
                {c.required ? ' (siempre activas)' : ''}
              </dt>
              <dd>{c.description}</dd>
            </div>
          ))}
        </dl>

        <h2 id="terceros">Servicios de terceros</h2>
        <p>
          {isAdSenseConfigured()
            ? 'Este sitio usa los siguientes servicios de terceros:'
            : 'Hoy no hay ningún servicio de terceros activo. El sitio está preparado para estos, que solo se cargarían con la configuración correspondiente:'}
        </p>
        <ul>
          {thirdParties.map((t) => (
            <li key={t.name}>
              <strong>{t.name}</strong> ({t.purpose.toLowerCase()}). {t.loadsWhen}{' '}
              <a href={t.policyUrl} target="_blank" rel="noopener noreferrer">
                Cómo usa Google las cookies de publicidad
              </a>
              .
            </li>
          ))}
        </ul>
        <p>
          El sitio no inserta reproductores de video, mapas ni botones sociales de terceros. Los botones para compartir son
          enlaces simples: la red social recibe datos solo si hacés clic.
        </p>

        <h2 id="cambiar">Cómo cambiar tu decisión</h2>
        <p>Podés cambiarla cuando quieras, también desde el pie de cualquier página:</p>
        <p>
          <CookiePreferencesButton className={styles.button} />
        </p>
        <p>
          También podés borrar el almacenamiento de este sitio desde la configuración de tu navegador. Si lo hacés, se olvidan tus
          preferencias y te volvemos a preguntar.
        </p>
      </Prose>
    </div>
  );
}

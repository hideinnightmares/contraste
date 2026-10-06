import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { editorial } from '@/config/editorial';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { Pending, Prose } from '@/components/prose/Prose';
import listing from '../listing.module.css';

export const metadata: Metadata = {
  title: 'Quiénes somos',
  description: 'Quién hace Contraste, cómo trabajamos y cómo contactarnos.',
  alternates: { canonical: '/quienes-somos' },
};

const org = site.organization;
const humanReview = editorial.review.mode === 'human';

/** Quién edita el diario y cómo contactarlo. Todo sale de config/site.ts y config/editorial.ts. */
export default function AboutPage() {
  const email = org.contactEmail;
  return (
    <div className={`container ${listing.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Quiénes somos', path: '/quienes-somos' }]} />
      <PageHeader title="Quiénes somos" description="Quién hace Contraste, cómo trabajamos y cómo contactarnos." />

      <Prose>
        <h2 id="diario">Qué es {site.name}</h2>
        <p>{site.description}</p>
        <p>
          Cada nota muestra qué fuentes la respaldan, si son independientes entre sí y qué está confirmado y qué todavía no.
          Cuando las fuentes no coinciden, lo decimos.
        </p>

        <h2 id="quien">Quién lo hace</h2>
        <p>
          {site.name} lo edita {org.editorInChief ?? <Pending>editor responsable</Pending>}
          {org.address && `, en ${org.address}`}, que está a cargo del contenido
          {humanReview ? ' y revisa y aprueba cada nota antes de que se publique' : ''}.
        </p>

        <h2 id="como">Cómo trabajamos</h2>
        <p>
          Seguimos medios, agencias y organismos oficiales. Solo redactamos un hecho cuando lo cuentan al menos{' '}
          {editorial.drafting.minIndependentSources} fuentes independientes, y lo que una fuente da en condicional no lo
          presentamos como confirmado.
        </p>
        <p>
          Los borradores los escribe un modelo de lenguaje, solo con lo que dicen las fuentes. Un control automático marca las
          cifras y los nombres que no aparecen en ellas{humanReview ? ', y una persona revisa cada borrador antes de publicarlo' : ''}.
          El detalle está en <Link href="/metodologia">Cómo trabajamos</Link>.
        </p>

        <h2 id="independencia">Independencia</h2>
        <p>
          Los anuncios se muestran siempre con la etiqueta “Publicidad” y separados del contenido. Los anunciantes no intervienen
          en las decisiones editoriales.
        </p>

        <h2 id="contacto">Contacto</h2>
        <p>
          Para avisarnos de un error, proponer una corrección o hacer cualquier consulta, escribinos a{' '}
          {email ? <a href={`mailto:${email}`}>{email}</a> : <Pending>email de contacto</Pending>}. Cómo corregimos los errores
          está en <Link href="/metodologia#correcciones">Correcciones</Link>.
        </p>
      </Prose>
    </div>
  );
}

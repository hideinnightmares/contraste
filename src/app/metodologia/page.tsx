import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import { editorial } from '@/config/editorial';
import { verificationLabel } from '@/domain/labels';
import type { VerificationStatus } from '@/domain/types';
import { Breadcrumbs } from '@/components/article/Breadcrumbs';
import { PageHeader } from '@/components/listing/PageHeader';
import { Pending, Prose } from '@/components/prose/Prose';
import { SourceMeter } from '@/components/story/SourceMeter';
import listing from '../listing.module.css';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Cómo trabajamos',
  description: 'Cómo Contraste recopila, verifica y publica noticias: fuentes, controles automáticos, revisión humana y correcciones.',
  alternates: { canonical: '/metodologia' },
};

const steps = [
  { title: 'Fuentes', text: 'Seguimos agencias, medios, organismos oficiales y documentos públicos por RSS y APIs. Cada fuente tiene un tipo y un origen editorial registrado.' },
  { title: 'Recopilación', text: 'Reunimos lo publicado en las últimas horas y lo normalizamos: título, resumen, fecha, enlace y fuente.' },
  { title: 'Deduplicación', text: 'Agrupamos los ítems que cuentan el mismo hecho. Las réplicas de un mismo cable cuentan como una sola fuente.' },
  { title: 'Investigación', text: 'Para cada hecho buscamos más fuentes, en especial las primarias: el documento, el organismo, el dato original.' },
  { title: 'Verificación', text: 'Comparamos fechas, nombres y cifras entre fuentes. Si no coinciden, el hecho se marca para revisión humana.' },
  { title: 'Redacción', text: 'Un modelo de lenguaje escribe un borrador original solo con la información verificada. Cada cifra del borrador tiene que estar en alguna fuente.' },
  { title: 'Revisión', text: 'Una persona de la redacción revisa y aprueba. Ciertas secciones, como Política, siempre pasan por revisión humana.' },
  { title: 'Publicación', text: 'La nota sale con sus fuentes, su estado de verificación y su historial de cambios a la vista.' },
];

const statuses: VerificationStatus[] = ['verified', 'partial', 'developing', 'disputed'];

export default function MethodologyPage() {
  return (
    <div className={`container ${listing.page}`}>
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Cómo trabajamos', path: '/metodologia' }]} />
      <PageHeader
        title="Cómo trabajamos"
        description="Contrastar es comparar una fuente con otra. Así hacemos cada nota, y así podés comprobarlo."
      />

      <section aria-labelledby="proceso" className={styles.process}>
        <h2 id="proceso" className={styles.processTitle}>
          De la fuente a la nota
        </h2>
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.title} className={styles.step} data-reveal style={{ '--reveal-index': i } as React.CSSProperties}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Prose>
        <h2 id="verificacion">Qué significa cada estado de verificación</h2>
        <p>Cada nota muestra un medidor: un segmento por fuente consultada, lleno si es independiente.</p>
        <ul className={styles.legend}>
          {statuses.map((s) => (
            <li key={s}>
              <SourceMeter status={s} sourceCount={3} independent={s === 'partial' ? 2 : 3} size="large" />
              <p>{verificationLabel[s].long}</p>
            </li>
          ))}
        </ul>
        <p>
          Una nota con una sola fuente o sin confirmación independiente no se publica como hecho. Si una información es relevante
          pero no está confirmada, lo decimos en el texto, en el bloque “Lo que todavía no está confirmado”.
        </p>

        <h2 id="independencia">Cómo contamos las fuentes</h2>
        <p>
          Dos medios que publican el mismo cable de agencia son, en realidad, una sola fuente. Por eso registramos el origen
          editorial de cada fuente y contamos como independientes solo las que tienen orígenes distintos. Los agregadores de
          noticias nos sirven para detectar temas, pero nunca cuentan como fuente.
        </p>

        <h2 id="ia">Inteligencia artificial</h2>
        <p>
          Usamos modelos de lenguaje para redactar borradores a partir de información verificada. Ese texto se trata siempre
          como un borrador: el sistema tiene prohibido agregar datos, citas o cifras que no estén en las fuentes, y un control
          automático rechaza los borradores con cifras o nombres que no aparecen en ninguna fuente, o que presentan un mismo
          dato como confirmado y como no confirmado. Cada borrador registra qué modelo lo escribió.
        </p>
        <p>
          La publicación automática está {editorial.review.mode === 'policy' ? 'habilitada solo' : 'deshabilitada. Cuando se habilite, aplicará solo'} para notas
          con al menos {editorial.review.autoPublish.minIndependentSources} fuentes independientes, confianza alta, sin
          contradicciones y fuera de las secciones que siempre requieren revisión humana.
        </p>

        <h2 id="opinion">Hechos y opinión</h2>
        <p>
          Las notas marcadas como <em>Análisis</em> interpretan hechos y llevan sus titulares en cursiva. Los explicadores,
          marcados como <em>Qué se sabe</em>, ordenan lo confirmado y lo pendiente sobre un tema. El resto son noticias: informan
          sin opinar.
        </p>

        <h2 id="correcciones">Correcciones</h2>
        <p>
          Si encontrás un error, escribinos a {site.organization.contactEmail ?? <Pending>email de contacto</Pending>} con el
          enlace a la nota. Corregimos en la misma nota, actualizamos la fecha y dejamos constancia en el historial de cambios.
          No borramos notas para ocultar errores.
        </p>

        <h2 id="publicidad">Publicidad e independencia</h2>
        <p>
          Los anuncios se muestran siempre con la etiqueta “Publicidad” y separados del contenido. Los anunciantes no tienen
          ninguna intervención en qué publicamos ni en cómo.
        </p>

        <h2 id="demo">Esta edición de demostración</h2>
        <p>
          Mientras el sitio funcione en modo demostración, conviene saber qué es real y qué no:
        </p>
        <ul>
          <li>
            <strong>Ficticio:</strong> todas las noticias, sus cifras, las fuentes citadas (que enlazan a example.com), los
            estados de verificación y el orden de “Más leídas”.
          </li>
          <li>
            <strong>Real:</strong> el diseño, el funcionamiento del buscador, del newsletter y de las preferencias de privacidad,
            y el código del pipeline de verificación, que puede ejecutarse con fuentes reales.
          </li>
          <li>
            <strong>Fotos:</strong> son fotografías reales de Wikimedia Commons con licencias libres, usadas como ilustración. No
            muestran los hechos narrados, y cada epígrafe indica autor y licencia.
          </li>
        </ul>
        <p>
          Las notas de demostración no se ofrecen a buscadores: llevan la indicación <code>noindex</code> y no figuran en el
          sitemap. Ver también la <Link href="/privacidad">política de privacidad</Link>.
        </p>
      </Prose>
    </div>
  );
}

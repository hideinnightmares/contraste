import { CircleCheck, CircleHelp, ExternalLink, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type { Article } from '@/domain/types';
import { confidenceLabel, sourceKindLabel, verificationLabel } from '@/domain/labels';
import { formatFull } from '@/domain/dates';
import { SourceMeter } from '@/components/story/SourceMeter';
import styles from './VerificationPanel.module.css';

/** Resultado de cada control automático, con la concordancia de cada sustantivo. */
function checkPhrase(subject: 'fechas' | 'nombres' | 'cifras', result: 'passed' | 'flagged' | 'not_applicable') {
  if (result === 'not_applicable') return `${subject}: no aplica`;
  if (result === 'flagged') return `${subject} con observaciones`;
  return `${subject} ${subject === 'nombres' ? 'revisados' : 'revisadas'}`;
}

/**
 * Fuentes consultadas y estado de verificación. Es la parte de la nota que
 * explica cómo sabemos lo que contamos: qué fuente dijo qué, cuándo se consultó,
 * qué se pudo confirmar y en qué no coinciden.
 */
export function VerificationPanel({ article }: { article: Article }) {
  const v = article.verification;
  const sourceName = new Map(article.sources.map((s) => [s.id, s.name]));
  return (
    <section className={styles.panel} aria-labelledby="fuentes-consultadas" id="fuentes">
      <div className={styles.head}>
        <h2 id="fuentes-consultadas" className={styles.title}>
          Fuentes consultadas
        </h2>
        <SourceMeter status={v.status} sourceCount={article.sources.length} independent={v.independentSources} size="large" />
      </div>

      <p className={styles.summary}>
        {verificationLabel[v.status].long} {confidenceLabel[v.confidence]}: {v.independentSources}{' '}
        {v.independentSources === 1 ? 'fuente independiente' : 'fuentes independientes'} de {article.sources.length} consultadas.
      </p>

      <ol className={styles.sources}>
        {article.sources.map((s) => (
          <li key={s.id} className={styles.source}>
            <div className={styles.sourceMain}>
              <p className={styles.sourceName}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className={styles.sourceLink}>
                    {s.name}
                    <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    <span className="visually-hidden"> (abre en una pestaña nueva)</span>
                  </a>
                ) : (
                  s.name
                )}
              </p>
              {s.contribution && <p className={styles.contribution}>{s.contribution}</p>}
            </div>
            <dl className={styles.sourceMeta}>
              <div>
                <dt>Tipo</dt>
                <dd>{sourceKindLabel[s.kind]}</dd>
              </div>
              <div>
                <dt>Consultada</dt>
                <dd>
                  <time dateTime={s.consultedAt}>{formatFull(s.consultedAt)}</time>
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      {article.isDemo && (
        <p className={styles.demoNote}>Fuentes ficticias de demostración: los enlaces llevan a example.com, un dominio reservado para ejemplos.</p>
      )}

      {v.claims.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.subtitle}>Qué afirma la nota y quién lo respalda</h3>
          <ul className={styles.claims}>
            {v.claims.map((c) => {
              const Icon = c.status === 'confirmed' ? CircleCheck : c.status === 'disputed' ? TriangleAlert : CircleHelp;
              const label = c.status === 'confirmed' ? 'Confirmado' : c.status === 'disputed' ? 'En disputa' : 'Sin confirmar';
              return (
                <li key={c.id} className={styles.claim} data-status={c.status}>
                  <span className={styles.claimStatus}>
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </span>
                  <p className={styles.claimText}>{c.text}</p>
                  <p className={styles.claimSources}>
                    Según: {c.sourceIds.map((id) => sourceName.get(id)).filter(Boolean).join('; ')}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {v.contradictions.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.subtitle}>Contradicciones detectadas</h3>
          {v.contradictions.map((c) => (
            <div key={c.topic} className={styles.contradiction} role="note">
              <p className={styles.contradictionTopic}>
                <TriangleAlert size={16} strokeWidth={2} aria-hidden="true" />
                {c.topic}
              </p>
              <p>{c.detail}</p>
            </div>
          ))}
        </div>
      )}

      <dl className={styles.record}>
        <div>
          <dt>Verificación</dt>
          <dd>
            <time dateTime={v.checkedAt}>{formatFull(v.checkedAt)}</time>
          </dd>
        </div>
        <div>
          <dt>Controles automáticos</dt>
          <dd>
            {[checkPhrase('fechas', v.checks.dates), checkPhrase('nombres', v.checks.names), checkPhrase('cifras', v.checks.figures)]
              .join(', ')
              .replace(/^./, (c) => c.toUpperCase())}
          </dd>
        </div>
        <div>
          <dt>Revisión editorial</dt>
          <dd>
            {article.review.approvedBy === 'human'
              ? 'Aprobada por una persona de la redacción'
              : article.review.approvedBy === 'policy'
                ? 'Aprobada por la política automática de publicación'
                : 'Pendiente'}
          </dd>
        </div>
      </dl>
      <p className={styles.method}>
        <Link href="/metodologia#verificacion">Cómo verificamos</Link> y <Link href="/metodologia#correcciones">cómo pedir una corrección</Link>.
      </p>
    </section>
  );
}

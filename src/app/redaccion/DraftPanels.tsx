import { formatFull } from '@/domain/dates';
import { confidenceLabel, sourceKindLabel, verificationLabel } from '@/domain/labels';
import type { Article } from '@/domain/types';
import styles from './desk.module.css';

const CLAIM_LABEL = { confirmed: 'Confirmado', unconfirmed: 'Sin confirmar', disputed: 'En disputa' } as const;
const CHECK_LABEL = { names: 'Nombres', figures: 'Cifras', dates: 'Fechas' } as const;

/** Paneles de solo lectura al costado del editor: lo que la redacción tiene que mirar antes de publicar. */
export function DraftPanels({ article }: { article: Article }) {
  const v = article.verification;
  const sourceName = new Map(article.sources.map((s) => [s.id, s.name]));
  const flagged = (Object.keys(CHECK_LABEL) as (keyof typeof CHECK_LABEL)[]).filter((k) => v.checks[k] === 'flagged');

  return (
    <aside className={styles.side} aria-label="Verificación y fuentes">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Lo que encontró el control</h2>
        <ul role="list" className={styles.panelList}>
          <li>
            <strong>{verificationLabel[v.status].short}</strong>, {confidenceLabel[v.confidence].toLowerCase()}. {v.independentSources} de {article.sources.length}{' '}
            {article.sources.length === 1 ? 'fuente es independiente' : 'fuentes son independientes'}.
          </li>
          {v.contradictions.map((c, i) => (
            <li key={i} className={styles.error}>
              <strong>Las fuentes no coinciden:</strong> {c.detail}
            </li>
          ))}
          {flagged.length > 0 && (
            <li className={styles.notice}>
              <strong>Revisar a mano:</strong> {flagged.map((k) => CHECK_LABEL[k]).join(', ')}. El control automático no los pudo confirmar en las fuentes.
            </li>
          )}
          {article.review.notes && <li>{article.review.notes}</li>}
        </ul>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Fuentes ({article.sources.length})</h2>
        <ul role="list" className={styles.panelList}>
          {article.sources.map((s) => (
            <li key={s.id}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
              <br />
              <span className={styles.hint}>
                {sourceKindLabel[s.kind]}
                {s.isDemo && ' · ficticia'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {v.claims.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Afirmaciones</h2>
          <ul role="list" className={styles.panelList}>
            {v.claims.map((c) => (
              <li key={c.id}>
                {c.text}
                <br />
                <span className={styles.hint}>
                  {CLAIM_LABEL[c.status]} · {c.sourceIds.map((id) => sourceName.get(id) ?? id).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {article.updates.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Correcciones publicadas</h2>
          <ul role="list" className={styles.panelList}>
            {article.updates.map((u) => (
              <li key={u.at}>
                <span className={styles.hint}>{formatFull(u.at)}</span>
                <br />
                {u.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

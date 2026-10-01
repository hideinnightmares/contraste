import { Fragment } from 'react';
import { CircleCheck, CircleHelp, Info, RefreshCw, TriangleAlert } from 'lucide-react';
import type { BodyBlock } from '@/domain/types';
import { AdSlot } from '@/components/ads/AdSlot';
import styles from './ArticleBody.module.css';

/** Párrafo después del cual va el anuncio dentro de la nota (si la nota es suficientemente larga). */
const INLINE_AD_AFTER_PARAGRAPH = 3;
const MIN_PARAGRAPHS_FOR_AD = 4;

export function ArticleBody({ blocks }: { blocks: BodyBlock[] }) {
  const paragraphIndexes = blocks.flatMap((b, i) => (b.type === 'p' ? [i] : []));
  const adAfterIndex = paragraphIndexes.length >= MIN_PARAGRAPHS_FOR_AD ? paragraphIndexes[INLINE_AD_AFTER_PARAGRAPH - 1] : -1;
  return (
    <div className={styles.body}>
      {blocks.map((block, i) => {
        const node = renderBlock(block, i);
        const ad = i === adAfterIndex;
        return (
          <Fragment key={i}>
            {node}
            {ad && (
              <div className={styles.ad}>
                <AdSlot position="article-inline" />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function renderBlock(block: BodyBlock, i: number) {
  switch (block.type) {
    case 'p':
      return <p className={styles.p}>{block.text}</p>;
    case 'h2':
      return <h2 className={styles.h2}>{block.text}</h2>;
    case 'list':
      return block.ordered ? (
        <ol className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'facts':
      return <FactsBox confirmed={block.confirmed} unconfirmed={block.unconfirmed} id={`hechos-${i}`} />;
    case 'note': {
      const Icon = block.tone === 'disputed' ? TriangleAlert : block.tone === 'update' ? RefreshCw : Info;
      return (
        <div className={styles.note} data-tone={block.tone} role="note">
          <p className={styles.noteTitle}>
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            {block.title}
          </p>
          <p className={styles.noteText}>{block.text}</p>
        </div>
      );
    }
  }
}

/** "Lo que se sabe / Lo que todavía no": separa lo confirmado de lo pendiente. */
function FactsBox({ confirmed, unconfirmed, id }: { confirmed: string[]; unconfirmed: string[]; id: string }) {
  return (
    <section className={styles.facts} aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="visually-hidden">
        Qué está confirmado y qué no
      </h2>
      {confirmed.length > 0 && (
        <div className={styles.factsColumn} data-kind="confirmed">
          <h3 className={styles.factsTitle}>
            <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
            Lo que se sabe
          </h3>
          <ul className={styles.factsList}>
            {confirmed.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {unconfirmed.length > 0 && (
        <div className={styles.factsColumn} data-kind="unconfirmed">
          <h3 className={styles.factsTitle}>
            <CircleHelp size={18} strokeWidth={2} aria-hidden="true" />
            Lo que todavía no está confirmado
          </h3>
          <ul className={styles.factsList}>
            {unconfirmed.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

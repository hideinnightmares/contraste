'use client';

import { useId } from 'react';
import type { BodyBlock } from '@/domain/types';
import styles from './desk.module.css';

const BLOCK_LABEL: Record<BodyBlock['type'], string> = {
  p: 'Párrafo',
  h2: 'Subtítulo',
  list: 'Lista',
  facts: 'Lo que se sabe y lo que no',
  note: 'Recuadro',
};

const TONE_LABEL = { disputed: 'Las fuentes no coinciden', context: 'Contexto', update: 'Actualización' } as const;

/** Una línea por elemento; las vacías se descartan al guardar. */
const lines = (value: string) => value.split('\n');

/** Campos de un bloque. `n` es su posición: los nombres accesibles la llevan para distinguir los bloques. */
function BlockFields({ block, n, onChange }: { block: BodyBlock; n: number; onChange: (block: BodyBlock) => void }) {
  const id = useId();
  switch (block.type) {
    case 'p':
      return (
        <textarea
          aria-label={`Texto del bloque ${n}, párrafo`}
          className={styles.textarea}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      );
    case 'h2':
      return (
        <input aria-label={`Texto del bloque ${n}, subtítulo`} className={styles.input} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      );
    case 'list':
      return (
        <>
          <textarea
            aria-label={`Elementos de la lista del bloque ${n}, uno por línea`}
            className={styles.textarea}
            value={block.items.join('\n')}
            onChange={(e) => onChange({ ...block, items: lines(e.target.value) })}
          />
          <label className={styles.hint}>
            <input type="checkbox" checked={Boolean(block.ordered)} onChange={(e) => onChange({ ...block, ordered: e.target.checked || undefined })} />{' '}
            Lista numerada
          </label>
        </>
      );
    case 'facts':
      return (
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor={`${id}-si`} className={styles.label}>
              Lo que se sabe (uno por línea)
            </label>
            <textarea
              id={`${id}-si`}
              className={styles.textarea}
              value={block.confirmed.join('\n')}
              onChange={(e) => onChange({ ...block, confirmed: lines(e.target.value) })}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`${id}-no`} className={styles.label}>
              Lo que todavía no (uno por línea)
            </label>
            <textarea
              id={`${id}-no`}
              className={styles.textarea}
              value={block.unconfirmed.join('\n')}
              onChange={(e) => onChange({ ...block, unconfirmed: lines(e.target.value) })}
            />
          </div>
        </div>
      );
    case 'note':
      return (
        <>
          <select
            aria-label={`Tipo de recuadro del bloque ${n}`}
            className={styles.select}
            value={block.tone}
            onChange={(e) => onChange({ ...block, tone: e.target.value as typeof block.tone })}
          >
            {Object.entries(TONE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            aria-label={`Título del recuadro del bloque ${n}`}
            className={styles.input}
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
          <textarea
            aria-label={`Texto del recuadro del bloque ${n}`}
            className={styles.textarea}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </>
      );
  }
}

/** Editor del cuerpo de la nota, bloque por bloque. */
export function BodyEditor({ blocks, onChange, disabled }: { blocks: BodyBlock[]; onChange: (blocks: BodyBlock[]) => void; disabled?: boolean }) {
  const replace = (index: number, block: BodyBlock) => onChange(blocks.map((b, i) => (i === index ? block : b)));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  return (
    <fieldset className={`${styles.form} ${styles.fieldset}`} disabled={disabled}>
      <legend className={styles.label}>Cuerpo</legend>
      {blocks.map((block, index) => (
        <div key={index} className={styles.block}>
          <div className={styles.blockHead}>
            <span>
              {index + 1}. {BLOCK_LABEL[block.type]}
            </span>
            <span className={styles.blockTools}>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Subir el bloque ${index + 1}`}
              >
                Subir
              </button>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => move(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label={`Bajar el bloque ${index + 1}`}
              >
                Bajar
              </button>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => remove(index)}
                disabled={blocks.length === 1}
                aria-label={`Quitar el bloque ${index + 1}`}
              >
                Quitar
              </button>
            </span>
          </div>
          <BlockFields block={block} n={index + 1} onChange={(b) => replace(index, b)} />
        </div>
      ))}
      <div className={styles.blockTools}>
        <button type="button" className={styles.button} onClick={() => onChange([...blocks, { type: 'p', text: '' }])}>
          Agregar párrafo
        </button>
        <button type="button" className={styles.button} onClick={() => onChange([...blocks, { type: 'h2', text: '' }])}>
          Agregar subtítulo
        </button>
      </div>
    </fieldset>
  );
}

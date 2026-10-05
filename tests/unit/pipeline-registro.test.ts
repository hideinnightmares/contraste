import { describe, expect, it } from 'vitest';
import { logLine, summaryFromEnv, summaryLines } from '@/pipeline/registro';
import type { ClusterOutcome, PipelineReport } from '@/pipeline/types';

/**
 * Registro de la corrida. En GitHub Actions es público (el repositorio lo es): en modo resumen no
 * puede adelantar qué se está por publicar ni lo que la redacción va a descartar.
 */

const outcome = (over: Partial<ClusterOutcome> & Pick<ClusterOutcome, 'stage'>, headline: string): ClusterOutcome =>
  ({
    cluster: { id: headline, headline, items: [], firstSeenAt: '', lastSeenAt: '' },
    verification: { status: 'verified', independentSources: 2, reasons: [], contradictions: [] },
    category: 'sociedad',
    draft: null,
    grounding: null,
    review: { decision: 'hold', reasons: [] },
    ...over,
  }) as unknown as ClusterOutcome;

const report: PipelineReport = {
  startedAt: '2026-10-05T12:00:00.000Z',
  finishedAt: '2026-10-05T12:02:00.000Z',
  collected: 40,
  skipped: 2,
  failedSources: [],
  clusters: 30,
  outcomes: [
    outcome({ stage: 'drafted', draft: { title: 'Título del borrador guardado' } as never, savedAs: 'base de datos (in_review)', review: { decision: 'human_review', reasons: [] } }, 'Hecho guardado'),
    outcome({ stage: 'drafted', draft: { title: 'Título publicado solo' } as never, savedAs: 'base de datos (published)', review: { decision: 'auto_publish', reasons: [] } }, 'Hecho publicado'),
    outcome({ stage: 'writer_failed', error: 'Ningún modelo de Gemini pudo redactar el borrador (modelo-a: saturado).' }, 'Hecho sin redactar'),
    outcome({ stage: 'save_failed', draft: { title: 'Título que no se guardó' } as never, error: 'la base no responde' }, 'Hecho sin guardar'),
    outcome({ stage: 'deferred' }, 'Hecho para la próxima'),
    outcome({ stage: 'verified', verification: { status: 'unverified', independentSources: 1, reasons: [], contradictions: [] } as never }, 'Hecho de una fuente'),
  ],
};

describe('registro de la corrida', () => {
  it('muestra los datos del hecho solo fuera del modo resumen', () => {
    expect(logLine('guardada → base de datos (in_review)', 'un-slug', false)).toBe('guardada → base de datos (in_review): un-slug');
    expect(logLine('guardada → base de datos (in_review)', 'un-slug', true)).toBe('guardada → base de datos (in_review)');
    expect(logLine('fuente clarin: 55 ítems', undefined, true)).toBe('fuente clarin: 55 ítems');
  });

  it('el modo resumen se pide con CONTRASTE_REGISTRO=resumen', () => {
    expect(summaryFromEnv({ CONTRASTE_REGISTRO: 'resumen' })).toBe(true);
    expect(summaryFromEnv({ CONTRASTE_REGISTRO: ' Resumen ' })).toBe(true);
    expect(summaryFromEnv({})).toBe(false);
  });

  it('el resumen tiene cantidades y errores, sin títulos ni hechos', () => {
    const text = summaryLines(report).join('\n');
    expect(text).toContain('Borradores redactados: 3; guardados: 2.');
    expect(text).toContain('Publicados solos por la política: 1.');
    expect(text).toContain('Para la próxima corrida: 1.');
    expect(text).toContain('Ningún modelo de Gemini pudo redactar el borrador (modelo-a: saturado).');
    expect(text).toContain('la base no responde');
    for (const o of report.outcomes) {
      expect(text).not.toContain(o.cluster.headline);
      if (o.draft) expect(text).not.toContain(o.draft.title);
    }
  });
});

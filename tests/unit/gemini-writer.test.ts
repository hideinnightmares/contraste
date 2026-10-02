import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@google/genai';
import { demoSources } from '@/config/sources';
import { FixtureConnector } from '@/pipeline/sources/fixture';
import { clusterItems } from '@/pipeline/stages/dedupe';
import { verifyCluster } from '@/pipeline/stages/verify';
import { buildBrief } from '@/pipeline/stages/research';
import { GeminiArticleWriter, type GeminiClient } from '@/pipeline/writers/gemini';
import { draftJsonSchema } from '@/pipeline/writers/draft-schema';
import { createWriter } from '@/pipeline/writers';
import { WriterError } from '@/pipeline/writers/writer';
import type { ResearchBrief } from '@/pipeline/types';

const NOW = new Date('2026-10-01T13:00:00Z');

async function brief(): Promise<ResearchBrief> {
  const connectors = demoSources.filter((d) => d.enabled).map((d) => new FixtureConnector(d, undefined, () => NOW));
  const items = (await Promise.all(connectors.map((c) => c.fetchItems({ since: new Date(NOW.getTime() - 86_400_000) })))).flat();
  const cluster = clusterItems(items).find((c) => c.items.length === 5)!;
  return buildBrief(cluster, verifyCluster(cluster), 'sociedad');
}

const validDraft = {
  title: 'Habilitan el puente',
  dek: 'La obra une dos barrios.',
  type: 'noticia',
  category: 'sociedad',
  tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  body: [
    { type: 'p', text: 'Texto.' },
    { type: 'list', items: ['uno', 'dos'], ordered: false },
  ],
  seoDescription: 'Descripción.',
  claims: [{ text: 'Se habilitó el puente.', sourceIds: ['s1'], status: 'confirmed' }],
};

type Reply = { text?: string; modelVersion?: string; promptFeedback?: { blockReason?: string } } | Error;

/** Cliente falso: devuelve las respuestas en orden y registra qué modelo se pidió. */
function fakeClient(replies: Reply[]) {
  const calls: { model: string; config: Record<string, unknown> }[] = [];
  const client: GeminiClient = {
    models: {
      async generateContent({ model, config }) {
        calls.push({ model, config });
        const next = replies.shift();
        if (!next) throw new Error('sin respuesta preparada');
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
  return { client, calls };
}

const models = ['modelo-a', 'modelo-b'];

/** Redactor con el cliente falso y sin esperas reales entre vueltas. */
function writerWith(client: GeminiClient) {
  const sleep = vi.fn(async () => {});
  return { writer: new GeminiArticleWriter({ client, models, sleep }), sleep };
}

describe('redactor de Gemini', () => {
  it('devuelve un borrador validado y anota qué modelo lo escribió', async () => {
    const { client, calls } = fakeClient([{ text: JSON.stringify(validDraft), modelVersion: 'modelo-a-001' }]);
    const draft = await writerWith(client).writer.write(await brief());

    expect(draft.writer).toBe('gemini:modelo-a-001');
    expect(draft.title).toBe('Habilitan el puente');
    expect(draft.tags).toHaveLength(6);
    expect(draft.body[1]).toEqual({ type: 'list', items: ['uno', 'dos'], ordered: undefined });
    expect(calls).toHaveLength(1);
    expect(calls[0].config.responseMimeType).toBe('application/json');
    expect(calls[0].config.systemInstruction).toEqual(expect.any(String));
  });

  it('si un modelo se queda sin cupo, pasa al siguiente', async () => {
    const { client, calls } = fakeClient([
      new ApiError({ message: 'Resource exhausted', status: 429 }),
      { text: JSON.stringify(validDraft) },
    ]);
    const draft = await writerWith(client).writer.write(await brief());

    expect(calls.map((c) => c.model)).toEqual(['modelo-a', 'modelo-b']);
    expect(draft.writer).toBe('gemini:modelo-b');
  });

  it('si todos están saturados, espera y da una segunda vuelta', async () => {
    const busy = () => new ApiError({ message: 'high demand', status: 503 });
    const { client, calls } = fakeClient([busy(), busy(), { text: JSON.stringify(validDraft) }]);
    const { writer, sleep } = writerWith(client);
    const draft = await writer.write(await brief());

    expect(sleep).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.model)).toEqual(['modelo-a', 'modelo-b', 'modelo-a']);
    expect(draft.writer).toBe('gemini:modelo-a');
  });

  it('descarta respuestas que no son JSON o no tienen la forma del borrador', async () => {
    const { client } = fakeClient([
      { text: 'esto no es json' },
      { text: JSON.stringify({ ...validDraft, category: 'inventada' }) },
    ]);
    const { writer, sleep } = writerWith(client);
    const error = await writer.write(await brief()).catch((e) => e);

    expect(error).toBeInstanceOf(WriterError);
    expect(sleep).not.toHaveBeenCalled(); // repetir el mismo pedido no arregla una respuesta mal formada
    expect(error.message).toMatch(/modelo-a: la respuesta no es JSON válido/);
    expect(error.message).toMatch(/modelo-b: el borrador no tiene la forma esperada/);
  });

  it('cuando fallan todos los modelos, el error se puede reintentar más tarde', async () => {
    const { client, calls } = fakeClient([
      new ApiError({ message: 'Resource exhausted', status: 429 }),
      new ApiError({ message: 'high demand', status: 503 }),
      new ApiError({ message: 'Resource exhausted', status: 429 }),
      new ApiError({ message: 'high demand', status: 503 }),
    ]);
    const error = await writerWith(client).writer.write(await brief()).catch((e) => e);

    expect(error).toBeInstanceOf(WriterError);
    expect(error.retryable).toBe(true);
    expect(calls).toHaveLength(4);
  });

  it('una clave inválida corta enseguida y no prueba otros modelos', async () => {
    const { client, calls } = fakeClient([new ApiError({ message: 'API key not valid. Please pass a valid API key.', status: 400 })]);
    const error = await writerWith(client).writer.write(await brief()).catch((e) => e);

    expect(error).toBeInstanceOf(WriterError);
    expect(error.retryable).toBe(false);
    expect(error.message).toMatch(/GEMINI_API_KEY no es válida/);
    expect(calls).toHaveLength(1);
  });

  it('un pedido bloqueado por Google no se reintenta', async () => {
    const { client } = fakeClient([{ promptFeedback: { blockReason: 'SAFETY' } }]);
    const error = await writerWith(client).writer.write(await brief()).catch((e) => e);

    expect(error).toBeInstanceOf(WriterError);
    expect(error.retryable).toBe(false);
  });

  it('el esquema que se manda a Gemini no usa claves que Gemini rechaza', () => {
    const json = JSON.stringify(draftJsonSchema());
    expect(json).not.toContain('"const"');
    expect(json).not.toContain('"$schema"');
    expect(json).toContain('"enum":["p"]');
  });
});

describe('elección del redactor', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('usa Gemini cuando hay GEMINI_API_KEY', () => {
    vi.stubEnv('CONTRASTE_WRITER', '');
    vi.stubEnv('GEMINI_API_KEY', 'clave-de-prueba');
    expect(createWriter().name).toBe('gemini');
  });

  it('sin ninguna clave avisa qué falta', () => {
    vi.stubEnv('CONTRASTE_WRITER', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    expect(() => createWriter()).toThrow(/GEMINI_API_KEY/);
  });

  it('rechaza un redactor que no existe', () => {
    vi.stubEnv('CONTRASTE_WRITER', 'otro');
    expect(() => createWriter()).toThrow(/Opciones: gemini, anthropic/);
  });
});

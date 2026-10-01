import { ApiError, GoogleGenAI } from '@google/genai';
import type { DraftArticle, ResearchBrief } from '../types';
import { WRITER_SYSTEM_PROMPT, WriterError, renderBrief, type ArticleWriter } from './writer';
import { draftJsonSchema, draftSchema } from './draft-schema';

/**
 * Redactor con Gemini (API de Google, plan gratuito de Google AI Studio).
 *
 * - Prueba los modelos en orden. En el plan gratuito el cupo es por modelo y los
 *   Flash se saturan seguido (HTTP 503): si uno no responde, pasa al siguiente.
 *   Los Flash Lite van al final porque escriben peor pero casi siempre responden.
 *   Lista configurable con CONTRASTE_GEMINI_MODELS.
 * - Si todos fallan por algo temporal, espera y da una segunda vuelta solo con
 *   esos modelos. Si vuelve a fallar, el error es reintentable: el pipeline deja
 *   el hecho en espera para la próxima corrida.
 * - Pide la respuesta en JSON con el esquema del borrador y la valida con Zod:
 *   un borrador mal formado no avanza.
 * - Requiere GEMINI_API_KEY (en .env.pipeline, nunca en .env.local).
 * - En el plan gratuito, Google usa lo enviado para mejorar sus productos: el
 *   dossier tiene solo texto de fuentes públicas, nunca datos personales.
 */

export const DEFAULT_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];

/** Pausa antes de la segunda vuelta cuando todos los modelos estaban saturados. */
const RETRY_DELAY_MS = 20_000;

/** Lo único que el redactor usa del cliente; permite probarlo sin red. */
export interface GeminiClient {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    }): Promise<{ text?: string; modelVersion?: string; promptFeedback?: { blockReason?: string } }>;
  };
}

interface GeminiWriterOptions {
  apiKey?: string;
  models?: string[];
  client?: GeminiClient;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

type Attempt = { draft: DraftArticle } | { failure: string; transient: boolean };

export class GeminiArticleWriter implements ArticleWriter {
  readonly name = 'gemini';
  private readonly client: GeminiClient;
  private readonly models: string[];
  private readonly retryDelayMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: GeminiWriterOptions = {}) {
    const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!options.client && !apiKey) {
      throw new WriterError('Falta GEMINI_API_KEY en .env.pipeline.', false);
    }
    this.client = options.client ?? (new GoogleGenAI({ apiKey }) as unknown as GeminiClient);
    const fromEnv = process.env.CONTRASTE_GEMINI_MODELS?.split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    this.models = options.models ?? (fromEnv?.length ? fromEnv : DEFAULT_GEMINI_MODELS);
    this.retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async write(brief: ResearchBrief): Promise<DraftArticle> {
    const contents = renderBrief(brief);
    const failures: string[] = [];
    let pending = this.models;

    for (let round = 1; round <= 2 && pending.length > 0; round++) {
      if (round === 2) await this.sleep(this.retryDelayMs);
      const retryLater: string[] = [];

      for (const model of pending) {
        const attempt = await this.attempt(model, contents);
        if ('draft' in attempt) return attempt.draft;
        failures.push(`${model}: ${attempt.failure}`);
        if (attempt.transient) retryLater.push(model);
      }
      pending = retryLater;
    }

    throw new WriterError(`Ningún modelo de Gemini pudo redactar el borrador (${failures.join('; ')}).`, true);
  }

  /** Un pedido a un modelo. Lanza solo los errores que no tiene sentido reintentar con otro modelo. */
  private async attempt(model: string, contents: string): Promise<Attempt> {
    let response;
    try {
      response = await this.client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: WRITER_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: draftJsonSchema(),
        },
      });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        // Red caída, tiempo agotado: puede andar en un rato.
        return { failure: (error as Error).message, transient: true };
      }
      if (error.status === 429) return { failure: 'sin cupo', transient: true };
      if (error.status >= 500) return { failure: error.status === 503 ? 'saturado' : `error ${error.status}`, transient: true };
      if (error.status === 404) return { failure: 'modelo no disponible para esta clave', transient: false };
      if (error.status === 400 && /api key/i.test(error.message)) {
        throw new WriterError('La clave GEMINI_API_KEY no es válida. Revisala en Google AI Studio.', false, error);
      }
      if (error.status === 401 || error.status === 403) {
        throw new WriterError('Google rechazó la clave GEMINI_API_KEY (sin permiso para este modelo o región).', false, error);
      }
      throw new WriterError(`Gemini rechazó el pedido (${error.status}): ${error.message}`, false, error);
    }

    if (response.promptFeedback?.blockReason) {
      throw new WriterError(`Gemini bloqueó el pedido (${response.promptFeedback.blockReason}).`, false);
    }
    if (!response.text) return { failure: 'respuesta vacía', transient: false };

    let json: unknown;
    try {
      json = JSON.parse(response.text);
    } catch {
      return { failure: 'la respuesta no es JSON válido', transient: false };
    }
    const parsed = draftSchema.safeParse(json);
    if (!parsed.success) return { failure: 'el borrador no tiene la forma esperada', transient: false };

    const draft = parsed.data;
    return {
      draft: {
        ...draft,
        body: draft.body.map((b) => (b.type === 'list' ? { ...b, ordered: b.ordered || undefined } : b)),
        tags: draft.tags.slice(0, 6),
        // La versión exacta que respondió, para poder auditar quién escribió cada borrador.
        writer: `gemini:${response.modelVersion ?? model}`,
      },
    };
  }
}

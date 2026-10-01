import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { DraftArticle, ResearchBrief } from '../types';
import { WRITER_SYSTEM_PROMPT, WriterError, renderBrief, type ArticleWriter } from './writer';
import { draftSchema } from './draft-schema';

/**
 * Redactor con Claude (API de Anthropic).
 *
 * - Modelo: `claude-opus-5-5` por defecto (configurable con CONTRASTE_ANTHROPIC_MODEL).
 * - Salida estructurada validada con Zod: si el modelo no devuelve un borrador
 *   con la forma esperada, falla y la nota no avanza.
 * - Fallbacks del lado del servidor activados: si el modelo declina la solicitud,
 *   la API reintenta con otro modelo dentro de la misma llamada.
 * - Requiere credenciales de Anthropic (ANTHROPIC_API_KEY o un perfil de `ant auth login`).
 */

export class AnthropicArticleWriter implements ArticleWriter {
  readonly name: string;
  private readonly client: Anthropic;

  constructor(
    private readonly model = process.env.CONTRASTE_ANTHROPIC_MODEL ?? 'claude-opus-5-5',
    private readonly effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max' = (process.env.CONTRASTE_ANTHROPIC_EFFORT as 'high') ?? 'high',
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
    this.name = `anthropic:${model}`;
  }

  async write(brief: ResearchBrief): Promise<DraftArticle> {
    let response;
    try {
      response = await this.client.beta.messages.parse({
        model: this.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: this.effort, format: betaZodOutputFormat(draftSchema) },
        system: [{ type: 'text', text: WRITER_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: renderBrief(brief) }],
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
        throw new WriterError(`El redactor no está disponible: ${error.message}`, true, error);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new WriterError('Faltan credenciales válidas de Anthropic (ANTHROPIC_API_KEY o `ant auth login`).', false, error);
      }
      if (error instanceof Anthropic.APIError) {
        throw new WriterError(`La API rechazó el pedido (${error.status}): ${error.message}`, false, error);
      }
      throw new WriterError(`Error inesperado del redactor: ${(error as Error).message}`, false, error);
    }

    if (response.stop_reason === 'refusal') {
      throw new WriterError(`El modelo declinó redactar este tema (${response.stop_details?.category ?? 'sin categoría'}).`, false);
    }
    if (response.stop_reason === 'max_tokens') {
      throw new WriterError('El borrador quedó truncado por longitud.', true);
    }
    const parsed = response.parsed_output;
    if (!parsed) throw new WriterError('El modelo no devolvió un borrador con el formato esperado.', true);

    return {
      ...parsed,
      body: parsed.body.map((b) => (b.type === 'list' ? { ...b, ordered: b.ordered || undefined } : b)),
      tags: parsed.tags.slice(0, 6),
      writer: `${this.name} (servido por ${response.model})`,
    };
  }
}

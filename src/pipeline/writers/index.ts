import { AnthropicArticleWriter } from './anthropic';
import { GeminiArticleWriter } from './gemini';
import { WriterError, type ArticleWriter } from './writer';

/**
 * Elige el redactor según la configuración.
 *
 * CONTRASTE_WRITER=gemini     → Gemini (plan gratuito de Google AI Studio).
 * CONTRASTE_WRITER=anthropic  → Claude (de pago por uso).
 * Sin CONTRASTE_WRITER: Gemini si hay GEMINI_API_KEY; si no, Claude si hay ANTHROPIC_API_KEY.
 *
 * `log` recibe una línea por cada pedido al proveedor (por ahora, solo con Gemini).
 */
export function createWriter(options: { log?: (message: string) => void } = {}): ArticleWriter {
  const chosen = process.env.CONTRASTE_WRITER?.trim().toLowerCase();
  if (chosen === 'gemini' || (!chosen && process.env.GEMINI_API_KEY)) return new GeminiArticleWriter({ log: options.log });
  if (chosen === 'anthropic' || (!chosen && process.env.ANTHROPIC_API_KEY)) return new AnthropicArticleWriter();
  if (chosen) throw new WriterError(`CONTRASTE_WRITER="${chosen}" no existe. Opciones: gemini, anthropic.`, false);
  throw new WriterError('No hay redactor configurado: cargá GEMINI_API_KEY en .env.pipeline.', false);
}

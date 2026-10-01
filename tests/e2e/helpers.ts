import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Escaneo de accesibilidad con axe sobre las reglas WCAG 2.0/2.1/2.2 A y AA. */
export async function expectNoA11yViolations(page: Page, label: string) {
  // Se evalúa el estado final: sin animaciones de entrada a mitad de camino y con
  // los bloques de aparición al hacer scroll ya visibles.
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => (el.dataset.reveal = 'visible'));
    // Solo animaciones con fin: se excluyen las infinitas y las ligadas al scroll.
    const finite = document
      .getAnimations()
      .filter((a) => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
  });
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
  expect(summary, `${label}: ${JSON.stringify(summary, null, 2)}`).toEqual([]);
}

/** Descarta el aviso de cookies para que no tape contenido en los tests que no lo prueban. */
export async function dismissConsent(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'contraste-consent',
        JSON.stringify({ version: 1, analytics: false, advertising: false, decidedAt: new Date().toISOString() }),
      );
    } catch {}
  });
}

/** Registra errores de consola y de página para fallar si aparece alguno. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

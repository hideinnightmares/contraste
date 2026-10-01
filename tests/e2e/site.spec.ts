import { expect, test } from '@playwright/test';
import { collectErrors, dismissConsent, expectNoA11yViolations } from './helpers';

test.describe('portada', () => {
  test('carga sin errores, con jerarquía editorial y aviso DEMO', async ({ page }) => {
    await dismissConsent(page);
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Aviso de edición de demostración' })).toContainText('ficticias');
    await expect(page.getByRole('heading', { level: 2, name: /calor extremo/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Último momento' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Más leídas' })).toBeVisible();
    await expect(page.getByText('Orden elegido a mano para la demostración')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Análisis y contexto' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seguí Contraste por RSS.' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('las fotos salen de las versiones pregeneradas y cargan', async ({ page }) => {
    await dismissConsent(page);
    const failed: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/_img/') && r.status() !== 200) failed.push(`${r.status()} ${r.url()}`);
    });
    await page.goto('/');
    const hero = page.locator('main img').first();
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    expect(await hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/_img\/images\/.+-\d+\.webp$/);
    await page.waitForLoadState('networkidle');
    expect(failed).toEqual([]);
  });

  test('cada tarjeta de nota ficticia lleva la marca Demo', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const cards = page.locator('main article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(15);
    for (let i = 0; i < count; i++) await expect(cards.nth(i).getByText('Demo', { exact: true })).toBeVisible();
  });

  test('los espacios publicitarios están etiquetados y no hay scripts de terceros', async ({ page }) => {
    await dismissConsent(page);
    const external: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost') external.push(url.hostname);
    });
    await page.goto('/');
    const slots = page.locator('[data-ad-position]');
    expect(await slots.count()).toBeGreaterThanOrEqual(3);
    for (const slot of await slots.all()) {
      if (await slot.isVisible()) await expect(slot.getByText('Publicidad', { exact: true })).toBeVisible();
    }
    await page.waitForLoadState('networkidle');
    expect(external).toEqual([]);
  });

  test('accesibilidad: modo claro y oscuro', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    await expectNoA11yViolations(page, 'portada clara');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expectNoA11yViolations(page, 'portada oscura');
  });
});

test.describe('teclado y tema', () => {
  test('el primer Tab enfoca "Saltar al contenido" y lleva al contenido principal', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();
  });

  test('el selector de tema cambia y recuerda el modo oscuro', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Modo oscuro' }).first();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Modo oscuro' }).first()).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('nota', () => {
  test('muestra fuentes, verificación, aviso DEMO y datos estructurados', async ({ page }) => {
    await dismissConsent(page);
    const errors = collectErrors(page);
    await page.goto('/nota/cumbre-climatica-fondo-adaptacion-paises-sur');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('fondo común de adaptación');
    await expect(page.getByText('Esta nota es ficticia.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fuentes consultadas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contradicciones detectadas' })).toBeVisible();
    await expect(page.getByText('Las fuentes no coinciden en el monto')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(/\/nota\/cumbre-climatica-fondo-adaptacion-paises-sur$/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLd.map((t) => JSON.parse(t)['@type']);
    expect(types).toContain('NewsArticle');
    expect(types).toContain('BreadcrumbList');
    expect(errors).toEqual([]);
  });

  test('accesibilidad de la nota', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/nota/ciudades-planes-calor-extremo-verano');
    await expectNoA11yViolations(page, 'nota');
  });

  test('se llega a una nota desde la portada y se puede volver por la ruta de navegación', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    await page.getByRole('heading', { level: 2, name: /calor extremo/ }).getByRole('link').click();
    await expect(page).toHaveURL(/\/nota\/ciudades-planes-calor-extremo-verano$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: 'Sociedad' }).click();
    await expect(page).toHaveURL(/\/seccion\/sociedad$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sociedad' })).toBeVisible();
  });

  test('navegar sin recargar no pide archivos de datos que no existen', async ({ page }) => {
    await dismissConsent(page);
    const missing: string[] = [];
    page.on('response', (r) => {
      if (r.status() === 404 && r.url().includes('_rsc=')) missing.push(r.url());
    });
    await page.goto('/');
    await page.evaluate(() => ((window as unknown as { __sinRecarga: boolean }).__sinRecarga = true));
    await page.locator('main article').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/nota\//);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga)).toBe(true);
    await page.waitForLoadState('networkidle');
    expect(missing).toEqual([]);
  });

  test('una nota inexistente devuelve 404 con salida clara', async ({ page }) => {
    const res = await page.goto('/nota/no-existe');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible();
  });
});

test.describe('buscador', () => {
  test('se abre con "/", busca al escribir y Escape devuelve el foco', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Buscar', exact: true }).first();
    await trigger.focus();
    await page.keyboard.press('/');
    const dialog = page.getByRole('dialog', { name: 'Buscar en Contraste' });
    await expect(dialog).toBeVisible();
    await page.keyboard.type('rana');
    await expect(dialog.getByRole('link', { name: /rana arborícola/ })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(dialog.getByRole('link', { name: /rana arborícola/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('la búsqueda avanzada filtra por sección y avisa rangos de fecha inválidos', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/buscar?q=fuentes&seccion=economia');
    await expect(page.getByRole('heading', { name: /resultado/ })).toBeVisible();
    await page.goto('/buscar?desde=2026-12-01&hasta=2026-01-01');
    await expect(page.locator('main').getByRole('alert')).toContainText('posterior');
    await page.goto('/buscar?q=zzzzzz');
    await expect(page.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
    await expectNoA11yViolations(page, 'buscador');
  });
});

test.describe('newsletter', () => {
  test('sin proveedor no muestra un formulario que no funcionaría: ofrece el RSS', async ({ page, request }) => {
    await dismissConsent(page);
    await page.goto('/');
    const band = page.locator('#newsletter');
    await expect(band).toContainText('todavía no está habilitado');
    await expect(band.getByRole('textbox')).toHaveCount(0);
    await expect(band.getByRole('link', { name: 'Abrir el feed RSS' })).toHaveAttribute('href', '/rss.xml');
    const rss = await request.get('/rss.xml');
    expect(rss.ok()).toBe(true);

    await page.goto('/newsletter/confirmar?token=abc');
    await expect(page.getByRole('heading', { name: 'El newsletter todavía no está habilitado' })).toBeVisible();
  });
});

test.describe('privacidad', () => {
  test('el aviso de cookies aparece, rechazar tiene el mismo peso y la decisión se recuerda', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('region', { name: 'Tu privacidad' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Rechazar' }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Tu privacidad' })).toBeHidden();

    await page.getByRole('button', { name: 'Preferencias de cookies' }).click();
    const dialog = page.getByRole('dialog', { name: 'Preferencias de privacidad' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch', { name: /Publicidad personalizada/ })).not.toBeChecked();
  });

  for (const path of ['/privacidad', '/terminos', '/cookies', '/metodologia']) {
    test(`accesibilidad de ${path}`, async ({ page }) => {
      await dismissConsent(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoA11yViolations(page, path);
    });
  }
});

test.describe('SEO técnico', () => {
  test('robots, sitemaps, RSS y ads.txt', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.headers()['content-type']).toContain('xml');
    expect(await sitemap.text()).not.toContain('/nota/'); // las notas DEMO no se ofrecen a buscadores
    const news = await request.get('/news-sitemap.xml');
    expect(await news.text()).toContain('sitemap-news/0.9');
    const rss = await request.get('/rss.xml');
    expect(await rss.text()).toContain('[DEMO]');
    expect((await request.get('/ads.txt')).status()).toBe(404);
  });

  test('cada sección responde y una sección inexistente da 404', async ({ request }) => {
    for (const slug of ['politica', 'economia', 'mundo', 'tecnologia', 'ciencia', 'cultura', 'deportes', 'sociedad', 'negocios', 'tendencias']) {
      expect((await request.get(`/seccion/${slug}`)).status(), slug).toBe(200);
    }
    expect((await request.get('/seccion/inexistente')).status()).toBe(404);
    // La paginación va en la dirección; una página que no se generó no existe.
    expect((await request.get('/seccion/economia/pagina/99')).status()).toBe(404);
    expect((await request.get('/seccion/economia/pagina/1')).status()).toBe(404);
  });

  test('los temas con pocas notas llevan a la búsqueda filtrada, los demás a su página', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/nota/investigadores-describen-posible-nueva-especie-rana');
    const topics = page.getByRole('heading', { name: 'Temas' }).locator('..');
    const hrefs = await topics.getByRole('link').evaluateAll((links) => links.map((l) => l.getAttribute('href')));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/(tema\/[a-z0-9-]+|buscar\?tema=.+)$/);
    const toSearch = hrefs.find((h) => h?.startsWith('/buscar'));
    if (toSearch) {
      await page.goto(toSearch);
      await expect(page.getByRole('heading', { name: /\d+ resultados?/ })).toBeVisible();
    }
  });

  test('accesibilidad de sección y últimas', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/seccion/economia');
    await expectNoA11yViolations(page, 'sección');
    await page.goto('/ultimas');
    await expectNoA11yViolations(page, 'últimas');
  });
});

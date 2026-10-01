import { test, devices } from '@playwright/test';

const OUT = 'test-results/capturas';

async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => (el.dataset.reveal = 'visible'));
    await document.fonts.ready;
    // Recorre la página para que carguen las fotos diferidas (loading="lazy").
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);
}

const consent = () =>
  localStorage.setItem('contraste-consent', JSON.stringify({ version: 1, analytics: false, advertising: false, decidedAt: new Date().toISOString() }));

test('escritorio', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  const page = await ctx.newPage();
  await page.addInitScript(consent);
  await page.goto('/');
  await settle(page);
  await page.screenshot({ path: `${OUT}/01-portada-arriba.png` });
  await page.screenshot({ path: `${OUT}/02-portada-completa.png`, fullPage: true });
  await page.goto('/nota/cumbre-climatica-fondo-adaptacion-paises-sur');
  await settle(page);
  await page.screenshot({ path: `${OUT}/03-nota-arriba.png` });
  await page.screenshot({ path: `${OUT}/04-nota-completa.png`, fullPage: true });
  await page.goto('/seccion/economia');
  await settle(page);
  await page.screenshot({ path: `${OUT}/05-seccion.png` });
  await page.goto('/');
  await settle(page);
  await page.keyboard.press('/');
  await page.keyboard.type('calor');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/06-buscador.png` });
  await ctx.close();
});

test('oscuro', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  const page = await ctx.newPage();
  await page.addInitScript(consent);
  await page.goto('/');
  await settle(page);
  await page.screenshot({ path: `${OUT}/07-portada-oscura.png` });
  await page.screenshot({ path: `${OUT}/08-portada-oscura-completa.png`, fullPage: true });
  await page.goto('/nota/investigadores-describen-posible-nueva-especie-rana');
  await settle(page);
  await page.screenshot({ path: `${OUT}/09-nota-oscura.png`, fullPage: true });
  await ctx.close();
});

test('movil', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires' });
  const page = await ctx.newPage();
  await page.goto('/');
  await settle(page);
  await page.screenshot({ path: `${OUT}/10-movil-portada-con-aviso.png` });
  await page.evaluate(consent);
  await page.reload();
  await settle(page);
  await page.screenshot({ path: `${OUT}/11-movil-portada-completa.png`, fullPage: true });
  await page.getByRole('button', { name: 'Menú' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/12-movil-menu.png` });
  await page.keyboard.press('Escape');
  await page.goto('/nota/ciudades-planes-calor-extremo-verano');
  await settle(page);
  await page.screenshot({ path: `${OUT}/13-movil-nota.png`, fullPage: true });
  await ctx.close();
});

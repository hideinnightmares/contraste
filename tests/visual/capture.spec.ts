import { test, devices, type Browser, type Page } from '@playwright/test';

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

test('mesa de redacción', async ({ browser }) => {
  const { EDITOR, FakeSupabase, NEW_EDITOR, TOTP_CODE } = await import('../e2e/supabase-mock');
  const shoot = async (options: Parameters<Browser['newContext']>[0], name: string, steps: (page: Page) => Promise<void>) => {
    const ctx = await browser.newContext({ locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', ...options });
    const page = await ctx.newPage();
    await new FakeSupabase().install(page);
    await page.goto('/redaccion');
    await page.screenshot({ path: `${OUT}/${name}-ingreso.png` });
    await page.getByLabel('Email').fill(EDITOR.email);
    await page.getByLabel('Contraseña').fill(EDITOR.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByLabel('Código de 6 dígitos').fill(TOTP_CODE);
    await page.screenshot({ path: `${OUT}/${name}-codigo.png` });
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('heading', { name: 'Notas' }).waitFor();
    await steps(page);
    await ctx.close();
  };

  await shoot({ viewport: { width: 1440, height: 900 } }, '14-mesa', async (page) => {
    await page.screenshot({ path: `${OUT}/14-mesa-lista.png` });
    await page.getByRole('link', { name: /El puerto licitará/ }).click();
    await page.getByLabel('Título', { exact: true }).waitFor();
    await page.screenshot({ path: `${OUT}/14-mesa-nota.png`, fullPage: true });
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await page.screenshot({ path: `${OUT}/14-mesa-confirmar.png` });
  });
  await shoot({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' }, '15-mesa-oscura', async (page) => {
    await page.getByRole('link', { name: /El puerto licitará/ }).click();
    await page.getByLabel('Título', { exact: true }).waitFor();
    await page.screenshot({ path: `${OUT}/15-mesa-oscura-nota.png`, fullPage: true });
  });
  await shoot({ ...devices['Pixel 7'] }, '16-mesa-movil', async (page) => {
    await page.screenshot({ path: `${OUT}/16-mesa-movil-lista.png`, fullPage: true });
    await page.getByRole('link', { name: /El puerto licitará/ }).click();
    await page.getByLabel('Título', { exact: true }).waitFor();
    await page.screenshot({ path: `${OUT}/16-mesa-movil-nota.png`, fullPage: true });
  });

  const ctx = await browser.newContext({ locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  await new FakeSupabase().install(page);
  await page.goto('/redaccion');
  await page.getByLabel('Email').fill(NEW_EDITOR.email);
  await page.getByLabel('Contraseña').fill(NEW_EDITOR.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Configurar la app' }).click();
  await page.getByRole('img', { name: /Código QR/ }).waitFor();
  await page.screenshot({ path: `${OUT}/17-mesa-alta-app.png`, fullPage: true });
  await ctx.close();
});

import { expect, test, type Page } from '@playwright/test';
import { collectErrors, expectNoA11yViolations } from './helpers';
import { EDITOR, EXEMPT_EDITOR, FakeSupabase, NEW_EDITOR, OUTSIDER, TOTP_CODE } from './supabase-mock';

/**
 * Mesa de redacción con sesión, contra un Supabase simulado (supabase-mock.ts): nunca toca la
 * base real. Lo que se prueba es la pantalla y lo que le manda a la base.
 */

const PUERTO = '641d9163-672e-4ae1-8b8c-b054a6d3086a';
const BIBLIOTECA = 'a8f0c2e4-5b6d-4e7f-8a9b-0c1d2e3f4a5b';

/** Avisos de la mesa (Next.js tiene su propio `role="alert"` para anunciar navegaciones, fuera de main). */
const alerts = (page: Page) => page.getByRole('main').getByRole('alert');

async function enterPassword(page: Page, user: { email: string; password: string }) {
  await page.goto('/redaccion');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Ingreso completo de la editora: contraseña y código de la app. */
async function signIn(page: Page) {
  await enterPassword(page, EDITOR);
  await expect(page.getByRole('heading', { level: 1, name: 'Verificación en dos pasos' })).toBeVisible();
  await page.getByLabel('Código de 6 dígitos').fill(TOTP_CODE);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('mesa de redacción con sesión', () => {
  test('publicar una nota en disputa: pide confirmación y la firma una persona', async ({ page }) => {
    const db = new FakeSupabase();
    await db.install(page);
    const errors = collectErrors(page);
    await signIn(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Notas' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await page.getByRole('link', { name: 'El puerto licitará el dragado del canal de acceso' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Nota en revisión' })).toBeVisible();
    const findings = page.getByRole('complementary', { name: 'Verificación y fuentes' });
    await expect(findings).toContainText('Las fuentes no coinciden');
    await expect(findings).toContainText('Revisar a mano: Cifras');
    await expectNoA11yViolations(page, 'editor de la mesa');

    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'Sí, publicar' });
    await expect(confirm).toBeFocused();
    await expect(page.getByText(/confirmá que el texto lo explica sin dar ninguna versión por cierta/)).toBeVisible();
    expect(db.saves).toHaveLength(0);

    await confirm.click();
    await expect(page.getByRole('status')).toContainText('Publicada.');
    await expect(page.getByRole('heading', { level: 1, name: 'Nota publicada' })).toBeVisible();
    expect(db.saves).toHaveLength(1);
    expect(db.saves[0].document.review).toMatchObject({ status: 'published', approvedBy: 'human' });
    expect(db.saves[0].document.title).toBe('El puerto licitará el dragado del canal de acceso');
    expect(db.row(PUERTO).document.review.status).toBe('published');
    expect(errors).toEqual([]);
  });

  test('una nota publicada se corrige con nota de corrección y no pisa cambios ajenos', async ({ page }) => {
    const db = new FakeSupabase();
    await db.install(page);
    await signIn(page);
    await page.getByRole('link', { name: 'Publicadas' }).click();
    await page.getByRole('link', { name: /La biblioteca municipal/ }).click();
    const title = page.getByLabel('Título', { exact: true });
    await title.fill('La biblioteca municipal extiende su horario durante las mesas de examen');

    // Sin explicar la corrección, no se manda nada.
    await page.getByRole('button', { name: 'Publicar la corrección' }).click();
    await expect(alerts(page)).toContainText('Nota de corrección: Explicá qué se corrigió');
    expect(db.saves).toHaveLength(0);

    // Otra persona guardó la nota mientras tanto: avisa en lugar de pisarla.
    await page.getByLabel('Nota de corrección').fill('Precisamos el período: son las mesas de examen.');
    db.touch(BIBLIOTECA);
    await page.getByRole('button', { name: 'Publicar la corrección' }).click();
    await expect(alerts(page)).toContainText('La nota cambió desde que la abriste');
    expect(db.saves).toHaveLength(0);

    await page.getByRole('button', { name: 'Recargar la nota' }).click();
    await expect(alerts(page)).toHaveCount(0);
    await expect(title).toHaveValue('La biblioteca municipal extiende su horario durante los exámenes');

    await title.fill('La biblioteca municipal extiende su horario durante las mesas de examen');
    await page.getByLabel('Nota de corrección').fill('Precisamos el período: son las mesas de examen.');
    await page.getByRole('button', { name: 'Publicar la corrección' }).click();
    await expect(page.getByRole('status')).toContainText('Corrección publicada.');
    expect(db.saves).toHaveLength(1);
    expect(db.saves[0].document.updates.at(-1)?.text).toBe('Precisamos el período: son las mesas de examen.');
    await expect(page.getByLabel('Nota de corrección')).toHaveValue('');
  });

  test('con cambios sin guardar, pregunta antes de volver a la lista', async ({ page }) => {
    await new FakeSupabase().install(page);
    await signIn(page);
    await page.getByRole('link', { name: /Habilitan el nuevo puente/ }).click();
    await page.getByLabel('Bajada').fill('Una bajada nueva, todavía sin guardar, para probar el aviso.');
    await expect(page.getByText('Hay cambios sin guardar.')).toBeVisible();

    page.once('dialog', (dialog) => void dialog.dismiss());
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nota en revisión' })).toBeVisible();

    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notas' })).toBeVisible();
  });

  test('una cuenta fuera de la redacción no ve notas y una contraseña mal escrita lo dice', async ({ page }) => {
    await new FakeSupabase().install(page);
    await enterPassword(page, { email: EDITOR.email, password: 'otra-clave' });
    await expect(alerts(page)).toHaveText('El email o la contraseña no son correctos.');

    await page.getByLabel('Contraseña').fill(OUTSIDER.password);
    await page.getByLabel('Email').fill(OUTSIDER.email);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(alerts(page)).toContainText('no forma parte de la redacción');
    await expect(page.getByRole('link', { name: /El puerto licitará/ })).toHaveCount(0);
  });

  test('un editor eximido de la verificación en dos pasos entra con la contraseña sola', async ({ page }) => {
    await new FakeSupabase().install(page);
    await enterPassword(page, EXEMPT_EDITOR);
    await expect(page.getByRole('link', { name: /El puerto licitará/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toHaveCount(0);
  });

  test('una dirección de nota mal copiada no rompe la mesa', async ({ page }) => {
    await new FakeSupabase().install(page);
    await signIn(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Notas' })).toBeVisible();
    await page.goto('/redaccion?nota=no-es-un-id');
    await expect(alerts(page)).toContainText('No existe una nota con esa dirección');
  });

  test('pide el código de la app: uno incorrecto avisa y el correcto abre la mesa', async ({ page }) => {
    const errors = collectErrors(page);
    await new FakeSupabase().install(page);
    await enterPassword(page, EDITOR);
    await expect(page.getByRole('heading', { level: 1, name: 'Verificación en dos pasos' })).toBeVisible();
    // Con la contraseña sola, la mesa no muestra notas.
    await expect(page.getByRole('heading', { name: 'Notas' })).toHaveCount(0);
    await expectNoA11yViolations(page, 'código de la app');

    await page.getByLabel('Código de 6 dígitos').fill('000000');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(alerts(page)).toContainText('El código no es correcto');

    await page.getByLabel('Código de 6 dígitos').fill(TOTP_CODE);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notas' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    // El código incorrecto responde 422, como Supabase: el navegador lo registra y es esperable.
    expect(errors.filter((e) => !e.includes('status of 422'))).toEqual([]);
  });

  test('un editor sin la app la configura la primera vez; un alta a medias se descarta', async ({ page }) => {
    const db = new FakeSupabase();
    await db.install(page);
    await enterPassword(page, NEW_EDITOR);
    await expect(page.getByRole('heading', { level: 1, name: 'Activá la verificación en dos pasos' })).toBeVisible();

    await page.getByRole('button', { name: 'Configurar la app' }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();
    await expect(page.getByText('JBSWY3DPEHPK3PXP')).toBeVisible();
    await expectNoA11yViolations(page, 'alta de la app');

    // Se recarga la página antes de ingresar el código: el alta vuelve a empezar sin acumular apps.
    await page.reload();
    await page.getByRole('button', { name: 'Configurar la app' }).click();
    await expect(page.getByRole('img', { name: /Código QR/ })).toBeVisible();
    expect(db.factors.get(NEW_EDITOR.id)).toHaveLength(1);

    await page.getByLabel('Código de 6 dígitos').fill(TOTP_CODE);
    await page.getByRole('button', { name: 'Activar y entrar' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Notas' })).toBeVisible();
    expect(db.factors.get(NEW_EDITOR.id)?.map((f) => f.status)).toEqual(['verified']);
  });
});

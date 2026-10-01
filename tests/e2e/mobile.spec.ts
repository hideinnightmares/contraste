import { expect, test } from '@playwright/test';
import { dismissConsent, expectNoA11yViolations } from './helpers';

test.describe('móvil', () => {
  test('no hay desplazamiento horizontal y la principal va primero', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const lead = page.getByRole('heading', { level: 2, name: /calor extremo/ });
    const latest = page.getByRole('heading', { name: 'Último momento' });
    const leadBox = await lead.boundingBox();
    const latestBox = await latest.boundingBox();
    expect(leadBox!.y).toBeLessThan(latestBox!.y);
  });

  test('el menú abre las secciones, navega y se cierra con Escape', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Menú' }).click();
    const menu = page.getByRole('dialog', { name: 'Secciones' });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await page.getByRole('button', { name: 'Menú' }).click();
    await menu.getByRole('link', { name: 'Ciencia' }).click();
    await expect(page).toHaveURL(/\/seccion\/ciencia$/);
    await expect(menu).toBeHidden();
  });

  test('las áreas táctiles principales miden al menos 44 px', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    for (const name of ['Menú', 'Buscar']) {
      const box = await page.getByRole('button', { name, exact: true }).first().boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('accesibilidad en móvil: portada y nota', async ({ page }) => {
    await dismissConsent(page);
    await page.goto('/');
    await expectNoA11yViolations(page, 'portada móvil');
    await page.goto('/nota/investigadores-describen-posible-nueva-especie-rana');
    await expectNoA11yViolations(page, 'nota móvil');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

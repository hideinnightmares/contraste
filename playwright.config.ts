import { defineConfig, devices } from '@playwright/test';

const PORT = 3300;

/**
 * Tests de punta a punta sobre el sitio estático armado (out/), servido por Wrangler
 * con la misma configuración que en Cloudflare (404, direcciones sin .html, encabezados).
 * Correr con `npm run build && npm run test:e2e`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile.spec.ts/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

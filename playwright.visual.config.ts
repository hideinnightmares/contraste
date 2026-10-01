import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Capturas para revisión visual: `npx playwright test -c playwright.visual.config.ts`. */
export default defineConfig({
  ...base,
  testDir: './tests/visual',
  projects: [{ name: 'capturas', use: { ...devices['Desktop Chrome'] } }],
});

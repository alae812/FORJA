/**
 * Fixtures e2e.
 *
 * El Chromium del sistema (v152) bloquea `page.goto()` a localhost por sus
 * Local Network Access checks (el iniciador CDP se considera "página pública").
 * La navegación iniciada desde el renderer con origen local (file:// o la propia
 * app) sí está permitida, así que `gotoApp` navega siempre vía `window.location`.
 */
import { test as base, type Page } from '@playwright/test';
import { writeFileSync, existsSync } from 'node:fs';

export const APP_URL = 'http://localhost:3100';
const START_FILE = '/tmp/forja-e2e-start.html';

function ensureStartFile() {
  if (!existsSync(START_FILE)) {
    writeFileSync(START_FILE, '<!doctype html><html><body>forja e2e</body></html>');
  }
}

/** Navega a una ruta de la app sorteando el bloqueo LNA de page.goto. */
export async function gotoApp(page: Page, path: string) {
  const url = `${APP_URL}${path}`;
  const current = page.url();
  if (!current.startsWith('http://localhost:') && !current.startsWith('http://127.0.0.1:')) {
    // Primer salto: file:// es origen local y puede navegar a localhost.
    ensureStartFile();
    await page.goto(`file://${START_FILE}`);
  }
  await page.evaluate((u) => {
    window.location.href = u;
  }, url);
  await page.waitForURL((u) => u.href === url || u.href === `${url}/`, { timeout: 20000 });
}

export const test = base;
export { expect } from '@playwright/test';

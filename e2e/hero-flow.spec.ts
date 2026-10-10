/**
 * E2E: flujo completo del héroe — onboarding, sesión, XP, informe e historia.
 *
 * Todo es UI-driven con navegación cliente de Next.js: el Chromium del sistema
 * no envía cookies en navegaciones de documento a localhost (LNA checks), pero
 * fetch y la navegación cliente sí funcionan con la sesión.
 *
 * Requiere el servidor dev en http://localhost:3100.
 */
import { test, expect, gotoApp } from './fixtures';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const heroName = () => `E2E_${randomUUID().slice(0, 8)}`;

/** Login por UI + wizard de onboarding completo. Termina en /historia. */
async function loginAsHero(page: Page, name: string) {
  await gotoApp(page, '/auth');
  await page.fill('#heroName', name);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  await page.fill('input[placeholder="Nombre de héroe"]', name);
  await page.click('button:has-text("Continuar →")');
  await page.click('button:has-text("Cazador")');
  await page.click('button:has-text("Continuar →")');
  await page.click('button:has-text("¡A la forja!")');
  await page.waitForURL(/\/historia/, { timeout: 20000 });
}

/** Clic en una pestaña de la navegación inferior (navegación cliente). */
async function navTab(page: Page, label: string) {
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByText(label).click();
}

test.describe('Flujo del héroe', () => {
  test('onboarding por UI crea el héroe y abre su primer capítulo', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);
    await expect(page.getByText('La chispa inicial').first()).toBeVisible({ timeout: 15000 });
    // La escena de reserva se identifica honestamente
    await expect(page.getByText('Historia original FORJA').first()).toBeVisible();
  });

  test('registrar sesión otorga XP calculada en servidor', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);

    await navTab(page, 'Entrenar');
    await expect(page).toHaveURL(/\/entrenar$/, { timeout: 15000 });
    await page.locator('a[href="/entrenar/nueva"]').first().click();
    await expect(page).toHaveURL(/\/entrenar\/nueva/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Nueva sesión/ })).toBeVisible();

    await page.fill('input[placeholder="p. ej. Press banca"]', 'Press banca');
    await page.locator('input[type="number"]').first().fill('4');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Revisar sesión →")');
    await page.click('button:has-text("Guardar sesión")');

    await expect(page.getByText('SESIÓN FORJADA')).toBeVisible({ timeout: 10000 });
    // 4 series × 8 + 4 bonus × 2 + 15 de sesión completada = 55 XP
    await expect(page.getByText('+55 XP')).toBeVisible();

    // El dashboard refleja al héroe con su XP
    await navTab(page, 'Inicio');
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Objetivo diario/ })).toBeVisible();
    // El objetivo diario (55 ≥ 30) se cumplió: +5 XP extra (puede estar colapsado)
    await expect(page.getByText('¡Objetivo diario cumplido!')).toBeAttached();
  });

  test('doble envío con la misma clave no duplica XP (idempotencia)', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);

    const key = randomUUID();
    const payload = {
      idempotencyKey: key,
      date: new Date().toISOString().slice(0, 10),
      status: 'completed',
      exercises: [{ name: 'Sentadilla', category: 'strength', sets: 2 }],
    };
    const r1 = await page.request.post('/api/training', { data: payload });
    const j1 = await r1.json();
    expect(j1.deduped).toBe(false);
    const r2 = await page.request.post('/api/training', { data: payload });
    const j2 = await r2.json();
    expect(j2.deduped).toBe(true);

    const c = await page.request.get('/api/character');
    const cj = await c.json();
    // 2 series × 8 + 15 de sesión completada + 5 de objetivo diario = 36 XP, una sola vez
    expect(cj.stats.totalXp).toBe(36);
  });

  test('el informe diario es honesto con datos incompletos', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);
    await navTab(page, 'Informe');
    await expect(page).toHaveURL(/\/informe/, { timeout: 15000 });
    // Con un héroe recién creado faltan datos: debe decirlo honestamente
    await expect(page.getByRole('heading', { name: 'Evaluación incompleta' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Faltan datos')).toBeVisible();
  });

  test('navegación móvil: 5 pestañas funcionales', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav).toBeVisible();
    for (const label of ['Inicio', 'Entrenar', 'Historia', 'Informe', 'Héroe']) {
      await expect(nav.getByText(label)).toBeVisible();
    }
    await navTab(page, 'Historia');
    await expect(page).toHaveURL(/\/historia/);
    await navTab(page, 'Informe');
    await expect(page).toHaveURL(/\/informe/);
  });

  test('privacidad: exportar datos descarga el JSON del héroe', async ({ page }) => {
    const name = heroName();
    await loginAsHero(page, name);
    // Cabecera → Ajustes → Privacidad (todo navegación cliente)
    await page.getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes/, { timeout: 15000 });
    await page.getByRole('link', { name: /Gestionar mis datos/ }).click();
    await expect(page).toHaveURL(/\/privacidad/, { timeout: 15000 });
    await expect(page.getByText('Tus datos, tus reglas')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Descargar mis datos")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/forja-export-.*\.json/);
  });
});

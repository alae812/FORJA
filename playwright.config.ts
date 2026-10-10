import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1280, height: 800 },
        // Chromium del sistema (la descarga de Playwright requiere aprobación)
        launchOptions: {
          executablePath: '/opt/meta-chromium/chrome',
          // Nota: --disable-features=LocalNetworkAccessChecks NO desactiva el
          // bloqueo en Chrome 152; la navegación usa el helper gotoApp (fixtures).
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],
  // El servidor de desarrollo debe estar corriendo en :3100 (npm run dev).
  // En CI, usar webServer. Aquí lo gestionamos externamente para reutilizarlo.
});

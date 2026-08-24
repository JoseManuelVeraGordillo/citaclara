// Cancelación desde el enlace de un recordatorio (US3, FR-006, FR-007,
// FR-008), de extremo a extremo. Las fixtures se crean vía
// `tests/e2e/fixtures/recordatorio-fixture.ts` (subproceso `tsx`), porque
// el runner de Playwright no soporta el cliente Prisma generado ni el alias
// "@/" (solo Vitest/Next lo hacen vía vite-tsconfig-paths).
//
// Requiere: `DATABASE_URL` apuntando a una base de datos migrada
// (`npx prisma migrate deploy`) antes de `npm run test:e2e`.

import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

function crearFixture(horasDesdeAhora: number): { citaId: string; token: string } {
  const salida = execFileSync(
    'npx',
    ['tsx', 'tests/e2e/fixtures/recordatorio-fixture.ts', 'crear', String(horasDesdeAhora)],
    { encoding: 'utf-8', env: { ...process.env }, shell: process.platform === 'win32' },
  );
  return JSON.parse(salida.trim().split('\n').pop()!);
}

test.afterAll(() => {
  execFileSync('npx', ['tsx', 'tests/e2e/fixtures/recordatorio-fixture.ts', 'limpiar'], {
    encoding: 'utf-8',
    env: { ...process.env },
    shell: process.platform === 'win32',
  });
});

test('cancela la cita desde el enlace y libera el hueco (US3-Escenario 1)', async ({ page }) => {
  const { token } = crearFixture(7 * 24); // en una semana

  await page.goto(`/cancelar-cita/${token}`);
  await expect(page.getByRole('heading', { name: 'Cancelar mi cita' })).toBeVisible();
  await page.getByRole('button', { name: 'Sí, cancelar mi cita' }).click();

  await expect(page.getByRole('status')).toContainText('se ha cancelado correctamente');
});

test('muestra el plazo agotado al visitar el enlace tras el inicio de la cita (US3-Escenario 2)', async ({
  page,
}) => {
  const { token } = crearFixture(-1); // hace una hora

  await page.goto(`/cancelar-cita/${token}`);

  // El anunciador de rutas de Next.js también expone role="alert"; se acota
  // al párrafo de texto para evitar la violación de modo estricto.
  await expect(page.locator('p[role="alert"]')).toContainText('no se puede cancelar');
  await expect(page.getByRole('button', { name: 'Sí, cancelar mi cita' })).toHaveCount(0);
});

test('muestra un enlace no válido para un token inexistente', async ({ page }) => {
  await page.goto('/cancelar-cita/token-que-no-existe');
  await expect(page.locator('p[role="alert"]')).toContainText('Este enlace no es válido');
});

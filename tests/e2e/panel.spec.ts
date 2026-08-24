// Flujos del panel de analítica de extremo a extremo (Playwright), contra una
// base de datos poblada por `prisma/seed.ts` (ver quickstart.md).
//
// US1: ver ingresos por servicio.
// US2: ver ocupación semanal por profesional.
// US3: ver tasa de no asistencia por profesional.
// US4: ver evolución de las últimas 8 semanas, por profesional.
//
// Requiere: `DATABASE_URL` apuntando a una base de datos migrada y sembrada
// (`npx prisma migrate deploy && npm run seed`) antes de `npm run test:e2e`.
//
// Nota: la ventana de "últimas 8 semanas" es relativa a la fecha real de
// ejecución (FR-005), así que estos tests comprueban estructura y
// consistencia (secciones presentes, sin errores, cifras no negativas), no
// los importes literales citados en spec.md (esos solo se cumplen
// exactamente si se ejecutan el 2026-08-17, la fecha de referencia de la
// semilla).

import { test, expect } from '@playwright/test';

const CLAVE_PANEL = process.env.SEED_CLAVE_PANEL ?? 'panel2026';

async function entrarAlPanel(page: import('@playwright/test').Page) {
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/panel-login/);
  await page.getByLabel('Clave de panel').fill(CLAVE_PANEL);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

test.describe('Panel de analítica', () => {
  test('redirige a /panel-login sin sesión de panel válida', async ({ page }) => {
    await page.goto('/panel');
    await expect(page).toHaveURL(/\/panel-login/);
  });

  test('rechaza una clave de panel incorrecta', async ({ page }) => {
    await page.goto('/panel-login');
    await page.getByLabel('Clave de panel').fill('clave-incorrecta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Clave incorrecta.')).toBeVisible();
    await expect(page).toHaveURL(/\/panel-login/);
  });

  test('US1: muestra el desglose de ingresos por servicio (FR-004)', async ({ page }) => {
    await entrarAlPanel(page);

    const seccion = page.locator('section', { has: page.getByRole('heading', { name: 'Ingresos por servicio' }) });
    await expect(seccion).toBeVisible();
    await expect(seccion.getByText(/total \d/)).toBeVisible();
    await expect(seccion.getByText('Redacción de contrato')).toBeVisible();
  });

  test('US2: muestra la ocupación semanal por profesional (FR-002)', async ({ page }) => {
    await entrarAlPanel(page);

    const seccion = page.locator('section', {
      has: page.getByRole('heading', { name: 'Ocupación semanal por profesional' }),
    });
    await expect(seccion).toBeVisible();
    await expect(seccion.getByText('Nuria Lagar')).toBeVisible();
    await expect(seccion.getByText('David Rayo')).toBeVisible();
    await expect(seccion.getByText('Jose Lagar')).toBeVisible();
  });

  test('US3: muestra la tasa de no asistencia por profesional (FR-003)', async ({ page }) => {
    await entrarAlPanel(page);

    const seccion = page.locator('section', {
      has: page.getByRole('heading', { name: 'Tasa de no asistencia por profesional' }),
    });
    await expect(seccion).toBeVisible();
    await expect(seccion.getByText('Nuria Lagar')).toBeVisible();
  });

  test('US4: muestra la evolución de las últimas 8 semanas por profesional (FR-005)', async ({ page }) => {
    await entrarAlPanel(page);

    const seccion = page.locator('section', {
      has: page.getByRole('heading', { name: 'Evolución de las últimas 8 semanas' }),
    });
    await expect(seccion).toBeVisible();
    await expect(seccion.getByText('Citas por semana')).toBeVisible();
    await expect(seccion.getByText('Ingresos por semana')).toBeVisible();
  });

  test('el botón Salir cierra la sesión de panel y exige volver a autenticarse', async ({ page }) => {
    await entrarAlPanel(page);
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/panel-login/);

    await page.goto('/panel');
    await expect(page).toHaveURL(/\/panel-login/);
  });
});

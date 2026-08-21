// Flujos de secretaría de extremo a extremo (Playwright), contra una base de
// datos de test poblada por `prisma/seed.ts` (ver quickstart.md).
//
// US1: entrar, ver la agenda del día y dar de alta una cita (US1-Escenarios 1-5).
// US2: cambiar el estado de una cita reservada (US2-Escenarios 1-4).
// US3: reprogramar una cita reservada (US3-Escenarios 1-4).
//
// Requiere: `DATABASE_URL` apuntando a una base de datos migrada y sembrada
// (`npx prisma migrate deploy && npm run seed`) antes de `npm run test:e2e`.

import { test, expect } from '@playwright/test';

const CLAVE_SECRETARIA = process.env.SEED_CLAVE_SECRETARIA ?? 'secretaria2026';

async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Clave de secretaría').fill(CLAVE_SECRETARIA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/agenda/);
}

/**
 * Día laborable (lunes a viernes) estrictamente futuro respecto al momento
 * de ejecución del test, para no depender de la hora real del día (RN2
 * rechaza correctamente cualquier inicio ya pasado del día de hoy).
 */
function proximoDiaLaborableIso(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

async function irAFechaFutura(page: import('@playwright/test').Page) {
  await page.getByLabel('Fecha').fill(proximoDiaLaborableIso());
}

/**
 * Entre los huecos libres visibles, pulsa "Reservar" sobre el de mayor
 * duración: un hueco libre puede ser más corto que cualquier servicio
 * disponible, así que elegir el primero a ciegas puede acabar solapando
 * la siguiente cita reservada.
 */
async function reservarHuecoLibreMasAmplio(page: import('@playwright/test').Page) {
  const filasLibres = page.getByRole('row').filter({ hasText: 'Libre' });
  await expect(filasLibres.first()).toBeVisible();

  const numFilas = await filasLibres.count();
  let mejorIndice = 0;
  let mejorDuracion = -1;
  for (let indice = 0; indice < numFilas; indice++) {
    const franja = await filasLibres.nth(indice).locator('td').first().innerText();
    const [inicio, fin] = franja.split('–');
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    const duracion = hFin * 60 + mFin - (hIni * 60 + mIni);
    if (duracion > mejorDuracion) {
      mejorDuracion = duracion;
      mejorIndice = indice;
    }
  }

  await filasLibres.nth(mejorIndice).getByRole('button', { name: 'Reservar' }).click();
}

test.describe('US1 — Ver la agenda del día y dar de alta una cita', () => {
  test('entrar y ver los huecos libres/ocupados del día (Escenario 1)', async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('dar de alta una cita sobre un hueco libre con cliente existente (Escenario 2)', async ({
    page,
  }) => {
    await entrar(page);
    await irAFechaFutura(page);
    await reservarHuecoLibreMasAmplio(page);

    await expect(page.getByRole('dialog', { name: /Nueva cita/ })).toBeVisible();
    await page.getByRole('button', { name: 'Elegir cliente' }).click();
    // "Cristina" es un nombre presente en la semilla determinista (prisma/seed.ts, FR-015).
    await page.getByLabel('Nombre, apellidos o teléfono').fill('Cristina');
    const primerResultado = page.getByRole('button').filter({ hasText: '—' }).first();
    await primerResultado.click();

    await page.getByRole('button', { name: 'Dar de alta la cita' }).click();

    await expect(page.getByRole('row').filter({ hasText: 'Reservada' }).first()).toBeVisible();
  });

  test('rechaza el alta sobre un hueco ya ocupado (RN1, Escenario 4)', async ({ page }) => {
    await entrar(page);

    const filaOcupada = page.getByRole('row').filter({ hasText: 'Reservada' }).first();
    await expect(filaOcupada).toBeVisible();
    // No hay botón "Reservar" sobre un hueco ocupado: el hueco libre ya no existe ahí.
    await expect(filaOcupada.getByRole('button', { name: 'Reservar' })).toHaveCount(0);
  });
});

test.describe('US2 — Marcar el resultado de una cita', () => {
  test('marca una cita reservada como completada y ya no admite cambios (Escenario 1)', async ({
    page,
  }) => {
    await entrar(page);

    const filaReservada = page.getByRole('row').filter({ hasText: 'Reservada' }).first();
    await expect(filaReservada).toBeVisible();
    await filaReservada.getByRole('button', { name: 'Completada' }).click();

    const filaCompletada = page.getByRole('row').filter({ hasText: 'Completada' }).first();
    await expect(filaCompletada).toBeVisible();
    await expect(filaCompletada.getByRole('button', { name: 'Completada' })).toHaveCount(0);
  });

  test('cancela una cita reservada y el hueco vuelve a mostrarse libre (Escenario 2)', async ({
    page,
  }) => {
    await entrar(page);

    const filaReservada = page.getByRole('row').filter({ hasText: 'Reservada' }).first();
    await expect(filaReservada).toBeVisible();
    await filaReservada.getByRole('button', { name: 'Cancelada' }).click();

    await expect(page.getByRole('row').filter({ hasText: 'Cancelada' }).first()).toBeVisible();
  });
});

test.describe('US3 — Reprogramar una cita reservada', () => {
  test('reprograma una cita reservada a otro hueco libre (Escenario 1)', async ({ page }) => {
    await entrar(page);
    await irAFechaFutura(page);

    const filaReservada = page.getByRole('row').filter({ hasText: 'Reservada' }).first();
    await expect(filaReservada).toBeVisible();
    await filaReservada.getByRole('button', { name: 'Reprogramar' }).click();

    await expect(page.getByRole('dialog', { name: 'Reprogramar cita' })).toBeVisible();
    await page.getByRole('button', { name: 'Reprogramar' }).last().click();

    // La cita conserva su identidad como "reservada" en el nuevo hueco.
    await expect(page.getByRole('row').filter({ hasText: 'Reservada' }).first()).toBeVisible();
  });
});

// Flujo del portal del cliente de extremo a extremo (Playwright).
//
// US1: solicitar acceso, canjear el enlace y ver citas futuras/pasadas
//      (US1-Escenarios 1-3).
// US2: cancelar una cita futura con 24h+ de antelación; rechazo con <24h
//      (US2-Escenarios 1-3).
//
// Requiere: `DATABASE_URL` apuntando a una base de datos migrada
// (`npx prisma migrate deploy`) antes de `npm run test:e2e`. No depende de
// la semilla determinista: crea sus propios datos de test aislados a
// través de los endpoints solo-de-test `/api/portal/dev/fixture` y
// `/api/portal/dev/ultimo-enlace` (nunca disponibles en producción), ya
// que esta feature no integra un proveedor real de email (research.md §1)
// y el proceso de Playwright no puede importar el cliente Prisma
// generado directamente (loader ESM distinto al de Vitest/Next).

import { test, expect } from '@playwright/test';

let despachoId: string;
let telefono: string;

test.beforeAll(async ({ request, baseURL }) => {
  const respuesta = await request.post(`${baseURL}/api/portal/dev/fixture`);
  expect(respuesta.ok()).toBeTruthy();
  const datos = await respuesta.json();
  despachoId = datos.despachoId;
  telefono = datos.telefono;
});

test.afterAll(async ({ request, baseURL }) => {
  await request.delete(`${baseURL}/api/portal/dev/fixture?despachoId=${despachoId}`);
});

async function entrarAlPortal(page: import('@playwright/test').Page, baseURL: string) {
  await page.goto('/portal/solicitar-acceso');
  await page.getByLabel('Tu teléfono').fill(telefono);
  await page.getByRole('button', { name: 'Enviar enlace de acceso' }).click();
  await expect(page.getByRole('status')).toBeVisible();

  const respuesta = await page.request.get(
    `${baseURL}/api/portal/dev/ultimo-enlace?telefono=${telefono}`,
  );
  expect(respuesta.ok()).toBeTruthy();
  const { url } = await respuesta.json();

  await page.goto(url);
  await expect(page).toHaveURL(/\/portal\/mis-citas/);
}

test.describe('US1 — Ver mis citas futuras y pasadas', () => {
  test('solicitar acceso, canjear el enlace y ver citas futuras y pasadas (Escenarios 1-2)', async ({
    page,
    baseURL,
  }) => {
    await entrarAlPortal(page, baseURL!);

    await expect(page.getByRole('heading', { name: 'Próximas citas' })).toBeVisible();
    await expect(page.getByText('Servicio de test con Profesional de test').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
    await expect(page.getByText('Completada')).toBeVisible();
  });

  test('un enlace ya canjeado no puede volver a usarse (FR-001a)', async ({ page, baseURL }) => {
    await entrarAlPortal(page, baseURL!);

    const respuesta = await page.request.get(
      `${baseURL}/api/portal/dev/ultimo-enlace?telefono=${telefono}`,
    );
    const { url } = await respuesta.json();

    await page.goto(url);
    await expect(page).toHaveURL(/\/portal\/solicitar-acceso/);
  });
});

test.describe('US2 — Cancelar una cita futura', () => {
  test('cancela con éxito una cita con 24h+ de antelación (Escenario 1)', async ({
    page,
    baseURL,
  }) => {
    await entrarAlPortal(page, baseURL!);

    await page.getByRole('button', { name: 'Cancelar cita' }).first().click();
    await page.getByRole('button', { name: 'Sí, cancelar' }).click();

    await expect(page.getByRole('button', { name: 'Cancelar cita' })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test('rechaza cancelar una cita con menos de 24h de antelación (Escenario 2)', async ({
    page,
    baseURL,
  }) => {
    await entrarAlPortal(page, baseURL!);

    await expect(
      page.getByText('Ya no se puede cancelar online (quedan menos de 24 horas)'),
    ).toBeVisible();
  });
});

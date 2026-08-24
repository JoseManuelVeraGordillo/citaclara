// Flujo del portal del cliente de extremo a extremo (Playwright).
//
// US1: solicitar acceso, canjear el enlace y ver citas futuras/pasadas
//      (US1-Escenarios 1-3).
// US2: cancelar una cita futura con 24h+ de antelación; rechazo con <24h
//      (US2-Escenarios 1-3).
//
// Requiere: `DATABASE_URL` apuntando a una base de datos migrada
// (`npx prisma migrate deploy`) antes de `npm run test:e2e`. No depende de
// la semilla determinista: crea sus propios datos de test aislados.
//
// El enlace de acceso se obtiene del endpoint solo-de-test
// `/api/portal/dev/ultimo-enlace` (nunca disponible en producción), ya que
// esta feature no integra un proveedor real de email (research.md §1).

import { test, expect } from '@playwright/test';

let prisma: typeof import('@/lib/db/prisma').prisma;

let despachoId: string;
let profesionalId: string;
let telefono: string;
let citaFuturaCancelableId: string;
let citaFueraDePlazoId: string;

test.beforeAll(async () => {
  ({ prisma } = await import('@/lib/db/prisma'));

  telefono = `6${Math.floor(10000000 + Math.random() * 89999999)}`;

  const despacho = await prisma.despacho.create({
    data: { nombre: 'Despacho de test e2e portal', claveSecretariaHash: 'x', clavePanelHash: 'x' },
  });
  despachoId = despacho.id;

  const profesional = await prisma.profesional.create({
    data: { despachoId, nombre: 'Profesional de test', especialidad: 'abogado' },
  });
  profesionalId = profesional.id;

  const servicio = await prisma.servicio.create({
    data: { despachoId, nombre: 'Servicio de test', duracionMinutos: 30, precioCentimos: 1000 },
  });

  const cliente = await prisma.cliente.create({
    data: {
      despachoId,
      nombre: 'Cliente',
      apellidos: 'Portal Test',
      telefono,
      email: `cliente.portal.test.${Date.now()}@ejemplo.es`,
    },
  });

  const ahora = Date.now();

  const citaFutura = await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora + 3 * 24 * 60 * 60 * 1000),
      fin: new Date(ahora + 3 * 24 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'reservada',
    },
  });
  citaFuturaCancelableId = citaFutura.id;

  const citaFueraDePlazo = await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora + 6 * 60 * 60 * 1000),
      fin: new Date(ahora + 6 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'reservada',
    },
  });
  citaFueraDePlazoId = citaFueraDePlazo.id;

  await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora - 7 * 24 * 60 * 60 * 1000),
      fin: new Date(ahora - 7 * 24 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'completada',
    },
  });
});

test.afterAll(async () => {
  await prisma.cita.deleteMany({ where: { profesionalId } });
  await prisma.cliente.deleteMany({ where: { despachoId } });
  await prisma.servicio.deleteMany({ where: { despachoId } });
  await prisma.profesional.deleteMany({ where: { despachoId } });
  await prisma.despacho.delete({ where: { id: despachoId } });
  await prisma.$disconnect();
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

    const cita = await prisma.cita.findUnique({ where: { id: citaFuturaCancelableId } });
    expect(cita?.estado).toBe('cancelada');
    expect(cita?.canceladaPor).toBe('cliente');
  });

  test('rechaza cancelar una cita con menos de 24h de antelación (Escenario 2)', async ({
    page,
    baseURL,
  }) => {
    await entrarAlPortal(page, baseURL!);

    await expect(
      page.getByText('Ya no se puede cancelar online (quedan menos de 24 horas)'),
    ).toBeVisible();

    const cita = await prisma.cita.findUnique({ where: { id: citaFueraDePlazoId } });
    expect(cita?.estado).toBe('reservada');
  });
});

// Cancelación desde el email de recordatorio (US3, FR-006, FR-007, FR-008):
// cancelación válida libera el hueco, plazo agotado tras el inicio de la
// cita, token inválido/inexistente, doble cancelación.
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), con las migraciones de
// `prisma/migrations/` ya aplicadas (`npx prisma migrate deploy`).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

let prisma: typeof import('@/lib/db/prisma').prisma;
let confirmarCancelacionRecordatorio: typeof import('@/lib/recordatorios/actions').confirmarCancelacionRecordatorio;
let generarTokenCancelacion: typeof import('@/lib/recordatorios/token').generarTokenCancelacion;

let despachoId: string;
let profesionalId: string;
let servicioId: string;
let clienteId: string;

async function crearCitaConRecordatorio(inicio: Date) {
  const servicio = await prisma.servicio.findUniqueOrThrow({ where: { id: servicioId } });
  const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);
  const cita = await prisma.cita.create({
    data: { profesionalId, servicioId, clienteId, inicio, fin, estado: 'reservada' },
  });
  const token = generarTokenCancelacion();
  await prisma.recordatorio.create({
    data: { citaId: cita.id, citaInicio: cita.inicio, estado: 'enviado', token },
  });
  return { citaId: cita.id, token };
}

describe('Cancelación desde el email de recordatorio (US3, FR-006, FR-007, FR-008)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db/prisma'));
    ({ confirmarCancelacionRecordatorio } = await import('@/lib/recordatorios/actions'));
    ({ generarTokenCancelacion } = await import('@/lib/recordatorios/token'));

    const despacho = await prisma.despacho.create({
      data: { nombre: 'Despacho de test', claveSecretariaHash: 'x', clavePanelHash: 'x' },
    });
    despachoId = despacho.id;

    const profesional = await prisma.profesional.create({
      data: { despachoId, nombre: 'Profesional de test', especialidad: 'abogado' },
    });
    profesionalId = profesional.id;

    const servicio = await prisma.servicio.create({
      data: { despachoId, nombre: 'Servicio de test', duracionMinutos: 30, precioCentimos: 1000 },
    });
    servicioId = servicio.id;

    const cliente = await prisma.cliente.create({
      data: {
        despachoId,
        nombre: 'Cliente',
        apellidos: 'Cancelacion',
        telefono: '600000003',
        email: 'cancelacion@test.es',
      },
    });
    clienteId = cliente.id;
  });

  afterAll(async () => {
    await prisma.recordatorio.deleteMany({ where: { cita: { profesionalId } } });
    await prisma.cita.deleteMany({ where: { profesionalId } });
    await prisma.cliente.deleteMany({ where: { despachoId } });
    await prisma.servicio.deleteMany({ where: { despachoId } });
    await prisma.profesional.deleteMany({ where: { despachoId } });
    await prisma.despacho.delete({ where: { id: despachoId } });
    await prisma.$disconnect();
  });

  it('cancela con éxito antes del inicio de la cita y libera el hueco (US3-Escenario 1)', async () => {
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { citaId, token } = await crearCitaConRecordatorio(enUnaSemana);

    const resultado = await confirmarCancelacionRecordatorio(token);

    expect(resultado.ok).toBe(true);
    expect(resultado.citaId).toBe(citaId);

    const cita = await prisma.cita.findUniqueOrThrow({ where: { id: citaId } });
    expect(cita.estado).toBe('cancelada');

    const recordatorio = await prisma.recordatorio.findUniqueOrThrow({ where: { token } });
    expect(recordatorio.canceladoEn).not.toBeNull();
  });

  it('rechaza la cancelación tras el inicio de la cita (US3-Escenario 2, FR-008)', async () => {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
    const { citaId, token } = await crearCitaConRecordatorio(haceUnaHora);

    const resultado = await confirmarCancelacionRecordatorio(token);

    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('plazo_agotado');

    const cita = await prisma.cita.findUniqueOrThrow({ where: { id: citaId } });
    expect(cita.estado).toBe('reservada');
  });

  it('rechaza un token inexistente sin revelar información de ninguna cita', async () => {
    const resultado = await confirmarCancelacionRecordatorio('token-que-no-existe');
    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe('token_invalido');
  });

  it('rechaza una segunda cancelación sobre un recordatorio ya cancelado', async () => {
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { token } = await crearCitaConRecordatorio(enUnaSemana);

    const primera = await confirmarCancelacionRecordatorio(token);
    expect(primera.ok).toBe(true);

    const segunda = await confirmarCancelacionRecordatorio(token);
    expect(segunda.ok).toBe(false);
    expect(segunda.codigo).toBe('ya_cancelada');
  });
});

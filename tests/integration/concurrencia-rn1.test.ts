// RN1 bajo condiciones de carrera (Principio III, gate obligatorio; FR-005, SC-002).
//
// Dispara dos `darDeAltaCita` en paralelo sobre exactamente el mismo hueco del
// mismo profesional y comprueba que la base de datos (restricción EXCLUDE)
// garantiza que como máximo una tiene éxito, sin depender de la comprobación
// de aplicación (que puede pasar en ambas ramas bajo la propia carrera).
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), con la migración de
// `prisma/migrations/` ya aplicada (`npx prisma migrate deploy`).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

let prisma: typeof import('@/lib/db/prisma').prisma;
let darDeAltaCita: typeof import('@/lib/agenda/actions').darDeAltaCita;
let horaMadridAUtc: typeof import('@/lib/tiempo/zona-horaria').horaMadridAUtc;

let despachoId: string;
let profesionalId: string;
let servicioId: string;
let clienteId: string;

/** YYYY-MM-DD del próximo lunes dentro de dos semanas (siempre futuro y laborable). */
function proximoLunesIso(): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + 14);
  while (fecha.getUTCDay() !== 1) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
  }
  return fecha.toISOString().slice(0, 10);
}

describe('RN1 bajo condiciones de carrera (Principio III, FR-005, SC-002)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db/prisma'));
    ({ darDeAltaCita } = await import('@/lib/agenda/actions'));
    ({ horaMadridAUtc } = await import('@/lib/tiempo/zona-horaria'));

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
        apellidos: 'De Test',
        telefono: '600000000',
        email: 'test@test.es',
      },
    });
    clienteId = cliente.id;
  });

  afterAll(async () => {
    await prisma.cita.deleteMany({ where: { profesionalId } });
    await prisma.cliente.deleteMany({ where: { despachoId } });
    await prisma.servicio.deleteMany({ where: { despachoId } });
    await prisma.profesional.deleteMany({ where: { despachoId } });
    await prisma.despacho.delete({ where: { id: despachoId } });
    await prisma.$disconnect();
  });

  it('registra como máximo una de dos altas simultáneas sobre el mismo hueco', async () => {
    // Un lunes a las 10:00 Europe/Madrid dentro de dos semanas: siempre futuro y laborable.
    const inicio = horaMadridAUtc(proximoLunesIso(), 10, 0).toISOString();

    const entrada = { profesionalId, servicioId, clienteId, inicio };

    const [resultadoA, resultadoB] = await Promise.all([
      darDeAltaCita(entrada),
      darDeAltaCita(entrada),
    ]);

    const resultados = [resultadoA, resultadoB];
    const exitos = resultados.filter((r) => r.ok);
    const fallos = resultados.filter((r) => !r.ok);

    expect(exitos).toHaveLength(1);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].codigo).toBe('solape');

    const citasCreadas = await prisma.cita.count({ where: { profesionalId } });
    expect(citasCreadas).toBe(1);
  });
});

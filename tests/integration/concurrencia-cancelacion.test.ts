// Cancelación como máximo una vez bajo condiciones de carrera (FR-008).
//
// Dispara en paralelo una cancelación atómica con origen 'cliente' y otra
// con origen 'secretaria' sobre la misma cita 'reservada', y comprueba que
// la base de datos (UPDATE condicional, no bloqueos aplicativos) garantiza
// que como máximo una tiene éxito.
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), con la migración de
// `prisma/migrations/` ya aplicada (`npx prisma migrate deploy`).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

let prisma: typeof import('@/lib/db/prisma').prisma;
let cancelarCitaAtomica: typeof import('@/lib/agenda/reglas').cancelarCitaAtomica;

let despachoId: string;
let citaId: string;

describe('Cancelación atómica bajo condiciones de carrera (FR-008)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db/prisma'));
    ({ cancelarCitaAtomica } = await import('@/lib/agenda/reglas'));

    const despacho = await prisma.despacho.create({
      data: { nombre: 'Despacho de test', claveSecretariaHash: 'x', clavePanelHash: 'x' },
    });
    despachoId = despacho.id;

    const profesional = await prisma.profesional.create({
      data: { despachoId, nombre: 'Profesional de test', especialidad: 'abogado' },
    });

    const servicio = await prisma.servicio.create({
      data: { despachoId, nombre: 'Servicio de test', duracionMinutos: 30, precioCentimos: 1000 },
    });

    const cliente = await prisma.cliente.create({
      data: {
        despachoId,
        nombre: 'Cliente',
        apellidos: 'De Test',
        telefono: '600000001',
        email: 'test-cancelacion@test.es',
      },
    });

    const inicio = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const cita = await prisma.cita.create({
      data: {
        profesionalId: profesional.id,
        servicioId: servicio.id,
        clienteId: cliente.id,
        inicio,
        fin: new Date(inicio.getTime() + 30 * 60000),
        estado: 'reservada',
      },
    });
    citaId = cita.id;
  });

  afterAll(async () => {
    await prisma.cita.deleteMany({ where: { id: citaId } });
    await prisma.cliente.deleteMany({ where: { despachoId } });
    await prisma.servicio.deleteMany({ where: { despachoId } });
    await prisma.profesional.deleteMany({ where: { despachoId } });
    await prisma.despacho.delete({ where: { id: despachoId } });
    await prisma.$disconnect();
  });

  it('registra como máximo una de dos cancelaciones simultáneas de la misma cita', async () => {
    const [resultadoCliente, resultadoSecretaria] = await Promise.all([
      cancelarCitaAtomica(citaId, 'cliente'),
      cancelarCitaAtomica(citaId, 'secretaria'),
    ]);

    const exitos = [resultadoCliente, resultadoSecretaria].filter(Boolean);
    expect(exitos).toHaveLength(1);

    const citaFinal = await prisma.cita.findUniqueOrThrow({ where: { id: citaId } });
    expect(citaFinal.estado).toBe('cancelada');
    expect(['cliente', 'secretaria']).toContain(citaFinal.canceladaPor);
  });
});

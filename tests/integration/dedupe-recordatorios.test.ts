// Sin recordatorios duplicados (US2, FR-004, SC-002): ejecutar el proceso
// dos veces seguidas sobre la misma agenda no debe producir un segundo
// recordatorio ni un segundo .eml para la misma cita.
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), con las migraciones de
// `prisma/migrations/` ya aplicadas (`npx prisma migrate deploy`).

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

let prisma: typeof import('@/lib/db/prisma').prisma;

let despachoId: string;
let profesionalId: string;
let servicioId: string;
let clienteId: string;
let citaId: string;

const DIRECTORIO_SALIDA = join(process.cwd(), 'datos', 'salida-correo');
const AHORA = '2026-08-15T09:00:00.000Z';

function ejecutarProceso(): string {
  return execFileSync('npx', ['tsx', 'scripts/enviar-recordatorios.ts', `--ahora=${AHORA}`], {
    encoding: 'utf-8',
    env: { ...process.env },
    shell: process.platform === 'win32',
  });
}

function archivosEmlDeLaCita(): string[] {
  if (!existsSync(DIRECTORIO_SALIDA)) return [];
  return readdirSync(DIRECTORIO_SALIDA).filter((f) => f.includes(citaId));
}

describe('Sin recordatorios duplicados (US2, FR-004, SC-002)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db/prisma'));

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
        apellidos: 'Dedupe',
        telefono: '600000001',
        email: 'dedupe@test.es',
      },
    });
    clienteId = cliente.id;

    // 30h después de AHORA: dentro de la ventana 24-48h.
    const inicio = new Date(new Date(AHORA).getTime() + 30 * 60 * 60 * 1000);
    const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);
    const cita = await prisma.cita.create({
      data: { profesionalId, servicioId, clienteId, inicio, fin, estado: 'reservada' },
    });
    citaId = cita.id;
  });

  afterAll(async () => {
    for (const archivo of archivosEmlDeLaCita()) {
      rmSync(join(DIRECTORIO_SALIDA, archivo), { force: true });
    }
    await prisma.recordatorio.deleteMany({ where: { citaId } });
    await prisma.cita.deleteMany({ where: { profesionalId } });
    await prisma.cliente.deleteMany({ where: { despachoId } });
    await prisma.servicio.deleteMany({ where: { despachoId } });
    await prisma.profesional.deleteMany({ where: { despachoId } });
    await prisma.despacho.delete({ where: { id: despachoId } });
    await prisma.$disconnect();
  });

  it('la primera ejecución genera un único recordatorio y un único .eml', () => {
    ejecutarProceso();
  }, 60_000);

  it('no genera duplicados si se repite la ejecución con el mismo --ahora', async () => {
    ejecutarProceso();

    const recordatorios = await prisma.recordatorio.findMany({ where: { citaId } });
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0].estado).toBe('enviado');

    expect(archivosEmlDeLaCita()).toHaveLength(1);
  }, 60_000);
});

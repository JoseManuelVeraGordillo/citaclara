// Reenvío tras reprogramación (US2, FR-009): si una cita ya notificada se
// reprograma a una nueva fecha que vuelve a entrar en la ventana 24-48h, el
// proceso debe generar un recordatorio nuevo sin borrar el histórico.
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
const AHORA = '2026-08-16T09:00:00.000Z';

function ejecutarProceso(): void {
  execFileSync('npx', ['tsx', 'scripts/enviar-recordatorios.ts', `--ahora=${AHORA}`], {
    encoding: 'utf-8',
    env: { ...process.env },
    shell: process.platform === 'win32',
  });
}

function archivosEmlDeLaCita(): string[] {
  if (!existsSync(DIRECTORIO_SALIDA)) return [];
  return readdirSync(DIRECTORIO_SALIDA).filter((f) => f.includes(citaId));
}

describe('Reenvío de recordatorio tras reprogramación dentro de ventana (US2, FR-009)', () => {
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
        apellidos: 'Reprogramado',
        telefono: '600000002',
        email: 'reprogramado@test.es',
      },
    });
    clienteId = cliente.id;

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

  it('genera un recordatorio nuevo para la nueva fecha, sin borrar el histórico del anterior', async () => {
    ejecutarProceso();
    const primerLote = await prisma.recordatorio.findMany({ where: { citaId } });
    expect(primerLote).toHaveLength(1);
    const inicioOriginal = primerLote[0].citaInicio;

    // Reprograma la cita a otra fecha que también cae dentro de la ventana
    // 24-48h respecto al mismo --ahora (misma cita, nuevo inicio).
    const servicio = await prisma.servicio.findUniqueOrThrow({ where: { id: servicioId } });
    const nuevoInicio = new Date(new Date(AHORA).getTime() + 40 * 60 * 60 * 1000);
    const nuevoFin = new Date(nuevoInicio.getTime() + servicio.duracionMinutos * 60000);
    await prisma.cita.update({
      where: { id: citaId },
      data: { inicio: nuevoInicio, fin: nuevoFin },
    });

    ejecutarProceso();

    const segundoLote = await prisma.recordatorio.findMany({
      where: { citaId },
      orderBy: { citaInicio: 'asc' },
    });
    expect(segundoLote).toHaveLength(2);
    expect(segundoLote[0].citaInicio).toEqual(inicioOriginal);
    expect(segundoLote[1].citaInicio.getTime()).toBe(nuevoInicio.getTime());
    expect(archivosEmlDeLaCita()).toHaveLength(2);
  }, 60_000);
});

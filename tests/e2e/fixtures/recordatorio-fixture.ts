// Script auxiliar (invocado vía `npx tsx`, no importado desde Playwright:
// el runner de Playwright no soporta el cliente Prisma generado ni el alias
// "@/", solo Vitest/Next lo hacen vía vite-tsconfig-paths). Crea o limpia la
// cita + Recordatorio de prueba para tests/e2e/cancelar-cita.spec.ts.
//
// Uso:
//   npx tsx tests/e2e/fixtures/recordatorio-fixture.ts crear <horasDesdeAhora>
//   npx tsx tests/e2e/fixtures/recordatorio-fixture.ts limpiar

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../src/generated/prisma/client';
import { generarTokenCancelacion } from '../../../src/lib/recordatorios/token';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NOMBRE_DESPACHO_E2E = 'Despacho e2e cancelacion';

async function crear(horas: number) {
  const despacho = await prisma.despacho.create({
    data: { nombre: NOMBRE_DESPACHO_E2E, claveSecretariaHash: 'x', clavePanelHash: 'x' },
  });
  const profesional = await prisma.profesional.create({
    data: { despachoId: despacho.id, nombre: 'Profesional e2e', especialidad: 'abogado' },
  });
  const servicio = await prisma.servicio.create({
    data: {
      despachoId: despacho.id,
      nombre: 'Servicio e2e',
      duracionMinutos: 30,
      precioCentimos: 1000,
    },
  });
  const cliente = await prisma.cliente.create({
    data: {
      despachoId: despacho.id,
      nombre: 'Cliente',
      apellidos: 'E2E',
      telefono: '600000099',
      email: 'e2e@test.es',
    },
  });

  const inicio = new Date(Date.now() + horas * 60 * 60 * 1000);
  const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);
  const cita = await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio,
      fin,
      estado: 'reservada',
    },
  });
  const token = generarTokenCancelacion();
  await prisma.recordatorio.create({
    data: { citaId: cita.id, citaInicio: cita.inicio, estado: 'enviado', token },
  });

  console.log(JSON.stringify({ despachoId: despacho.id, citaId: cita.id, token }));
}

async function limpiar() {
  const despachos = await prisma.despacho.findMany({ where: { nombre: NOMBRE_DESPACHO_E2E } });
  for (const despacho of despachos) {
    const profesionales = await prisma.profesional.findMany({
      where: { despachoId: despacho.id },
    });
    for (const profesional of profesionales) {
      await prisma.recordatorio.deleteMany({ where: { cita: { profesionalId: profesional.id } } });
      await prisma.cita.deleteMany({ where: { profesionalId: profesional.id } });
    }
    await prisma.cliente.deleteMany({ where: { despachoId: despacho.id } });
    await prisma.servicio.deleteMany({ where: { despachoId: despacho.id } });
    await prisma.profesional.deleteMany({ where: { despachoId: despacho.id } });
    await prisma.despacho.delete({ where: { id: despacho.id } });
  }
}

async function main() {
  const [, , comando, arg] = process.argv;
  if (comando === 'crear') {
    await crear(Number(arg));
  } else if (comando === 'limpiar') {
    await limpiar();
  } else {
    throw new Error(`Comando desconocido: ${comando}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

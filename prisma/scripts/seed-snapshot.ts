// Snapshot determinista de los datos sembrados, para verificar reproducibilidad
// de la semilla (Principio V, FR-015, SC-004). Imprime JSON estable por stdout:
//
//   npm run seed:snapshot > snapshot1.json
//   (regenerar la semilla)
//   npm run seed:snapshot > snapshot2.json
//   diff snapshot1.json snapshot2.json   # MUST no mostrar diferencias

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', quiet: true });
loadEnv({ path: '.env', quiet: true });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [despachos, profesionales, servicios, clientes, citas] = await Promise.all([
    prisma.despacho.findMany({ orderBy: { nombre: 'asc' }, select: { nombre: true } }),
    prisma.profesional.findMany({
      orderBy: { nombre: 'asc' },
      select: { nombre: true, especialidad: true, activo: true },
    }),
    prisma.servicio.findMany({
      orderBy: { nombre: 'asc' },
      select: { nombre: true, duracionMinutos: true, precioCentimos: true, activo: true },
    }),
    prisma.cliente.findMany({
      orderBy: [{ nombre: 'asc' }, { apellidos: 'asc' }, { telefono: 'asc' }],
      select: { nombre: true, apellidos: true, telefono: true, email: true },
    }),
    prisma.cita.findMany({
      orderBy: [
        { inicio: 'asc' },
        { profesional: { nombre: 'asc' } },
        { servicio: { nombre: 'asc' } },
        { cliente: { nombre: 'asc' } },
        { cliente: { apellidos: 'asc' } },
        { cliente: { telefono: 'asc' } },
      ],
      select: {
        inicio: true,
        fin: true,
        estado: true,
        profesional: { select: { nombre: true } },
        servicio: { select: { nombre: true } },
        cliente: { select: { nombre: true, apellidos: true } },
      },
    }),
  ]);

  const snapshot = {
    despachos,
    profesionales,
    servicios,
    clientes,
    citas: citas.map((c) => ({
      inicio: c.inicio.toISOString(),
      fin: c.fin.toISOString(),
      estado: c.estado,
      profesional: c.profesional.nombre,
      servicio: c.servicio.nombre,
      cliente: `${c.cliente.nombre} ${c.cliente.apellidos}`,
    })),
    resumen: {
      totalClientes: clientes.length,
      totalCitas: citas.length,
      noAsistidas: citas.filter((c) => c.estado === 'no_asistida').length,
      canceladas: citas.filter((c) => c.estado === 'cancelada').length,
    },
  };

  process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

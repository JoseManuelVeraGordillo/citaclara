// Proceso diario de recordatorios de cita por email (feature
// 002-recordatorios-cita, FR-001 a FR-005, FR-009, FR-010, FR-012).
//
// Uso: npm run recordatorios:enviar [-- --ahora=2026-08-15T09:00:00Z]
//
// Sin `--ahora`, usa la hora real del sistema. Con `--ahora`, permite
// ejecuciones reproducibles contra datos deterministas (Principio V,
// research.md §2) — ver quickstart.md.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { seleccionarCitasParaRecordar } from '../src/lib/recordatorios/seleccion';
import { generarTokenCancelacion } from '../src/lib/recordatorios/token';
import { construirContenidoEml, escribirEml, nombreArchivoEml } from '../src/lib/correo/eml';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DIRECTORIO_SALIDA = join(process.cwd(), 'datos', 'salida-correo');

function leerAhoraDeArgv(): Date {
  const arg = process.argv.find((a) => a.startsWith('--ahora='));
  if (!arg) return new Date();
  const valor = arg.slice('--ahora='.length);
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`--ahora no es una fecha ISO 8601 válida: "${valor}"`);
  }
  return fecha;
}

/** P2002 (restricción única `citaId_citaInicio`): otra ejecución ya generó este recordatorio (FR-004). */
function esViolacionDeUnicidad(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function main() {
  const ahora = leerAhoraDeArgv();

  const citas = await prisma.cita.findMany({
    where: { estado: 'reservada' },
    include: {
      cliente: true,
      profesional: true,
      servicio: true,
      recordatorios: { select: { citaInicio: true } },
    },
  });

  const seleccion = seleccionarCitasParaRecordar(
    ahora,
    citas.map((c) => ({
      id: c.id,
      inicio: c.inicio.toISOString(),
      estado: c.estado,
      clienteEmail: c.cliente.email,
      recordatoriosExistentes: c.recordatorios.map((r) => ({
        citaInicio: r.citaInicio.toISOString(),
      })),
    })),
  );

  const porId = new Map(citas.map((c) => [c.id, c]));
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  let enviados = 0;
  let omitidos = 0;
  let yaExistentes = 0;

  for (const item of seleccion.aGenerar) {
    const cita = porId.get(item.citaId);
    if (!cita) continue;

    try {
      if (item.conEmail) {
        const token = generarTokenCancelacion();
        await prisma.recordatorio.create({
          data: {
            citaId: cita.id,
            citaInicio: cita.inicio,
            estado: 'enviado',
            token,
          },
        });

        const contenido = construirContenidoEml({
          clienteEmail: cita.cliente.email,
          clienteNombre: `${cita.cliente.nombre} ${cita.cliente.apellidos}`,
          profesionalNombre: cita.profesional.nombre,
          area: cita.servicio.nombre,
          inicio: cita.inicio,
          enlaceCancelacion: `${appUrl}/cancelar-cita/${token}`,
        });
        escribirEml(
          join(DIRECTORIO_SALIDA, nombreArchivoEml(cita.id, cita.inicio)),
          contenido,
        );
        enviados++;
      } else {
        await prisma.recordatorio.create({
          data: { citaId: cita.id, citaInicio: cita.inicio, estado: 'omitido_sin_email' },
        });
        omitidos++;
      }
    } catch (error) {
      if (esViolacionDeUnicidad(error)) {
        // Otra ejecución concurrente ya generó este recordatorio; no es un
        // fallo, es la garantía de deduplicación (FR-004) actuando.
        yaExistentes++;
        continue;
      }
      throw error;
    }
  }

  console.log(
    `Recordatorios: ${enviados} enviados, ${omitidos} omitidos por falta de email, ` +
      `${yaExistentes} ya existentes (evitados por deduplicación).`,
  );
}

main()
  .catch((error) => {
    console.error('Error ejecutando el proceso de recordatorios:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

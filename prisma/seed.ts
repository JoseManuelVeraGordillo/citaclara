// Semilla determinista de CitaClara (FR-015, Principio V).
//
// Determinismo: el generador pseudoaleatorio usa una semilla fija
// (`SEMILLA_PRNG`) y toda fecha relativa se calcula a partir de
// `FECHA_REFERENCIA` (fija en el código, nunca `Date.now()`), de forma que
// dos ejecuciones sucesivas producen exactamente los mismos registros,
// verificable con `npm run seed:snapshot` (ver quickstart.md).

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { hashSync } from 'bcryptjs';
import seedrandom from 'seedrandom';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { tramosLaboralesDelDia } from '../src/lib/agenda/horario';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEMILLA_PRNG = 'citaclara-001-agenda-citas-v1';
/** Fecha de referencia fija ("hoy" para la semilla): lunes 17 de agosto de 2026. */
const FECHA_REFERENCIA = '2026-08-17';
const SEMANAS_HISTORIA = 8;
const SEMANAS_FUTURAS = 2;
const NUM_CLIENTES = 40;
const PROB_OCUPACION_TRAMO = 0.55;

const rng = seedrandom(SEMILLA_PRNG);

function aleatorio(): number {
  return rng();
}

function elegir<T>(lista: readonly T[]): T {
  return lista[Math.floor(aleatorio() * lista.length)];
}

function enteroEntre(min: number, max: number): number {
  return min + Math.floor(aleatorio() * (max - min + 1));
}

const NOMBRES = [
  'Laura',
  'Marcos',
  'Elena',
  'Javier',
  'Sofía',
  'Diego',
  'Paula',
  'Rubén',
  'Carmen',
  'Álvaro',
  'Cristina',
  'Hugo',
  'Nerea',
  'Pablo',
  'Beatriz',
  'Adrián',
  'Lucía',
  'Sergio',
  'Irene',
  'Mario',
  'Marta',
  'David',
  'Alba',
  'Iván',
  'Sara',
  'Raúl',
  'Noelia',
  'Óscar',
  'Patricia',
  'Fernando',
  'Ana',
  'Jorge',
  'Rocío',
  'Víctor',
  'Silvia',
  'Gonzalo',
  'Yolanda',
  'Manuel',
  'Eva',
  'Ignacio',
] as const;

const APELLIDOS = [
  'García',
  'Fernández',
  'López',
  'Martínez',
  'Sánchez',
  'Pérez',
  'Gómez',
  'Ruiz',
  'Díaz',
  'Moreno',
  'Álvarez',
  'Romero',
  'Navarro',
  'Torres',
  'Domínguez',
  'Vázquez',
  'Ramos',
  'Gil',
  'Serrano',
  'Blanco',
] as const;

function generarClientes(despachoId: string) {
  const clientes = [];
  for (let i = 0; i < NUM_CLIENTES; i++) {
    const nombre = elegir(NOMBRES);
    const apellidos = `${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
    const telefono = `6${enteroEntre(10000000, 99999999)}`;
    const email = `${nombre.toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}${i}@ejemplo.es`;
    clientes.push({ despachoId, nombre, apellidos, telefono, email });
  }
  return clientes;
}

function sumarDias(fechaIso: string, dias: number): string {
  const [a, m, d] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

async function main() {
  console.log(`Sembrando CitaClara (semilla="${SEMILLA_PRNG}", referencia=${FECHA_REFERENCIA})…`);

  const claveSecretaria = process.env.SEED_CLAVE_SECRETARIA ?? 'secretaria2026';

  const despacho = await prisma.despacho.create({
    data: {
      nombre: 'Bufete Virtual Demo',
      claveSecretariaHash: hashSync(claveSecretaria, 10),
      clavePanelHash: hashSync('panel2026', 10),
    },
  });

  const profesionales = await Promise.all(
    [
      { nombre: 'Elena Martínez', especialidad: 'abogada' },
      { nombre: 'Carlos Ruiz', especialidad: 'abogado' },
      { nombre: 'Ana García', especialidad: 'administración' },
    ].map((p) => prisma.profesional.create({ data: { ...p, despachoId: despacho.id } })),
  );

  const servicios = await Promise.all(
    [
      { nombre: 'Primera consulta', duracionMinutos: 30, precioCentimos: 6000 },
      { nombre: 'Consulta de seguimiento', duracionMinutos: 30, precioCentimos: 4500 },
      { nombre: 'Redacción de contrato', duracionMinutos: 60, precioCentimos: 12000 },
      { nombre: 'Gestión administrativa', duracionMinutos: 45, precioCentimos: 5000 },
    ].map((s) => prisma.servicio.create({ data: { ...s, despachoId: despacho.id } })),
  );

  const clientesCreados = [];
  for (const datos of generarClientes(despacho.id)) {
    clientesCreados.push(await prisma.cliente.create({ data: datos }));
  }

  const fechaInicioHistoria = sumarDias(FECHA_REFERENCIA, -SEMANAS_HISTORIA * 7);
  const fechaFinFutura = sumarDias(FECHA_REFERENCIA, SEMANAS_FUTURAS * 7);

  let totalCitas = 0;
  let totalNoAsistidas = 0;
  let totalCanceladas = 0;

  for (const profesional of profesionales) {
    let fechaIso = fechaInicioHistoria;
    while (fechaIso <= fechaFinFutura) {
      const tramos = tramosLaboralesDelDia(fechaIso);
      const esFuturo = fechaIso > FECHA_REFERENCIA;

      for (const tramo of tramos) {
        let cursor = tramo.inicio;
        while (cursor < tramo.fin) {
          const restanteMin = (tramo.fin.getTime() - cursor.getTime()) / 60000;
          const servicio = elegir(servicios);

          if (aleatorio() < PROB_OCUPACION_TRAMO && servicio.duracionMinutos <= restanteMin) {
            const inicio = new Date(cursor);
            const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);
            const cliente = elegir(clientesCreados);

            let estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida' = 'reservada';
            if (!esFuturo) {
              const dado = aleatorio();
              if (dado < 0.1) {
                estado = 'no_asistida';
                totalNoAsistidas++;
              } else if (dado < 0.18) {
                estado = 'cancelada';
                totalCanceladas++;
              } else {
                estado = 'completada';
              }
            }

            await prisma.cita.create({
              data: {
                profesionalId: profesional.id,
                servicioId: servicio.id,
                clienteId: cliente.id,
                inicio,
                fin,
                estado,
              },
            });
            totalCitas++;
            cursor = fin;
          } else {
            cursor = new Date(cursor.getTime() + 15 * 60000);
          }
        }
      }

      fechaIso = sumarDias(fechaIso, 1);
    }
  }

  console.log(
    `Listo: 1 despacho, ${profesionales.length} profesionales, ${servicios.length} servicios, ` +
      `${clientesCreados.length} clientes, ${totalCitas} citas ` +
      `(${totalNoAsistidas} no_asistida, ${totalCanceladas} cancelada).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

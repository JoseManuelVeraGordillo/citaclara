// Panel de solo lectura (SC-003, FR-006, gate obligatorio).
//
// Carga las 4 secciones del panel (las mismas funciones que invoca
// src/app/panel/page.tsx) contra una base de datos de test real y comprueba
// que el recuento de filas de Cita, Cliente, Profesional, Servicio y
// Despacho es idéntico antes y después: el panel no escribe NADA.
//
// Requiere una base de datos PostgreSQL de test accesible en
// `DATABASE_URL_TEST` (o `DATABASE_URL`), migrada y sembrada
// (`npx prisma migrate deploy && npm run seed`).

import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

let prisma: typeof import('@/lib/db/prisma').prisma;
let obtenerVentana8SemanasCompletas: typeof import('@/lib/analitica/semanas').obtenerVentana8SemanasCompletas;
let obtenerIngresosPorServicio: typeof import('@/lib/analitica/metricas').obtenerIngresosPorServicio;
let obtenerOcupacionSemanal: typeof import('@/lib/analitica/metricas').obtenerOcupacionSemanal;
let obtenerTasaNoAsistencia: typeof import('@/lib/analitica/metricas').obtenerTasaNoAsistencia;
let obtenerEvolucionSemanal: typeof import('@/lib/analitica/metricas').obtenerEvolucionSemanal;

async function recuentoDeFilas() {
  const [despachos, profesionales, servicios, clientes, citas] = await Promise.all([
    prisma.despacho.count(),
    prisma.profesional.count(),
    prisma.servicio.count(),
    prisma.cliente.count(),
    prisma.cita.count(),
  ]);
  return { despachos, profesionales, servicios, clientes, citas };
}

describe('Panel de analítica — solo lectura (SC-003, FR-006)', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db/prisma'));
    ({ obtenerVentana8SemanasCompletas } = await import('@/lib/analitica/semanas'));
    ({
      obtenerIngresosPorServicio,
      obtenerOcupacionSemanal,
      obtenerTasaNoAsistencia,
      obtenerEvolucionSemanal,
    } = await import('@/lib/analitica/metricas'));
  });

  it('cargar las 4 secciones del panel no cambia ninguna fila de Cita/Cliente/Profesional/Servicio/Despacho', async () => {
    const despacho = await prisma.despacho.findFirstOrThrow();
    const ventana = obtenerVentana8SemanasCompletas(new Date());

    const antes = await recuentoDeFilas();

    await Promise.all([
      obtenerIngresosPorServicio(despacho.id, ventana),
      obtenerOcupacionSemanal(despacho.id, ventana),
      obtenerTasaNoAsistencia(despacho.id),
      obtenerEvolucionSemanal(despacho.id, ventana),
    ]);

    const despues = await recuentoDeFilas();

    expect(despues).toEqual(antes);
  });
});

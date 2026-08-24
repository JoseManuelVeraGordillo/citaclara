import { prisma } from '@/lib/db/prisma';
import { tramosLaboralesDelDia } from '@/lib/agenda/horario';
import { horaMadridAUtc } from '@/lib/tiempo/zona-horaria';
import { semanaDeFecha, sumarDiasIso, type VentanaOchoSemanas } from '@/lib/analitica/semanas';

export type EstadoCita = 'reservada' | 'completada' | 'cancelada' | 'no_asistida';

/** Forma mínima de una cita necesaria para calcular cualquier métrica del panel (data-model.md). */
export interface CitaParaAnalitica {
  profesionalId: string;
  servicioId: string;
  inicio: Date;
  fin: Date;
  estado: EstadoCita;
  precioCentimos: number;
}

export interface ServicioParaAnalitica {
  id: string;
  nombre: string;
}

export interface ProfesionalParaAnalitica {
  id: string;
  nombre: string;
  activo: boolean;
}

// ---------------------------------------------------------------------------
// US1 — Ingresos por servicio (FR-004)
// ---------------------------------------------------------------------------

export interface IngresoPorServicio {
  servicioId: string;
  nombreServicio: string;
  totalCentimos: number;
}

/** Función pura: suma `precioCentimos` de citas `completada` por servicio. Los servicios sin citas completadas aparecen con 0 (FR-009). */
export function calcularIngresosPorServicio(
  servicios: ServicioParaAnalitica[],
  citas: CitaParaAnalitica[],
): IngresoPorServicio[] {
  const totales = new Map<string, number>();
  for (const servicio of servicios) totales.set(servicio.id, 0);

  for (const cita of citas) {
    if (cita.estado !== 'completada') continue;
    if (!totales.has(cita.servicioId)) continue;
    totales.set(cita.servicioId, (totales.get(cita.servicioId) ?? 0) + cita.precioCentimos);
  }

  return servicios.map((servicio) => ({
    servicioId: servicio.id,
    nombreServicio: servicio.nombre,
    totalCentimos: totales.get(servicio.id) ?? 0,
  }));
}

/** Lectura: ingresos por servicio dentro de la ventana de 8 semanas completas (FR-004). */
export async function obtenerIngresosPorServicio(
  despachoId: string,
  ventana: VentanaOchoSemanas,
): Promise<IngresoPorServicio[]> {
  const servicios = await prisma.servicio.findMany({
    where: { despachoId },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true },
  });

  const citas = await obtenerCitasEnVentana(despachoId, ventana);
  return calcularIngresosPorServicio(servicios, citas);
}

// ---------------------------------------------------------------------------
// US2 — Ocupación semanal por profesional (FR-002)
// ---------------------------------------------------------------------------

export interface SemanaOcupacion {
  semanaInicio: string;
  minutosOcupados: number;
  minutosDisponibles: number;
  porcentaje: number;
}

export interface OcupacionSemanalProfesional {
  profesionalId: string;
  nombreProfesional: string;
  activo: boolean;
  semanas: SemanaOcupacion[];
}

function minutosDisponiblesSemana(lunesIso: string): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const dia = sumarDiasIso(lunesIso, i);
    for (const tramo of tramosLaboralesDelDia(dia)) {
      total += (tramo.fin.getTime() - tramo.inicio.getTime()) / 60000;
    }
  }
  return total;
}

/**
 * Función pura: "ocupado" = citas `reservada` o `completada` (misma
 * definición que `calcularHuecos` en `lib/agenda/horario.ts`; `cancelada` y
 * `no_asistida` liberan el hueco). Un profesional sin citas en una semana
 * muestra 0% (FR-009).
 */
export function calcularOcupacionSemanal(
  profesionales: ProfesionalParaAnalitica[],
  citas: CitaParaAnalitica[],
  ventana: VentanaOchoSemanas,
): OcupacionSemanalProfesional[] {
  const capacidadPorSemana = new Map(ventana.semanas.map((s) => [s, minutosDisponiblesSemana(s)]));

  const ocupadoPorProfesionalYSemana = new Map<string, Map<string, number>>();
  for (const profesional of profesionales) ocupadoPorProfesionalYSemana.set(profesional.id, new Map());

  for (const cita of citas) {
    if (cita.estado !== 'reservada' && cita.estado !== 'completada') continue;
    const mapaSemanas = ocupadoPorProfesionalYSemana.get(cita.profesionalId);
    if (!mapaSemanas) continue;
    const semana = semanaDeFecha(cita.inicio);
    if (!capacidadPorSemana.has(semana)) continue;
    const duracionMin = (cita.fin.getTime() - cita.inicio.getTime()) / 60000;
    mapaSemanas.set(semana, (mapaSemanas.get(semana) ?? 0) + duracionMin);
  }

  return profesionales.map((profesional) => ({
    profesionalId: profesional.id,
    nombreProfesional: profesional.nombre,
    activo: profesional.activo,
    semanas: ventana.semanas.map((semanaInicio) => {
      const minutosDisponibles = capacidadPorSemana.get(semanaInicio) ?? 0;
      const minutosOcupados = ocupadoPorProfesionalYSemana.get(profesional.id)?.get(semanaInicio) ?? 0;
      const porcentaje =
        minutosDisponibles > 0 ? Math.round((minutosOcupados / minutosDisponibles) * 1000) / 10 : 0;
      return { semanaInicio, minutosOcupados, minutosDisponibles, porcentaje };
    }),
  }));
}

/** Lectura: ocupación semanal por profesional, últimas 8 semanas completas (FR-002). */
export async function obtenerOcupacionSemanal(
  despachoId: string,
  ventana: VentanaOchoSemanas,
): Promise<OcupacionSemanalProfesional[]> {
  const profesionales = await obtenerProfesionales(despachoId);
  const citas = await obtenerCitasEnVentana(despachoId, ventana);
  return calcularOcupacionSemanal(profesionales, citas, ventana);
}

// ---------------------------------------------------------------------------
// US3 — Tasa de no asistencia por profesional (FR-003)
// ---------------------------------------------------------------------------

export interface TasaNoAsistenciaProfesional {
  profesionalId: string;
  nombreProfesional: string;
  activo: boolean;
  totalHistoricas: number;
  totalNoAsistidas: number;
  porcentaje: number | null;
}

/**
 * Función pura: denominador = TODAS las citas históricas resueltas
 * (`completada` + `cancelada` + `no_asistida`), sin ventana (Assumptions
 * de spec.md). `null` si no hay ninguna cita histórica (FR-009).
 */
export function calcularTasaNoAsistencia(
  profesionales: ProfesionalParaAnalitica[],
  citas: CitaParaAnalitica[],
): TasaNoAsistenciaProfesional[] {
  const totalPorProfesional = new Map<string, number>();
  const noAsistidasPorProfesional = new Map<string, number>();
  for (const profesional of profesionales) {
    totalPorProfesional.set(profesional.id, 0);
    noAsistidasPorProfesional.set(profesional.id, 0);
  }

  for (const cita of citas) {
    if (cita.estado !== 'completada' && cita.estado !== 'cancelada' && cita.estado !== 'no_asistida') {
      continue;
    }
    if (!totalPorProfesional.has(cita.profesionalId)) continue;
    totalPorProfesional.set(cita.profesionalId, (totalPorProfesional.get(cita.profesionalId) ?? 0) + 1);
    if (cita.estado === 'no_asistida') {
      noAsistidasPorProfesional.set(
        cita.profesionalId,
        (noAsistidasPorProfesional.get(cita.profesionalId) ?? 0) + 1,
      );
    }
  }

  return profesionales.map((profesional) => {
    const totalHistoricas = totalPorProfesional.get(profesional.id) ?? 0;
    const totalNoAsistidas = noAsistidasPorProfesional.get(profesional.id) ?? 0;
    return {
      profesionalId: profesional.id,
      nombreProfesional: profesional.nombre,
      activo: profesional.activo,
      totalHistoricas,
      totalNoAsistidas,
      porcentaje: totalHistoricas > 0 ? Math.round((totalNoAsistidas / totalHistoricas) * 10000) / 100 : null,
    };
  });
}

/** Lectura: tasa de no asistencia por profesional, histórico completo (FR-003). */
export async function obtenerTasaNoAsistencia(despachoId: string): Promise<TasaNoAsistenciaProfesional[]> {
  const profesionales = await obtenerProfesionales(despachoId);
  const citas = await obtenerCitasHistoricasResueltas(despachoId);
  return calcularTasaNoAsistencia(profesionales, citas);
}

// ---------------------------------------------------------------------------
// US4 — Evolución semanal por profesional (FR-005)
// ---------------------------------------------------------------------------

export interface SemanaEvolucion {
  semanaInicio: string;
  totalCitas: number;
  ingresosCentimos: number;
}

export interface EvolucionSemanalProfesional {
  profesionalId: string;
  nombreProfesional: string;
  semanas: SemanaEvolucion[];
}

/** Función pura: citas totales (cualquier estado) e ingresos (`completada`) por profesional y semana. */
export function calcularEvolucionSemanal(
  profesionales: ProfesionalParaAnalitica[],
  citas: CitaParaAnalitica[],
  ventana: VentanaOchoSemanas,
): EvolucionSemanalProfesional[] {
  const citasPorProfesionalYSemana = new Map<string, Map<string, number>>();
  const ingresosPorProfesionalYSemana = new Map<string, Map<string, number>>();
  for (const profesional of profesionales) {
    citasPorProfesionalYSemana.set(profesional.id, new Map());
    ingresosPorProfesionalYSemana.set(profesional.id, new Map());
  }

  for (const cita of citas) {
    const mapaCitas = citasPorProfesionalYSemana.get(cita.profesionalId);
    if (!mapaCitas) continue;
    const semana = semanaDeFecha(cita.inicio);
    if (!ventana.semanas.includes(semana)) continue;

    mapaCitas.set(semana, (mapaCitas.get(semana) ?? 0) + 1);
    if (cita.estado === 'completada') {
      const mapaIngresos = ingresosPorProfesionalYSemana.get(cita.profesionalId);
      if (mapaIngresos) {
        mapaIngresos.set(semana, (mapaIngresos.get(semana) ?? 0) + cita.precioCentimos);
      }
    }
  }

  return profesionales.map((profesional) => ({
    profesionalId: profesional.id,
    nombreProfesional: profesional.nombre,
    semanas: ventana.semanas.map((semanaInicio) => ({
      semanaInicio,
      totalCitas: citasPorProfesionalYSemana.get(profesional.id)?.get(semanaInicio) ?? 0,
      ingresosCentimos: ingresosPorProfesionalYSemana.get(profesional.id)?.get(semanaInicio) ?? 0,
    })),
  }));
}

/** Lectura: evolución semanal por profesional, últimas 8 semanas completas (FR-005). */
export async function obtenerEvolucionSemanal(
  despachoId: string,
  ventana: VentanaOchoSemanas,
): Promise<EvolucionSemanalProfesional[]> {
  const profesionales = await obtenerProfesionales(despachoId);
  const citas = await obtenerCitasEnVentana(despachoId, ventana);
  return calcularEvolucionSemanal(profesionales, citas, ventana);
}

// ---------------------------------------------------------------------------
// Fetch compartido (Prisma) — sin escritura, todo `select`/`findMany` (FR-006)
// ---------------------------------------------------------------------------

async function obtenerProfesionales(despachoId: string): Promise<ProfesionalParaAnalitica[]> {
  return prisma.profesional.findMany({
    where: { despachoId },
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, activo: true },
  });
}

function mapearCita(cita: {
  profesionalId: string;
  servicioId: string;
  inicio: Date;
  fin: Date;
  estado: EstadoCita;
  servicio: { precioCentimos: number };
}): CitaParaAnalitica {
  return {
    profesionalId: cita.profesionalId,
    servicioId: cita.servicioId,
    inicio: cita.inicio,
    fin: cita.fin,
    estado: cita.estado,
    precioCentimos: cita.servicio.precioCentimos,
  };
}

/** Citas cuyo `inicio` cae dentro de `[ventana.inicio, ventana.fin]` (cualquier estado). */
async function obtenerCitasEnVentana(
  despachoId: string,
  ventana: VentanaOchoSemanas,
): Promise<CitaParaAnalitica[]> {
  const desde = horaMadridAUtc(ventana.inicio, 0, 0);
  const hasta = horaMadridAUtc(sumarDiasIso(ventana.fin, 1), 0, 0);

  const citas = await prisma.cita.findMany({
    where: {
      inicio: { gte: desde, lt: hasta },
      profesional: { despachoId },
    },
    select: {
      profesionalId: true,
      servicioId: true,
      inicio: true,
      fin: true,
      estado: true,
      servicio: { select: { precioCentimos: true } },
    },
  });

  return citas.map(mapearCita);
}

/** Todas las citas históricas resueltas (`completada`/`cancelada`/`no_asistida`), sin ventana. */
async function obtenerCitasHistoricasResueltas(despachoId: string): Promise<CitaParaAnalitica[]> {
  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ['completada', 'cancelada', 'no_asistida'] },
      profesional: { despachoId },
    },
    select: {
      profesionalId: true,
      servicioId: true,
      inicio: true,
      fin: true,
      estado: true,
      servicio: { select: { precioCentimos: true } },
    },
  });

  return citas.map(mapearCita);
}

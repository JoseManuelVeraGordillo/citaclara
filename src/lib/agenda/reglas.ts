import { estaEnHorarioLaboral } from '@/lib/agenda/horario';

export type CodigoErrorRegla =
  | 'solape'
  | 'en_el_pasado'
  | 'fuera_de_horario'
  | 'cliente_invalido'
  | 'estado_final_inmutable'
  | 'transicion_no_permitida'
  | 'cita_no_reservada';

/** Error de regla de negocio, traducible directamente a la respuesta 422 de los contratos. */
export class ErrorReglaNegocio extends Error {
  readonly codigo: CodigoErrorRegla;

  constructor(codigo: CodigoErrorRegla, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
    this.name = 'ErrorReglaNegocio';
  }
}

export interface IntervaloCita {
  id: string;
  inicio: Date;
  fin: Date;
  estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida';
}

function seSolapan(aInicio: Date, aFin: Date, bInicio: Date, bFin: Date): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/**
 * RN1 (Principio III, FR-004): comprobación de solape en la capa de
 * aplicación, como primer filtro rápido antes de escribir en base de datos.
 * No sustituye a la restricción `EXCLUDE` (única garantía real bajo
 * condiciones de carrera, FR-005) — ver `traducirErrorEscrituraCita`.
 */
export function validarSinSolapeAplicacion(
  citasDelProfesional: IntervaloCita[],
  inicio: Date,
  fin: Date,
  excluirCitaId?: string,
): void {
  const activa = (c: IntervaloCita) =>
    (c.estado === 'reservada' || c.estado === 'completada') && c.id !== excluirCitaId;

  const solapa = citasDelProfesional
    .filter(activa)
    .some((c) => seSolapan(inicio, fin, c.inicio, c.fin));

  if (solapa) {
    throw new ErrorReglaNegocio(
      'solape',
      'El horario solicitado se solapa con otra cita del profesional.',
    );
  }
}

/** Nombre de la restricción EXCLUDE de PostgreSQL que garantiza RN1 (ver migración). */
const NOMBRE_RESTRICCION_RN1 = 'citas_sin_solape_por_profesional';

/**
 * RN2 (FR-006): `inicio` debe ser posterior o igual al instante actual en el
 * momento de crear/reprogramar la cita.
 */
export function validarNoEnElPasado(inicio: Date, ahora: Date = new Date()): void {
  if (inicio < ahora) {
    throw new ErrorReglaNegocio(
      'en_el_pasado',
      'El inicio de la cita no puede estar en el pasado.',
    );
  }
}

/** Horario laboral (FR-007): `[inicio, fin)` debe caer íntegramente en un tramo laboral. */
export function validarHorarioLaboral(inicio: Date, fin: Date): void {
  if (!estaEnHorarioLaboral(inicio, fin)) {
    throw new ErrorReglaNegocio(
      'fuera_de_horario',
      'La cita debe caer dentro del horario laboral (09:00–14:00 o 16:00–20:00, lunes a viernes).',
    );
  }
}

/**
 * RN1 (Principio III, FR-004, FR-005): traduce la violación de la restricción
 * `EXCLUDE` de PostgreSQL —lanzada por la propia base de datos incluso bajo
 * condiciones de carrera— al código de error `solape` del contrato. Debe
 * envolver toda escritura (`create`/`update`) que module el intervalo
 * `[inicio, fin)` de una cita.
 */
export function esViolacionRN1(error: unknown): boolean {
  const mensaje = extraerMensajeError(error);
  return mensaje.includes(NOMBRE_RESTRICCION_RN1) || mensaje.includes('23P01');
}

export function traducirErrorEscrituraCita(error: unknown): never {
  if (esViolacionRN1(error)) {
    throw new ErrorReglaNegocio(
      'solape',
      'El horario solicitado se solapa con otra cita del profesional.',
    );
  }
  throw error;
}

function extraerMensajeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const conMensaje = error as { message?: unknown; meta?: { message?: unknown } };
    const partes = [conMensaje.message, conMensaje.meta?.message]
      .filter((v): v is string => typeof v === 'string')
      .join(' ');
    if (partes) return partes;
  }
  return String(error);
}

/** Máquina de estados de Cita (FR-009, FR-010): solo se transiciona desde `reservada`. */
export function validarTransicionEstado(
  estadoActual: 'reservada' | 'completada' | 'cancelada' | 'no_asistida',
  nuevoEstado: 'completada' | 'cancelada' | 'no_asistida',
): void {
  if (estadoActual !== 'reservada') {
    throw new ErrorReglaNegocio(
      'estado_final_inmutable',
      'La cita ya está en un estado final y no admite más cambios.',
    );
  }
  if (!['completada', 'cancelada', 'no_asistida'].includes(nuevoEstado)) {
    throw new ErrorReglaNegocio('transicion_no_permitida', 'Transición de estado no permitida.');
  }
}

/** Reprogramación (FR-011, FR-012): solo válida sobre una cita en `reservada`. */
export function validarCitaReprogramable(
  estadoActual: 'reservada' | 'completada' | 'cancelada' | 'no_asistida',
): void {
  if (estadoActual !== 'reservada') {
    throw new ErrorReglaNegocio(
      'cita_no_reservada',
      'Solo se pueden reprogramar citas en estado reservada.',
    );
  }
}

/**
 * Selección de citas candidatas a recordatorio (FR-001, FR-004, FR-005,
 * FR-009, FR-012). Función pura: nunca llama a `Date.now()`, recibe `ahora`
 * como parámetro para ser reproducible en demos y tests (Principio V,
 * research.md §2) — ver `contracts/recordatorios.md#seleccionarcitaspararecordar`.
 */

const VENTANA_MIN_MS = 24 * 60 * 60 * 1000;
const VENTANA_MAX_MS = 48 * 60 * 60 * 1000;

export type EstadoCita = 'reservada' | 'completada' | 'cancelada' | 'no_asistida';

export interface RecordatorioExistente {
  citaInicio: string; // ISO UTC
}

export interface CitaCandidata {
  id: string;
  inicio: string; // ISO UTC
  estado: EstadoCita;
  clienteEmail: string;
  recordatoriosExistentes: RecordatorioExistente[];
}

export interface CitaARecordar {
  citaId: string;
  conEmail: boolean; // false → omitido_sin_email (FR-012)
}

export interface SeleccionRecordatorios {
  aGenerar: CitaARecordar[];
}

/** Cliente sin email registrado: null, vacío o solo espacios (research.md §6, defensivo). */
function tieneEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().length > 0;
}

function enVentana(inicio: Date, ahora: Date): boolean {
  const diferenciaMs = inicio.getTime() - ahora.getTime();
  return diferenciaMs >= VENTANA_MIN_MS && diferenciaMs <= VENTANA_MAX_MS;
}

function yaRecordadaParaEsteInicio(cita: CitaCandidata): boolean {
  return cita.recordatoriosExistentes.some((r) => r.citaInicio === cita.inicio);
}

export function seleccionarCitasParaRecordar(
  ahora: Date,
  citas: CitaCandidata[],
): SeleccionRecordatorios {
  const aGenerar: CitaARecordar[] = [];

  for (const cita of citas) {
    if (cita.estado !== 'reservada') continue;
    if (!enVentana(new Date(cita.inicio), ahora)) continue;
    if (yaRecordadaParaEsteInicio(cita)) continue;

    aGenerar.push({ citaId: cita.id, conEmail: tieneEmail(cita.clienteEmail) });
  }

  return { aGenerar };
}

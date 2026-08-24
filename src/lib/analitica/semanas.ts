import { diaSemanaMadrid, fechaMadrid } from '@/lib/tiempo/zona-horaria';

/** Ventana de las últimas 8 semanas naturales completas (lunes a domingo, Europe/Madrid), excluyendo la semana en curso (data-model.md, Assumptions de spec.md). */
export interface VentanaOchoSemanas {
  /** YYYY-MM-DD, lunes de la semana completa más antigua de las 8. */
  inicio: string;
  /** YYYY-MM-DD, domingo de la semana completa más reciente de las 8. */
  fin: string;
  /** Los 8 lunes YYYY-MM-DD, orden cronológico ascendente. */
  semanas: string[];
}

/** Suma (o resta) días a una fecha YYYY-MM-DD sin depender de la hora local del proceso. */
export function sumarDiasIso(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Lunes (Europe/Madrid) de la semana a la que pertenece `fechaIso`. */
function lunesDeLaSemana(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  // Mediodía UTC evita ambigüedad de cambio de horario, igual que tramosLaboralesDelDia (lib/agenda/horario.ts).
  const fechaUtcMediodia = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
  const diaSemana = diaSemanaMadrid(fechaUtcMediodia); // 1 = lunes ... 7 = domingo
  return sumarDiasIso(fechaIso, -(diaSemana - 1));
}

/** Lunes (YYYY-MM-DD, Europe/Madrid) de la semana a la que pertenece un instante UTC. */
export function semanaDeFecha(fechaUtc: Date): string {
  return lunesDeLaSemana(fechaMadrid(fechaUtc));
}

/**
 * Calcula las últimas 8 semanas naturales completas anteriores a la semana
 * que contiene `fechaReferenciaUtc`, en Europe/Madrid. La semana en curso
 * nunca se incluye (FR-007, US4-Escenario 2).
 */
export function obtenerVentana8SemanasCompletas(fechaReferenciaUtc: Date): VentanaOchoSemanas {
  const fechaReferenciaIso = fechaMadrid(fechaReferenciaUtc);
  const lunesSemanaActual = lunesDeLaSemana(fechaReferenciaIso);

  const semanas: string[] = [];
  let cursor = sumarDiasIso(lunesSemanaActual, -7);
  for (let i = 0; i < 8; i++) {
    semanas.unshift(cursor);
    cursor = sumarDiasIso(cursor, -7);
  }

  const inicio = semanas[0];
  const fin = sumarDiasIso(semanas[semanas.length - 1], 6);

  return { inicio, fin, semanas };
}

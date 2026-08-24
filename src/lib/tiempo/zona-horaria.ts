import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Toda fecha/hora se almacena en UTC (Principio II); esta es la única zona
 * horaria de presentación de CitaClara.
 */
export const ZONA_HORARIA = 'Europe/Madrid';

/** Convierte un instante UTC a su representación local en Europe/Madrid. */
export function aZonaMadrid(fechaUtc: Date): Date {
  return toZonedTime(fechaUtc, ZONA_HORARIA);
}

/**
 * Interpreta una fecha/hora "de pared" en Europe/Madrid (p. ej. la que
 * introduce la secretaría en un formulario) y devuelve el instante UTC
 * correspondiente.
 */
export function deZonaMadridAUtc(fechaLocal: Date): Date {
  return fromZonedTime(fechaLocal, ZONA_HORARIA);
}

/**
 * Formatea un instante UTC como fecha/hora legible en Europe/Madrid, con
 * nombres de mes/día en español de España (Principio VIII).
 */
export function formatearEnMadrid(fechaUtc: Date, patron: string): string {
  return format(toZonedTime(fechaUtc, ZONA_HORARIA), patron, { locale: es });
}

/** Fecha (YYYY-MM-DD) en Europe/Madrid correspondiente a un instante UTC. */
export function fechaMadrid(fechaUtc: Date): string {
  return formatearEnMadrid(fechaUtc, 'yyyy-MM-dd');
}

/**
 * Construye el instante UTC para una hora concreta (horas, minutos) del día
 * `fechaIso` (YYYY-MM-DD) interpretado en Europe/Madrid.
 */
export function horaMadridAUtc(fechaIso: string, horas: number, minutos: number): Date {
  // `fromZonedTime` lee los getters *locales* del Date recibido e interpreta
  // esos valores como hora de pared en `timeZone`. Por eso aquí se construye
  // con el constructor local (no `Date.UTC`): así los getters locales son
  // exactamente (horas, minutos) sin importar la zona horaria del sistema
  // que ejecuta el proceso.
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const horaDePared = new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
  return fromZonedTime(horaDePared, ZONA_HORARIA);
}

/** Día de la semana (1 = lunes ... 7 = domingo) en Europe/Madrid. */
export function diaSemanaMadrid(fechaUtc: Date): number {
  const local = aZonaMadrid(fechaUtc);
  const dia = local.getDay();
  return dia === 0 ? 7 : dia;
}

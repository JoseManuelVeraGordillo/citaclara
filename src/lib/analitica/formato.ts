/** Formatea céntimos enteros como importe en euros, español de España (Principio II, VIII). */
export function formatearCentimos(centimos: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimos / 100);
}

/** Formatea una fecha YYYY-MM-DD como "22 jun 2026" (sin ambigüedad, español de España, FR-007). */
export function formatearSemanaCorta(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
}

/** Mensajes de error en español de España para la cancelación por token (FR-008, Principio VIII). */
const MENSAJES: Record<string, string> = {
  token_invalido: 'Este enlace no es válido. Comprueba que lo has copiado completo.',
  ya_cancelada: 'Esta cita ya estaba cancelada.',
  plazo_agotado: 'Ya no se puede cancelar esta cita por este medio: la hora de la cita ya ha pasado.',
};

export function mensajeErrorRecordatorio(codigo: string | undefined): string {
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo];
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

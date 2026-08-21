/** Traducción de códigos de error de las reglas de negocio a español de España (FR-014, FR-016). */
const MENSAJES: Record<string, string> = {
  solape: 'Ese horario ya está ocupado por otra cita de este profesional. Elige otro hueco.',
  en_el_pasado: 'No se puede reservar una cita en un momento que ya ha pasado.',
  fuera_de_horario:
    'La cita debe caer dentro del horario laboral (09:00–14:00 o 16:00–20:00, de lunes a viernes).',
  cliente_invalido: 'Faltan datos del cliente o del servicio. Revisa el formulario.',
  estado_final_inmutable: 'Esta cita ya está en un estado final y no se puede modificar.',
  transicion_no_permitida: 'Ese cambio de estado no está permitido para esta cita.',
  cita_no_reservada: 'Solo se pueden reprogramar citas que estén en estado "reservada".',
};

export function mensajeError(codigo: string | undefined, mensajeServidor?: string): string {
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo];
  return mensajeServidor ?? 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

// Validaciones puras de la cancelación desde el portal (FR-005, FR-006),
// separadas de la lectura/escritura en BD para poder probarse sin base de
// datos (tests/unit/portal/cancelar.test.ts).

import { PLAZO_CANCELACION_MS } from '@/lib/portal/plazo';

export type CodigoErrorCancelacion =
  | 'cita_no_es_del_cliente'
  | 'cita_no_reservada'
  | 'fuera_de_plazo';

export class ErrorCancelacion extends Error {
  readonly codigo: CodigoErrorCancelacion;

  constructor(codigo: CodigoErrorCancelacion, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
    this.name = 'ErrorCancelacion';
  }
}

interface CitaParaCancelar {
  clienteId: string;
  estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida';
  inicio: Date;
}

/**
 * Comprueba que el cliente de la sesión puede cancelar esta cita ahora: le
 * pertenece, sigue `reservada` y su inicio está a 24h o más (FR-005, FR-006).
 */
export function validarPuedeCancelar(
  cita: CitaParaCancelar,
  clienteIdSesion: string,
  ahora: Date,
): void {
  if (cita.clienteId !== clienteIdSesion) {
    throw new ErrorCancelacion('cita_no_es_del_cliente', 'Esta cita no pertenece a tu cuenta.');
  }
  if (cita.estado !== 'reservada') {
    throw new ErrorCancelacion(
      'cita_no_reservada',
      'Esta cita ya no se puede cancelar (su estado ha cambiado).',
    );
  }
  const antelacionMs = cita.inicio.getTime() - ahora.getTime();
  if (antelacionMs < PLAZO_CANCELACION_MS) {
    throw new ErrorCancelacion(
      'fuera_de_plazo',
      'Ya no puedes cancelar esta cita online: quedan menos de 24 horas para su inicio. Llama al despacho para gestionarla.',
    );
  }
}

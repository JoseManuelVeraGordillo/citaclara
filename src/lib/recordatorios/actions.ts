'use server';

import { prisma } from '@/lib/db/prisma';
import { cambiarEstadoCita } from '@/lib/agenda/actions';

export type CodigoErrorCancelacion = 'token_invalido' | 'ya_cancelada' | 'plazo_agotado';

export interface ResultadoCancelacion {
  ok: boolean;
  citaId?: string;
  codigo?: CodigoErrorCancelacion;
}

/**
 * `confirmarCancelacionRecordatorio` — FR-006, FR-007, FR-008, contrato
 * `contracts/recordatorios.md#confirmarcancelacionrecordatorio`. Sin sesión
 * de secretaría: la única prueba de identidad es poseer el token del enlace
 * (research.md §5).
 */
export async function confirmarCancelacionRecordatorio(
  token: string,
): Promise<ResultadoCancelacion> {
  const recordatorio = await prisma.recordatorio.findUnique({
    where: { token },
    include: { cita: true },
  });

  if (!recordatorio || recordatorio.estado !== 'enviado') {
    return { ok: false, codigo: 'token_invalido' };
  }
  if (recordatorio.canceladoEn) {
    return { ok: false, codigo: 'ya_cancelada' };
  }

  const ahora = new Date();
  if (ahora >= recordatorio.cita.inicio) {
    return { ok: false, codigo: 'plazo_agotado' };
  }

  const resultado = await cambiarEstadoCita({
    citaId: recordatorio.citaId,
    nuevoEstado: 'cancelada',
  });
  if (!resultado.ok) {
    // La cita ya no estaba en `reservada` (p. ej. cancelada/completada por
    // secretaría entre tanto): no hay nada más que cancelar por este medio.
    return { ok: false, codigo: 'token_invalido' };
  }

  await prisma.recordatorio.update({
    where: { id: recordatorio.id },
    data: { canceladoEn: ahora },
  });

  return { ok: true, citaId: recordatorio.citaId };
}

/**
 * Datos de la cita para la página pública de cancelación (lectura, sin
 * mutar nada). `ya_cancelado` está separado de `no_valido`: una Server
 * Action refresca automáticamente esta misma página tras ejecutarse, así
 * que justo después de confirmar la cancelación esta función se vuelve a
 * llamar y debe seguir reconociendo el token como legítimo (y mostrar una
 * confirmación amistosa), no tratarlo como si nunca hubiera existido.
 */
export interface DatosCancelacion {
  estadoEnlace: 'valido' | 'ya_cancelado' | 'plazo_agotado' | 'no_valido';
  cita?: {
    inicio: string; // ISO UTC
    profesionalNombre: string;
    area: string;
  };
}

export async function obtenerDatosCancelacion(token: string): Promise<DatosCancelacion> {
  const recordatorio = await prisma.recordatorio.findUnique({
    where: { token },
    include: { cita: { include: { profesional: true, servicio: true } } },
  });

  if (!recordatorio || recordatorio.estado !== 'enviado') {
    return { estadoEnlace: 'no_valido' };
  }

  if (recordatorio.canceladoEn) {
    return { estadoEnlace: 'ya_cancelado' };
  }

  if (new Date() >= recordatorio.cita.inicio) {
    return { estadoEnlace: 'plazo_agotado' };
  }

  return {
    estadoEnlace: 'valido',
    cita: {
      inicio: recordatorio.cita.inicio.toISOString(),
      profesionalNombre: recordatorio.cita.profesional.nombre,
      area: recordatorio.cita.servicio.nombre,
    },
  };
}

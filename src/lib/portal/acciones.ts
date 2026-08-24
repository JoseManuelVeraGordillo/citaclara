'use server';

// `cancelarCita` — FR-005, FR-006, FR-007, FR-007a, FR-008,
// contrato `portal-cliente.md#cancelarCita`.

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { cancelarCitaAtomica } from '@/lib/agenda/reglas';
import { COOKIE_SESION_CLIENTE, clienteIdDeSesion } from '@/lib/portal/sesion-cliente';
import { ErrorCancelacion, validarPuedeCancelar } from '@/lib/portal/validaciones';
import type { CodigoErrorCancelacion as CodigoErrorCancelacionValidacion } from '@/lib/portal/validaciones';

export type CodigoErrorCancelacion = 'no_autenticado' | CodigoErrorCancelacionValidacion;

export interface ResultadoCancelacion {
  ok: boolean;
  citaId?: string;
  estado?: 'cancelada';
  codigo?: CodigoErrorCancelacion;
  mensaje?: string;
}

function revalidarPortalYAgenda(): void {
  try {
    revalidatePath('/portal/mis-citas');
    revalidatePath('/agenda');
  } catch {
    // Sin contexto de petición de Next (p. ej. en tests de integración).
  }
}

export async function cancelarCita(citaId: string): Promise<ResultadoCancelacion> {
  const almacen = await cookies();
  const clienteId = await clienteIdDeSesion(almacen.get(COOKIE_SESION_CLIENTE)?.value);
  if (!clienteId) {
    return { ok: false, codigo: 'no_autenticado', mensaje: 'Tu sesión no es válida.' };
  }

  const cita = await prisma.cita.findUnique({ where: { id: citaId } });
  if (!cita) {
    return {
      ok: false,
      codigo: 'cita_no_es_del_cliente',
      mensaje: 'Esta cita no pertenece a tu cuenta.',
    };
  }

  try {
    validarPuedeCancelar(cita, clienteId, new Date());
  } catch (error) {
    if (error instanceof ErrorCancelacion) {
      return { ok: false, codigo: error.codigo, mensaje: error.message };
    }
    throw error;
  }

  const cancelada = await cancelarCitaAtomica(citaId, 'cliente');
  if (!cancelada) {
    return {
      ok: false,
      codigo: 'cita_no_reservada',
      mensaje: 'Esta cita ya no se puede cancelar (su estado ha cambiado).',
    };
  }

  revalidarPortalYAgenda();
  return { ok: true, citaId, estado: 'cancelada' };
}

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import {
  cancelarCitaAtomica,
  ErrorReglaNegocio,
  traducirErrorEscrituraCita,
  validarCitaReprogramable,
  validarHorarioLaboral,
  validarNoEnElPasado,
  validarSinSolapeAplicacion,
  validarTransicionEstado,
} from '@/lib/agenda/reglas';

type EstadoCita = 'reservada' | 'completada' | 'cancelada' | 'no_asistida';

/**
 * `revalidatePath` exige un contexto de petición de Next.js; al invocar estas
 * acciones directamente (p. ej. desde el test de concurrencia de integración,
 * fuera del runtime de Next) no hay ese contexto, así que se ignora en ese
 * caso en vez de hacer fallar la operación de escritura ya confirmada en BD.
 */
function revalidarAgenda(): void {
  try {
    revalidatePath('/agenda');
  } catch {
    // Sin contexto de petición de Next (p. ej. en tests de integración).
  }
}

export interface ResultadoAccion<T> {
  ok: boolean;
  datos?: T;
  codigo?: string;
  mensaje?: string;
}

/**
 * Traduce un `ErrorReglaNegocio` a resultado 422; cualquier otro error
 * (incluida una violación RN1 de la restricción EXCLUDE, vía
 * `traducirErrorEscrituraCita`) se relanza tal cual si no es de regla.
 */
function errorComoResultado<T>(error: unknown): ResultadoAccion<T> {
  try {
    traducirErrorEscrituraCita(error);
  } catch (traducido) {
    if (traducido instanceof ErrorReglaNegocio) {
      return { ok: false, codigo: traducido.codigo, mensaje: traducido.message };
    }
    throw traducido;
  }
  throw error;
}

/** `darDeAltaCita` — FR-003, FR-013, contrato `agenda-actions.md#darDeAltaCita`. */
export interface EntradaAlta {
  profesionalId: string;
  servicioId: string;
  clienteId?: string;
  clienteNuevo?: { nombre: string; apellidos: string; telefono: string; email: string };
  inicio: string; // ISO UTC
}

export interface SalidaAlta {
  citaId: string;
  inicio: string;
  fin: string;
  estado: 'reservada';
}

export async function darDeAltaCita(entrada: EntradaAlta): Promise<ResultadoAccion<SalidaAlta>> {
  try {
    if (!entrada.clienteId && !entrada.clienteNuevo) {
      throw new ErrorReglaNegocio(
        'cliente_invalido',
        'Falta el cliente: elige una ficha existente o crea una nueva.',
      );
    }
    if (
      entrada.clienteNuevo &&
      (!entrada.clienteNuevo.nombre ||
        !entrada.clienteNuevo.apellidos ||
        !entrada.clienteNuevo.telefono ||
        !entrada.clienteNuevo.email)
    ) {
      throw new ErrorReglaNegocio(
        'cliente_invalido',
        'La ficha de cliente nueva debe incluir nombre, apellidos, teléfono y email.',
      );
    }

    const servicio = await prisma.servicio.findUnique({ where: { id: entrada.servicioId } });
    if (!servicio) {
      throw new ErrorReglaNegocio('cliente_invalido', 'El servicio elegido no existe.');
    }

    const inicio = new Date(entrada.inicio);
    const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);

    validarNoEnElPasado(inicio);
    validarHorarioLaboral(inicio, fin);

    const citasDelDia = await prisma.cita.findMany({
      where: { profesionalId: entrada.profesionalId, inicio: { lt: fin }, fin: { gt: inicio } },
    });
    validarSinSolapeAplicacion(citasDelDia, inicio, fin);

    let clienteId = entrada.clienteId;
    if (!clienteId && entrada.clienteNuevo) {
      const despacho = await prisma.despacho.findFirst();
      if (!despacho)
        throw new ErrorReglaNegocio('cliente_invalido', 'No hay despacho configurado.');
      const clienteCreado = await prisma.cliente.create({
        data: { ...entrada.clienteNuevo, despachoId: despacho.id },
      });
      clienteId = clienteCreado.id;
    }
    if (!clienteId) {
      throw new ErrorReglaNegocio('cliente_invalido', 'Falta el cliente.');
    }

    const cita = await prisma.cita.create({
      data: {
        profesionalId: entrada.profesionalId,
        servicioId: entrada.servicioId,
        clienteId,
        inicio,
        fin,
        estado: 'reservada',
      },
    });

    revalidarAgenda();
    return {
      ok: true,
      datos: {
        citaId: cita.id,
        inicio: cita.inicio.toISOString(),
        fin: cita.fin.toISOString(),
        estado: 'reservada',
      },
    };
  } catch (error) {
    return errorComoResultado(error);
  }
}

/** `cambiarEstadoCita` — FR-008, FR-009, FR-010, contrato `agenda-actions.md#cambiarEstadoCita`. */
export interface EntradaCambioEstado {
  citaId: string;
  nuevoEstado: 'completada' | 'cancelada' | 'no_asistida';
}

export interface SalidaCambioEstado {
  citaId: string;
  estado: 'completada' | 'cancelada' | 'no_asistida';
}

export async function cambiarEstadoCita(
  entrada: EntradaCambioEstado,
): Promise<ResultadoAccion<SalidaCambioEstado>> {
  try {
    const cita = await prisma.cita.findUnique({ where: { id: entrada.citaId } });
    if (!cita) {
      throw new ErrorReglaNegocio('estado_final_inmutable', 'La cita no existe.');
    }

    validarTransicionEstado(cita.estado as EstadoCita, entrada.nuevoEstado);

    if (entrada.nuevoEstado === 'cancelada') {
      // Cancelación atómica compartida con el portal del cliente (FR-007a,
      // FR-008, research.md §4-§5): fija además el origen de la cancelación.
      const cancelada = await cancelarCitaAtomica(entrada.citaId, 'secretaria');
      if (!cancelada) {
        throw new ErrorReglaNegocio(
          'estado_final_inmutable',
          'La cita ya está en un estado final y no admite más cambios.',
        );
      }
      revalidarAgenda();
      return { ok: true, datos: { citaId: entrada.citaId, estado: 'cancelada' } };
    }

    const actualizada = await prisma.cita.update({
      where: { id: entrada.citaId },
      data: { estado: entrada.nuevoEstado },
    });

    revalidarAgenda();
    return { ok: true, datos: { citaId: actualizada.id, estado: entrada.nuevoEstado } };
  } catch (error) {
    return errorComoResultado(error);
  }
}

/** `reprogramarCita` — FR-011, FR-012, contrato `agenda-actions.md#reprogramarCita`. */
export interface EntradaReprogramar {
  citaId: string;
  profesionalId?: string;
  servicioId?: string;
  inicio: string; // ISO UTC
}

export interface SalidaReprogramar {
  citaId: string;
  profesionalId: string;
  servicioId: string;
  inicio: string;
  fin: string;
}

export async function reprogramarCita(
  entrada: EntradaReprogramar,
): Promise<ResultadoAccion<SalidaReprogramar>> {
  try {
    const citaActual = await prisma.cita.findUnique({ where: { id: entrada.citaId } });
    if (!citaActual) {
      throw new ErrorReglaNegocio('cita_no_reservada', 'La cita no existe.');
    }
    validarCitaReprogramable(citaActual.estado as EstadoCita);

    const profesionalId = entrada.profesionalId ?? citaActual.profesionalId;
    const servicioId = entrada.servicioId ?? citaActual.servicioId;
    const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });
    if (!servicio) {
      throw new ErrorReglaNegocio('cita_no_reservada', 'El servicio elegido no existe.');
    }

    const inicio = new Date(entrada.inicio);
    const fin = new Date(inicio.getTime() + servicio.duracionMinutos * 60000);

    validarNoEnElPasado(inicio);
    validarHorarioLaboral(inicio, fin);

    const citasDelDia = await prisma.cita.findMany({
      where: { profesionalId, inicio: { lt: fin }, fin: { gt: inicio } },
    });
    validarSinSolapeAplicacion(citasDelDia, inicio, fin, citaActual.id);

    const actualizada = await prisma.cita.update({
      where: { id: entrada.citaId },
      data: { profesionalId, servicioId, inicio, fin },
    });

    revalidarAgenda();
    return {
      ok: true,
      datos: {
        citaId: actualizada.id,
        profesionalId: actualizada.profesionalId,
        servicioId: actualizada.servicioId,
        inicio: actualizada.inicio.toISOString(),
        fin: actualizada.fin.toISOString(),
      },
    };
  } catch (error) {
    return errorComoResultado(error);
  }
}

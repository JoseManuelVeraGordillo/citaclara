// Acceso del cliente sin cuenta ni contraseña (FR-001): token opaco de un
// solo uso, válido 15 minutos, solo se persiste su hash (research.md §3).

import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { emailSender } from '@/lib/portal/email';

export const MINUTOS_EXPIRACION = 15;

export type CodigoErrorAcceso = 'token_invalido' | 'token_expirado' | 'token_ya_usado';

export class ErrorAcceso extends Error {
  readonly codigo: CodigoErrorAcceso;

  constructor(codigo: CodigoErrorAcceso, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
    this.name = 'ErrorAcceso';
  }
}

export function generarToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function calcularExpiracion(creadoEn: Date): Date {
  return new Date(creadoEn.getTime() + MINUTOS_EXPIRACION * 60000);
}

/**
 * Validación pura de vigencia de una `SolicitudAccesoCliente` (FR-001a):
 * un token es canjeable si y solo si no ha expirado y no se ha usado ya.
 * Separada de la lectura/escritura en BD para poder probarse sin base de
 * datos (tests/unit/portal/acceso.test.ts).
 */
export function validarSolicitudVigente(
  solicitud: { expiraEn: Date; usadoEn: Date | null },
  ahora: Date,
): void {
  if (solicitud.expiraEn <= ahora) {
    throw new ErrorAcceso('token_expirado', 'El enlace de acceso ha caducado.');
  }
  if (solicitud.usadoEn !== null) {
    throw new ErrorAcceso('token_ya_usado', 'Este enlace de acceso ya se ha utilizado.');
  }
}

function urlBase(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/**
 * `solicitarAcceso` — FR-001, contrato `portal-cliente.md#solicitarAcceso`.
 * Por cada ficha de Cliente cuyo teléfono coincida exactamente (el teléfono
 * no es único, research.md §2), crea un token de acceso independiente y lo
 * envía a la email de esa ficha. La respuesta es siempre genérica, para no
 * filtrar si el teléfono está o no registrado.
 */
export async function solicitarAcceso(telefono: string): Promise<{ mensaje: string }> {
  const telefonoLimpio = telefono.trim();
  const mensaje = 'Si el teléfono está registrado, revisa tu email en los próximos minutos.';

  if (!telefonoLimpio) {
    return { mensaje };
  }

  const clientes = await prisma.cliente.findMany({ where: { telefono: telefonoLimpio } });

  for (const cliente of clientes) {
    const token = generarToken();
    const creadoEn = new Date();

    await prisma.solicitudAccesoCliente.create({
      data: {
        clienteId: cliente.id,
        tokenHash: hashToken(token),
        expiraEn: calcularExpiracion(creadoEn),
      },
    });

    const url = `${urlBase()}/portal/verificar/${token}`;
    await emailSender.enviarEnlaceAcceso(cliente.email, url);
  }

  return { mensaje };
}

/**
 * `canjearAcceso` — FR-001, FR-001a, contrato `portal-cliente.md#canjearAcceso`.
 * Canje atómico: como máximo un canje tiene éxito por token, incluso ante dos
 * intentos casi simultáneos (mismo patrón que la cancelación de FR-008).
 */
export async function canjearToken(token: string): Promise<{ clienteId: string }> {
  const tokenHash = hashToken(token);
  const ahora = new Date();

  const solicitud = await prisma.solicitudAccesoCliente.findFirst({ where: { tokenHash } });
  if (!solicitud) {
    throw new ErrorAcceso('token_invalido', 'El enlace de acceso no es válido.');
  }
  validarSolicitudVigente(solicitud, ahora);

  const canjeado = await prisma.solicitudAccesoCliente.updateMany({
    where: { id: solicitud.id, usadoEn: null },
    data: { usadoEn: ahora },
  });

  if (canjeado.count === 0) {
    throw new ErrorAcceso('token_ya_usado', 'Este enlace de acceso ya se ha utilizado.');
  }

  return { clienteId: solicitud.clienteId };
}

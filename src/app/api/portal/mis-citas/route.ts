import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { COOKIE_SESION_CLIENTE, clienteIdDeSesion } from '@/lib/portal/sesion-cliente';
import { PLAZO_CANCELACION_MS } from '@/lib/portal/plazo';

/** `verMisCitas` — FR-002, FR-003, FR-004, contrato `portal-cliente.md#verMisCitas`. */
export async function GET() {
  const almacen = await cookies();
  const clienteId = await clienteIdDeSesion(almacen.get(COOKIE_SESION_CLIENTE)?.value);

  if (!clienteId) {
    return NextResponse.json({ codigo: 'no_autenticado' }, { status: 401 });
  }

  const ahora = new Date();

  const [futuras, pasadas] = await Promise.all([
    prisma.cita.findMany({
      where: { clienteId, estado: 'reservada', inicio: { gt: ahora } },
      orderBy: { inicio: 'asc' },
      include: { profesional: true, servicio: true },
    }),
    prisma.cita.findMany({
      where: { clienteId, estado: { in: ['completada', 'cancelada', 'no_asistida'] } },
      orderBy: { inicio: 'desc' },
      include: { profesional: true, servicio: true },
    }),
  ]);

  return NextResponse.json({
    futuras: futuras.map((cita) => ({
      id: cita.id,
      profesionalNombre: cita.profesional.nombre,
      servicioNombre: cita.servicio.nombre,
      inicio: cita.inicio.toISOString(),
      fin: cita.fin.toISOString(),
      cancelable: cita.inicio.getTime() - ahora.getTime() >= PLAZO_CANCELACION_MS,
    })),
    pasadas: pasadas.map((cita) => ({
      id: cita.id,
      profesionalNombre: cita.profesional.nombre,
      servicioNombre: cita.servicio.nombre,
      inicio: cita.inicio.toISOString(),
      fin: cita.fin.toISOString(),
      estado: cita.estado,
    })),
  });
}

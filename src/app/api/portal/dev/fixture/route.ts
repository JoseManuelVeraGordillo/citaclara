import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Endpoint solo de desarrollo/test (nunca en producción): crea/borra datos
 * de prueba aislados para el e2e del portal (`tests/e2e/portal.spec.ts`).
 *
 * Existe porque el proceso de test de Playwright no puede importar
 * directamente el cliente Prisma generado (loader ESM distinto al de
 * Vitest/Next); crear la fixture vía HTTP contra el propio servidor Next
 * evita ese problema sin tocar la lógica de negocio.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ codigo: 'no_disponible' }, { status: 404 });
  }

  const telefono = `6${Math.floor(10000000 + Math.random() * 89999999)}`;

  const despacho = await prisma.despacho.create({
    data: { nombre: 'Despacho de test e2e portal', claveSecretariaHash: 'x', clavePanelHash: 'x' },
  });

  const profesional = await prisma.profesional.create({
    data: { despachoId: despacho.id, nombre: 'Profesional de test', especialidad: 'abogado' },
  });

  const servicio = await prisma.servicio.create({
    data: { despachoId: despacho.id, nombre: 'Servicio de test', duracionMinutos: 30, precioCentimos: 1000 },
  });

  const cliente = await prisma.cliente.create({
    data: {
      despachoId: despacho.id,
      nombre: 'Cliente',
      apellidos: 'Portal Test',
      telefono,
      email: `cliente.portal.test.${Date.now()}@ejemplo.es`,
    },
  });

  const ahora = Date.now();

  const citaFuturaCancelable = await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora + 3 * 24 * 60 * 60 * 1000),
      fin: new Date(ahora + 3 * 24 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'reservada',
    },
  });

  const citaFueraDePlazo = await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora + 6 * 60 * 60 * 1000),
      fin: new Date(ahora + 6 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'reservada',
    },
  });

  await prisma.cita.create({
    data: {
      profesionalId: profesional.id,
      servicioId: servicio.id,
      clienteId: cliente.id,
      inicio: new Date(ahora - 7 * 24 * 60 * 60 * 1000),
      fin: new Date(ahora - 7 * 24 * 60 * 60 * 1000 + 30 * 60000),
      estado: 'completada',
    },
  });

  return NextResponse.json({
    despachoId: despacho.id,
    profesionalId: profesional.id,
    telefono,
    citaFuturaCancelableId: citaFuturaCancelable.id,
    citaFueraDePlazoId: citaFueraDePlazo.id,
  });
}

export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ codigo: 'no_disponible' }, { status: 404 });
  }

  const despachoId = new URL(request.url).searchParams.get('despachoId');
  if (!despachoId) {
    return NextResponse.json({ codigo: 'despachoId_requerido' }, { status: 400 });
  }

  await prisma.cita.deleteMany({ where: { cliente: { despachoId } } });
  await prisma.solicitudAccesoCliente.deleteMany({ where: { cliente: { despachoId } } });
  await prisma.cliente.deleteMany({ where: { despachoId } });
  await prisma.servicio.deleteMany({ where: { despachoId } });
  await prisma.profesional.deleteMany({ where: { despachoId } });
  await prisma.despacho.delete({ where: { id: despachoId } });

  return NextResponse.json({ ok: true });
}

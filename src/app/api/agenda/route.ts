import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { calcularHuecos } from '@/lib/agenda/horario';
import { horaMadridAUtc } from '@/lib/tiempo/zona-horaria';

/**
 * `GET /api/agenda?profesionalId&fecha` — agenda del día de un profesional,
 * con huecos libres/ocupados en tiempo continuo (FR-002, contrato
 * `obtenerAgendaDia`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profesionalId = searchParams.get('profesionalId');
  const fecha = searchParams.get('fecha');

  if (!profesionalId || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json(
      {
        codigo: 'parametros_invalidos',
        mensaje: 'profesionalId y fecha (YYYY-MM-DD) son obligatorios.',
      },
      { status: 400 },
    );
  }

  const profesional = await prisma.profesional.findUnique({ where: { id: profesionalId } });
  if (!profesional) {
    return NextResponse.json({ codigo: 'profesional_no_encontrado' }, { status: 404 });
  }

  const inicioDia = horaMadridAUtc(fecha, 0, 0);
  const finDia = horaMadridAUtc(fecha, 23, 59);

  const citas = await prisma.cita.findMany({
    where: {
      profesionalId,
      inicio: { lte: finDia },
      fin: { gte: inicioDia },
    },
    include: {
      cliente: true,
      servicio: true,
      recordatorios: { where: { estado: 'omitido_sin_email' }, select: { citaInicio: true } },
    },
    orderBy: { inicio: 'asc' },
  });

  // Historial de cancelaciones del día (FR-007a): las citas canceladas
  // liberan el hueco (no aparecen en `huecos` como ocupadas), pero secretaría
  // debe poder ver, en el historial, si el origen fue el propio cliente.
  const citasCanceladas = citas.filter((c) => c.estado === 'cancelada');

  const huecos = calcularHuecos(
    fecha,
    citas.map((c) => ({
      id: c.id,
      inicio: c.inicio,
      fin: c.fin,
      clienteNombre: `${c.cliente.nombre} ${c.cliente.apellidos}`,
      servicioNombre: c.servicio.nombre,
      estado: c.estado,
      // 002-recordatorios-cita (FR-012): visible para secretaría cuando el
      // cliente no tiene email y el proceso diario omitió el recordatorio.
      sinRecordatorioEnviado: c.recordatorios.some(
        (r) => r.citaInicio.getTime() === c.inicio.getTime(),
      ),
    })),
  );

  return NextResponse.json({
    profesional: { id: profesional.id, nombre: profesional.nombre },
    fecha,
    huecos: huecos.map((h) => ({
      inicio: h.inicio.toISOString(),
      fin: h.fin.toISOString(),
      estado: h.estado,
      ...(h.cita ? { cita: h.cita } : {}),
    })),
    citasCanceladas: citasCanceladas.map((c) => ({
      id: c.id,
      inicio: c.inicio.toISOString(),
      clienteNombre: `${c.cliente.nombre} ${c.cliente.apellidos}`,
      servicioNombre: c.servicio.nombre,
      canceladaPor: c.canceladaPor,
    })),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * `GET /api/clientes?q=` — búsqueda de fichas de cliente por nombre,
 * apellidos o teléfono parcial (FR-013, contrato `buscarClientes`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q) {
    return NextResponse.json({ resultados: [] });
  }

  const clientes = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombre: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q } },
      ],
    },
    take: 20,
    orderBy: { nombre: 'asc' },
  });

  return NextResponse.json({
    resultados: clientes.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      apellidos: c.apellidos,
      telefono: c.telefono,
    })),
  });
}

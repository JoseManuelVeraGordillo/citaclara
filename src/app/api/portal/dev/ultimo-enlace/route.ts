import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ultimosEnviosTest } from '@/lib/portal/email';

/**
 * Endpoint solo de desarrollo/test (nunca en producción): expone el último
 * enlace de acceso "enviado" a la email de un cliente, para que los tests
 * e2e puedan probar FR-001 sin un proveedor real de email (research.md §1).
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ codigo: 'no_disponible' }, { status: 404 });
  }

  const telefono = new URL(request.url).searchParams.get('telefono');
  if (!telefono) {
    return NextResponse.json({ codigo: 'telefono_requerido' }, { status: 400 });
  }

  const cliente = await prisma.cliente.findFirst({ where: { telefono } });
  if (!cliente) {
    return NextResponse.json({ codigo: 'no_encontrado' }, { status: 404 });
  }

  const url = ultimosEnviosTest.get(cliente.email);
  if (!url) {
    return NextResponse.json({ codigo: 'no_encontrado' }, { status: 404 });
  }

  return NextResponse.json({ url });
}

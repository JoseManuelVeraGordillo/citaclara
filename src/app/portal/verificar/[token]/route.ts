import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { canjearToken, ErrorAcceso } from '@/lib/portal/acceso';
import { COOKIE_SESION_CLIENTE, crearValorCookieSesionCliente } from '@/lib/portal/sesion-cliente';

/** `canjearAcceso` — FR-001, FR-001a, contrato `portal-cliente.md#canjearAcceso`. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const { clienteId } = await canjearToken(token);

    const valorCookie = await crearValorCookieSesionCliente(clienteId);
    const almacen = await cookies();
    almacen.set(COOKIE_SESION_CLIENTE, valorCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.redirect(new URL('/portal/mis-citas', _request.url));
  } catch (error) {
    if (error instanceof ErrorAcceso) {
      const url = new URL('/portal/solicitar-acceso', _request.url);
      url.searchParams.set('error', error.codigo);
      return NextResponse.redirect(url);
    }
    throw error;
  }
}

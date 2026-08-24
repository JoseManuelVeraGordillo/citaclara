import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESION, esSesionValida } from '@/lib/auth/sesion';
import { COOKIE_SESION_CLIENTE, clienteIdDeSesion } from '@/lib/portal/sesion-cliente';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esRutaPortal =
    pathname.startsWith('/portal/mis-citas') ||
    (pathname.startsWith('/api/portal/') && !pathname.startsWith('/api/portal/dev/'));

  if (esRutaPortal) {
    const cookie = request.cookies.get(COOKIE_SESION_CLIENTE)?.value;
    const clienteId = await clienteIdDeSesion(cookie);

    if (!clienteId) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { codigo: 'no_autenticado', mensaje: 'Sesión no válida.' },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL('/portal/solicitar-acceso', request.url));
    }
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_SESION)?.value;
  const autenticado = await esSesionValida(cookie);

  if (!autenticado) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ codigo: 'no_autenticado', mensaje: 'Sesión no válida.' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/agenda/:path*',
    '/api/agenda/:path*',
    '/api/clientes/:path*',
    '/portal/mis-citas/:path*',
    '/api/portal/:path*',
  ],
};

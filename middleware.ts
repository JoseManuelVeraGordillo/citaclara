import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESION, esSesionValida } from '@/lib/auth/sesion';

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_SESION)?.value;
  const autenticado = await esSesionValida(cookie);

  if (!autenticado) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ codigo: 'no_autenticado', mensaje: 'Sesión no válida.' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/agenda/:path*', '/api/agenda/:path*', '/api/clientes/:path*'],
};

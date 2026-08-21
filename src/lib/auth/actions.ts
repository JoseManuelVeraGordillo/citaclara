'use server';

import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { COOKIE_SESION, crearValorCookieSesion } from '@/lib/auth/sesion';

export interface EstadoLogin {
  error?: string;
}

/** Valida la clave de secretaría del despacho y abre sesión (FR-001). */
export async function entrarComoSecretaria(
  _estadoPrevio: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const clave = String(formData.get('clave') ?? '').trim();
  if (!clave) {
    return { error: 'Introduce la clave de secretaría.' };
  }

  const despacho = await prisma.despacho.findFirst();
  if (!despacho) {
    return { error: 'No hay ningún despacho configurado. Ejecuta la semilla de datos.' };
  }

  const claveValida = await compare(clave, despacho.claveSecretariaHash);
  if (!claveValida) {
    return { error: 'Clave incorrecta.' };
  }

  const valorCookie = await crearValorCookieSesion();
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, valorCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect('/agenda');
}

export async function salir(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_SESION);
  redirect('/login');
}

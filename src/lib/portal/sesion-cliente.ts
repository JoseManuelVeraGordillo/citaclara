// Cookie de sesión del portal del cliente: mismo mecanismo HMAC que
// `src/lib/auth/sesion.ts` (secretaría), pero con un secreto y un payload
// propios (clienteId) — sesiones completamente independientes (research.md §3).

export const COOKIE_SESION_CLIENTE = 'citaclara_sesion_cliente';

function secreto(): string {
  const valor = process.env.PORTAL_SESSION_SECRET;
  if (!valor) {
    throw new Error('Falta la variable de entorno PORTAL_SESSION_SECRET.');
  }
  return valor;
}

async function importarClave(): Promise<CryptoKey> {
  const bytes = new TextEncoder().encode(secreto());
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function aHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function firmar(valor: string): Promise<string> {
  const clave = await importarClave();
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(valor));
  return aHex(firma);
}

/** Valor a guardar en la cookie de sesión de cliente: `clienteId.firma` (FR-001). */
export async function crearValorCookieSesionCliente(clienteId: string): Promise<string> {
  const firma = await firmar(clienteId);
  return `${clienteId}.${firma}`;
}

/**
 * Comprueba que el valor de la cookie de sesión de cliente es válido y no ha
 * sido manipulado, y devuelve el `clienteId` si es así.
 */
export async function clienteIdDeSesion(
  valorCookie: string | undefined | null,
): Promise<string | null> {
  if (!valorCookie) return null;
  const separador = valorCookie.lastIndexOf('.');
  if (separador <= 0) return null;

  const clienteId = valorCookie.slice(0, separador);
  const firma = valorCookie.slice(separador + 1);

  const firmaEsperada = await firmar(clienteId);
  if (firma.length !== firmaEsperada.length) return null;

  // Comparación en tiempo constante.
  let diferencia = 0;
  for (let i = 0; i < firma.length; i++) {
    diferencia |= firma.charCodeAt(i) ^ firmaEsperada.charCodeAt(i);
  }
  return diferencia === 0 ? clienteId : null;
}

// Usa Web Crypto (SubtleCrypto), disponible tanto en Node.js como en el
// runtime Edge de Next.js, para que este módulo funcione igual en el
// middleware que en Server Actions/Route Handlers.

export const COOKIE_SESION = 'citaclara_sesion';
const VALOR_SESION = 'secretaria';

function secreto(): string {
  const valor = process.env.SESSION_SECRET;
  if (!valor) {
    throw new Error('Falta la variable de entorno SESSION_SECRET.');
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

/** Valor a guardar en la cookie de sesión de secretaría: `payload.firma` (FR-001). */
export async function crearValorCookieSesion(): Promise<string> {
  const firma = await firmar(VALOR_SESION);
  return `${VALOR_SESION}.${firma}`;
}

/** Comprueba que el valor de la cookie de sesión es válido y no ha sido manipulado. */
export async function esSesionValida(valorCookie: string | undefined | null): Promise<boolean> {
  if (!valorCookie) return false;
  const [payload, firma] = valorCookie.split('.');
  if (!payload || !firma || payload !== VALOR_SESION) return false;

  const firmaEsperada = await firmar(payload);
  if (firma.length !== firmaEsperada.length) return false;

  // Comparación en tiempo constante.
  let diferencia = 0;
  for (let i = 0; i < firma.length; i++) {
    diferencia |= firma.charCodeAt(i) ^ firmaEsperada.charCodeAt(i);
  }
  return diferencia === 0;
}

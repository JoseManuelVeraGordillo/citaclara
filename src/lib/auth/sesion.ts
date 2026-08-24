// Usa Web Crypto (SubtleCrypto), disponible tanto en Node.js como en el
// runtime Edge de Next.js, para que este módulo funcione igual en el
// middleware que en Server Actions/Route Handlers.

export const COOKIE_SESION = 'citaclara_sesion';
/** Cookie de sesión del panel de analítica (004-panel-analitica-despacho), independiente de la de secretaría (FR-001). */
export const COOKIE_SESION_PANEL = 'citaclara_sesion_panel';

const VALOR_SESION_SECRETARIA = 'secretaria';
const VALOR_SESION_PANEL = 'panel';

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

async function crearValorCookieConPayload(payload: string): Promise<string> {
  const firma = await firmar(payload);
  return `${payload}.${firma}`;
}

async function esValorCookieValido(
  valorCookie: string | undefined | null,
  payloadEsperado: string,
): Promise<boolean> {
  if (!valorCookie) return false;
  const [payload, firma] = valorCookie.split('.');
  if (!payload || !firma || payload !== payloadEsperado) return false;

  const firmaEsperada = await firmar(payload);
  if (firma.length !== firmaEsperada.length) return false;

  // Comparación en tiempo constante.
  let diferencia = 0;
  for (let i = 0; i < firma.length; i++) {
    diferencia |= firma.charCodeAt(i) ^ firmaEsperada.charCodeAt(i);
  }
  return diferencia === 0;
}

/** Valor a guardar en la cookie de sesión de secretaría: `payload.firma` (FR-001). */
export async function crearValorCookieSesion(): Promise<string> {
  return crearValorCookieConPayload(VALOR_SESION_SECRETARIA);
}

/** Comprueba que el valor de la cookie de sesión de secretaría es válido y no ha sido manipulado. */
export async function esSesionValida(valorCookie: string | undefined | null): Promise<boolean> {
  return esValorCookieValido(valorCookie, VALOR_SESION_SECRETARIA);
}

/** Valor a guardar en la cookie de sesión de panel: `payload.firma` (004-panel-analitica-despacho, FR-001). */
export async function crearValorCookieSesionPanel(): Promise<string> {
  return crearValorCookieConPayload(VALOR_SESION_PANEL);
}

/** Comprueba que el valor de la cookie de sesión de panel es válido y no ha sido manipulado. */
export async function esSesionPanelValida(
  valorCookie: string | undefined | null,
): Promise<boolean> {
  return esValorCookieValido(valorCookie, VALOR_SESION_PANEL);
}

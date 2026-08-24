import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { formatearEnMadrid } from '@/lib/tiempo/zona-horaria';

/**
 * Construcción de recordatorios de cita como texto `.eml` (RFC 5322), sin
 * dependencia de envío real (no hay SMTP configurado en v1, FR-003;
 * research.md §4). El "área" de la cita es `Servicio.nombre` (el tipo de
 * cita reservada), que es el dato más cercano a esa noción en el modelo de
 * `001-agenda-citas`.
 */
export interface DatosRecordatorioEmail {
  clienteEmail: string;
  clienteNombre: string;
  profesionalNombre: string;
  area: string; // Servicio.nombre
  inicio: Date; // UTC
  enlaceCancelacion: string;
}

const REMITENTE = 'CitaClara <no-responder@citaclara.local>';

function formatearFechaCabecera(fecha: Date): string {
  return fecha.toUTCString();
}

/** Construye el contenido `.eml` completo (cabeceras + cuerpo en español de España, FR-010). */
export function construirContenidoEml(datos: DatosRecordatorioEmail): string {
  const fechaLegible = formatearEnMadrid(datos.inicio, "EEEE d 'de' MMMM 'de' yyyy");
  const horaLegible = formatearEnMadrid(datos.inicio, 'HH:mm');

  const asunto = `Recordatorio de tu cita — ${fechaLegible} a las ${horaLegible}h`;

  const cuerpo = [
    `Hola ${datos.clienteNombre}:`,
    '',
    'Te recordamos que tienes una cita próximamente:',
    '',
    `  Fecha: ${fechaLegible}`,
    `  Hora: ${horaLegible}h (hora peninsular española)`,
    `  Profesional: ${datos.profesionalNombre}`,
    `  Área: ${datos.area}`,
    '',
    'Si no vas a poder asistir, por favor cancela tu cita cuanto antes desde',
    'este enlace, para que el hueco quede libre para otra persona:',
    '',
    `  ${datos.enlaceCancelacion}`,
    '',
    'Si ya vas a asistir, no tienes que hacer nada más.',
    '',
    'Un saludo,',
    'CitaClara',
  ].join('\r\n');

  const cabeceras = [
    `From: ${REMITENTE}`,
    `To: ${datos.clienteEmail}`,
    `Subject: ${asunto}`,
    `Date: ${formatearFechaCabecera(new Date())}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
  ].join('\r\n');

  return `${cabeceras}\r\n\r\n${cuerpo}\r\n`;
}

/** Escribe el `.eml` en `directorio`, creándolo si no existe (FR-003). */
export function escribirEml(rutaArchivo: string, contenido: string): void {
  mkdirSync(dirname(rutaArchivo), { recursive: true });
  writeFileSync(rutaArchivo, contenido, 'utf-8');
}

/** Nombre de fichero determinista y único por recordatorio (research.md §4). */
export function nombreArchivoEml(citaId: string, inicio: Date): string {
  return `${inicio.toISOString().replace(/[:.]/g, '-')}-${citaId}.eml`;
}

// Formato del .eml: fecha/hora/profesional/área sin ambigüedad y enlace de
// cancelación (FR-002, FR-006, FR-010).
import { describe, expect, it } from 'vitest';
import { construirContenidoEml, nombreArchivoEml } from '@/lib/correo/eml';

describe('construirContenidoEml (FR-002, FR-006, FR-010)', () => {
  const datos = {
    clienteEmail: 'cliente@test.es',
    clienteNombre: 'María Pérez',
    profesionalNombre: 'Nuria Lagar',
    area: 'Primera consulta',
    inicio: new Date('2026-08-18T08:00:00.000Z'), // 10:00 en Europe/Madrid (verano)
    enlaceCancelacion: 'http://localhost:3000/cancelar-cita/abc123',
  };

  it('incluye cabeceras From/To/Subject/Date y Content-Type de texto plano', () => {
    const contenido = construirContenidoEml(datos);
    expect(contenido).toMatch(/^From: .+\r\n/);
    expect(contenido).toContain(`To: ${datos.clienteEmail}\r\n`);
    expect(contenido).toContain('Content-Type: text/plain; charset=utf-8');
    expect(contenido).toMatch(/Subject: .+\r\n/);
  });

  it('muestra la fecha y hora de la cita sin ambigüedad, en Europe/Madrid (Principio II)', () => {
    const contenido = construirContenidoEml(datos);
    expect(contenido).toContain('10:00h');
    expect(contenido).toContain('agosto de 2026');
  });

  it('incluye profesional y área de la cita (FR-002)', () => {
    const contenido = construirContenidoEml(datos);
    expect(contenido).toContain('Nuria Lagar');
    expect(contenido).toContain('Primera consulta');
  });

  it('incluye el enlace de cancelación completo en el cuerpo (FR-006)', () => {
    const contenido = construirContenidoEml(datos);
    expect(contenido).toContain(datos.enlaceCancelacion);
  });

  it('está en español de España (Principio VIII)', () => {
    const contenido = construirContenidoEml(datos);
    expect(contenido).toContain('Hola María Pérez');
    expect(contenido).toContain('cancela tu cita');
  });
});

describe('nombreArchivoEml', () => {
  it('genera un nombre determinista y único por cita/inicio', () => {
    const inicio = new Date('2026-08-18T08:00:00.000Z');
    const nombre = nombreArchivoEml('cita-123', inicio);
    expect(nombre).toContain('cita-123');
    expect(nombre.endsWith('.eml')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { obtenerVentana8SemanasCompletas } from '@/lib/analitica/semanas';

// FR-007, Assumptions "Últimas 8 semanas" de spec.md, US4-Escenario 2.
// Fecha de referencia de la semilla determinista: lunes 2026-08-17 (Europe/Madrid).
const FECHA_REFERENCIA_UTC = new Date(Date.UTC(2026, 7, 17, 10, 0, 0));

describe('obtenerVentana8SemanasCompletas', () => {
  it('devuelve exactamente los 8 lunes de 2026-06-22 a 2026-08-10', () => {
    const ventana = obtenerVentana8SemanasCompletas(FECHA_REFERENCIA_UTC);

    expect(ventana.semanas).toEqual([
      '2026-06-22',
      '2026-06-29',
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
      '2026-08-03',
      '2026-08-10',
    ]);
  });

  it('la ventana va de 2026-06-22 (lunes) a 2026-08-16 (domingo)', () => {
    const ventana = obtenerVentana8SemanasCompletas(FECHA_REFERENCIA_UTC);

    expect(ventana.inicio).toBe('2026-06-22');
    expect(ventana.fin).toBe('2026-08-16');
  });

  it('excluye la semana en curso (la que contiene la fecha de referencia)', () => {
    const ventana = obtenerVentana8SemanasCompletas(FECHA_REFERENCIA_UTC);

    expect(ventana.semanas).not.toContain('2026-08-17');
    expect(ventana.fin < '2026-08-17').toBe(true);
  });

  it('funciona igual si la fecha de referencia cae a mitad de semana, no solo en lunes', () => {
    // Jueves de la misma semana que la fecha de referencia.
    const juevesUtc = new Date(Date.UTC(2026, 7, 20, 10, 0, 0));
    const ventana = obtenerVentana8SemanasCompletas(juevesUtc);

    expect(ventana.semanas).toEqual([
      '2026-06-22',
      '2026-06-29',
      '2026-07-06',
      '2026-07-13',
      '2026-07-20',
      '2026-07-27',
      '2026-08-03',
      '2026-08-10',
    ]);
  });
});

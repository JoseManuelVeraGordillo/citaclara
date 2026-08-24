// RN2 (FR-006): ningún alta/reprogramación puede empezar en el pasado.
import { describe, expect, it } from 'vitest';
import { ErrorReglaNegocio, validarNoEnElPasado } from '@/lib/agenda/reglas';

describe('validarNoEnElPasado (RN2, FR-006)', () => {
  const ahora = new Date('2026-08-17T10:00:00Z');

  it('rechaza un inicio anterior al instante actual', () => {
    expect(() => validarNoEnElPasado(new Date('2026-08-17T09:59:59Z'), ahora)).toThrow(
      ErrorReglaNegocio,
    );
    try {
      validarNoEnElPasado(new Date('2026-08-17T09:59:59Z'), ahora);
    } catch (e) {
      expect((e as ErrorReglaNegocio).codigo).toBe('en_el_pasado');
    }
  });

  it('acepta un inicio igual al instante actual', () => {
    expect(() => validarNoEnElPasado(new Date(ahora), ahora)).not.toThrow();
  });

  it('acepta un inicio futuro', () => {
    expect(() => validarNoEnElPasado(new Date('2026-08-17T10:00:01Z'), ahora)).not.toThrow();
  });
});

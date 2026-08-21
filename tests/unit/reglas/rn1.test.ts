// RN1 (Principio III, FR-004): cero solape de horario por profesional.
import { describe, expect, it } from 'vitest';
import {
  ErrorReglaNegocio,
  esViolacionRN1,
  traducirErrorEscrituraCita,
  validarSinSolapeAplicacion,
  type IntervaloCita,
} from '@/lib/agenda/reglas';

function fecha(iso: string): Date {
  return new Date(iso);
}

describe('validarSinSolapeAplicacion (RN1, FR-004)', () => {
  const citaExistente: IntervaloCita = {
    id: 'c1',
    inicio: fecha('2026-08-17T09:00:00Z'),
    fin: fecha('2026-08-17T09:30:00Z'),
    estado: 'reservada',
  };

  it('rechaza un intervalo que se solapa parcialmente con una cita reservada', () => {
    expect(() =>
      validarSinSolapeAplicacion(
        [citaExistente],
        fecha('2026-08-17T09:15:00Z'),
        fecha('2026-08-17T09:45:00Z'),
      ),
    ).toThrow(ErrorReglaNegocio);
  });

  it('rechaza un intervalo idéntico (mismo hueco exacto)', () => {
    expect(() =>
      validarSinSolapeAplicacion(
        [citaExistente],
        fecha('2026-08-17T09:00:00Z'),
        fecha('2026-08-17T09:30:00Z'),
      ),
    ).toThrow(/solapa/);
  });

  it('permite un intervalo contiguo que empieza justo cuando termina el anterior', () => {
    expect(() =>
      validarSinSolapeAplicacion(
        [citaExistente],
        fecha('2026-08-17T09:30:00Z'),
        fecha('2026-08-17T10:00:00Z'),
      ),
    ).not.toThrow();
  });

  it('ignora citas canceladas o no asistidas al comprobar solape', () => {
    const cancelada: IntervaloCita = { ...citaExistente, estado: 'cancelada' };
    expect(() =>
      validarSinSolapeAplicacion(
        [cancelada],
        fecha('2026-08-17T09:00:00Z'),
        fecha('2026-08-17T09:30:00Z'),
      ),
    ).not.toThrow();
  });

  it('excluye la propia cita al reprogramar (excluirCitaId)', () => {
    expect(() =>
      validarSinSolapeAplicacion(
        [citaExistente],
        fecha('2026-08-17T09:00:00Z'),
        fecha('2026-08-17T09:30:00Z'),
        'c1',
      ),
    ).not.toThrow();
  });
});

describe('traducirErrorEscrituraCita (traducción del error EXCLUDE de PostgreSQL, FR-005)', () => {
  it('traduce una violación de la restricción EXCLUDE a código "solape"', () => {
    const errorPostgres = {
      message:
        'conflicting key value violates exclusion constraint "citas_sin_solape_por_profesional"',
    };
    expect(esViolacionRN1(errorPostgres)).toBe(true);
    expect(() => traducirErrorEscrituraCita(errorPostgres)).toThrow(ErrorReglaNegocio);
    try {
      traducirErrorEscrituraCita(errorPostgres);
    } catch (e) {
      expect((e as ErrorReglaNegocio).codigo).toBe('solape');
    }
  });

  it('relanza cualquier otro error sin modificarlo', () => {
    const otroError = new Error('fallo de conexión inesperado');
    expect(esViolacionRN1(otroError)).toBe(false);
    expect(() => traducirErrorEscrituraCita(otroError)).toThrow(otroError);
  });
});

// Máquina de estados de Cita: transiciones válidas desde `reservada` e
// inmutabilidad de estados finales (FR-009, FR-010).
import { describe, expect, it } from 'vitest';
import { ErrorReglaNegocio, validarTransicionEstado } from '@/lib/agenda/reglas';

describe('validarTransicionEstado (FR-009, FR-010)', () => {
  it('permite completar, cancelar o marcar no asistida una cita reservada', () => {
    expect(() => validarTransicionEstado('reservada', 'completada')).not.toThrow();
    expect(() => validarTransicionEstado('reservada', 'cancelada')).not.toThrow();
    expect(() => validarTransicionEstado('reservada', 'no_asistida')).not.toThrow();
  });

  it.each(['completada', 'cancelada', 'no_asistida'] as const)(
    'rechaza cualquier transición desde el estado final "%s" (FR-009)',
    (estadoFinal) => {
      expect(() => validarTransicionEstado(estadoFinal, 'completada')).toThrow(ErrorReglaNegocio);
      try {
        validarTransicionEstado(estadoFinal, 'no_asistida');
      } catch (e) {
        expect((e as ErrorReglaNegocio).codigo).toBe('estado_final_inmutable');
      }
    },
  );

  it('no_asistida solo es alcanzable desde reservada, nunca desde completada/cancelada (Edge Case)', () => {
    expect(() => validarTransicionEstado('completada', 'no_asistida')).toThrow(ErrorReglaNegocio);
    expect(() => validarTransicionEstado('cancelada', 'no_asistida')).toThrow(ErrorReglaNegocio);
  });
});

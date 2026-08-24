// Validación de cancelación desde el portal (FR-005, FR-006, Edge Case de pertenencia).
import { describe, expect, it } from 'vitest';
import { ErrorCancelacion, validarPuedeCancelar } from '@/lib/portal/validaciones';

describe('validarPuedeCancelar (FR-005, FR-006)', () => {
  const ahora = new Date('2026-08-24T10:00:00Z');
  const clienteId = 'cliente-1';

  function cita(overrides: Partial<Parameters<typeof validarPuedeCancelar>[0]> = {}) {
    return {
      clienteId,
      estado: 'reservada' as const,
      inicio: new Date('2026-08-26T10:00:00Z'), // 2 días después: dentro de plazo
      ...overrides,
    };
  }

  it('rechaza una cita que no pertenece al cliente de la sesión', () => {
    expect(() => validarPuedeCancelar(cita({ clienteId: 'otro-cliente' }), clienteId, ahora)).toThrow(
      ErrorCancelacion,
    );
    try {
      validarPuedeCancelar(cita({ clienteId: 'otro-cliente' }), clienteId, ahora);
    } catch (e) {
      expect((e as ErrorCancelacion).codigo).toBe('cita_no_es_del_cliente');
    }
  });

  it('rechaza una cita que ya no está reservada', () => {
    expect(() => validarPuedeCancelar(cita({ estado: 'completada' }), clienteId, ahora)).toThrow(
      ErrorCancelacion,
    );
    try {
      validarPuedeCancelar(cita({ estado: 'completada' }), clienteId, ahora);
    } catch (e) {
      expect((e as ErrorCancelacion).codigo).toBe('cita_no_reservada');
    }
  });

  it('rechaza una cita con menos de 24 horas de antelación', () => {
    const inicio = new Date('2026-08-24T20:00:00Z'); // 10h después de "ahora"
    expect(() => validarPuedeCancelar(cita({ inicio }), clienteId, ahora)).toThrow(ErrorCancelacion);
    try {
      validarPuedeCancelar(cita({ inicio }), clienteId, ahora);
    } catch (e) {
      expect((e as ErrorCancelacion).codigo).toBe('fuera_de_plazo');
    }
  });

  it('acepta exactamente 24 horas de antelación', () => {
    const inicio = new Date('2026-08-25T10:00:00Z');
    expect(() => validarPuedeCancelar(cita({ inicio }), clienteId, ahora)).not.toThrow();
  });

  it('acepta una cita propia, reservada, con 24h+ de antelación', () => {
    expect(() => validarPuedeCancelar(cita(), clienteId, ahora)).not.toThrow();
  });
});

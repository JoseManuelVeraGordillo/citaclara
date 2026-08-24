// Token de acceso de un solo uso (FR-001, FR-001a).
import { describe, expect, it } from 'vitest';
import {
  ErrorAcceso,
  calcularExpiracion,
  hashToken,
  validarSolicitudVigente,
} from '@/lib/portal/acceso';

describe('calcularExpiracion (FR-001a)', () => {
  it('expira 15 minutos después de la creación', () => {
    const creadoEn = new Date('2026-08-24T10:00:00Z');
    expect(calcularExpiracion(creadoEn).toISOString()).toBe('2026-08-24T10:15:00.000Z');
  });
});

describe('hashToken', () => {
  it('es determinista para el mismo token', () => {
    expect(hashToken('abc123')).toBe(hashToken('abc123'));
  });

  it('produce hashes distintos para tokens distintos', () => {
    expect(hashToken('abc123')).not.toBe(hashToken('xyz789'));
  });
});

describe('validarSolicitudVigente (FR-001a)', () => {
  const ahora = new Date('2026-08-24T10:20:00Z');

  it('rechaza un token caducado', () => {
    const solicitud = { expiraEn: new Date('2026-08-24T10:15:00Z'), usadoEn: null };
    expect(() => validarSolicitudVigente(solicitud, ahora)).toThrow(ErrorAcceso);
    try {
      validarSolicitudVigente(solicitud, ahora);
    } catch (e) {
      expect((e as ErrorAcceso).codigo).toBe('token_expirado');
    }
  });

  it('rechaza un token ya usado', () => {
    const solicitud = {
      expiraEn: new Date('2026-08-24T10:30:00Z'),
      usadoEn: new Date('2026-08-24T10:05:00Z'),
    };
    expect(() => validarSolicitudVigente(solicitud, ahora)).toThrow(ErrorAcceso);
    try {
      validarSolicitudVigente(solicitud, ahora);
    } catch (e) {
      expect((e as ErrorAcceso).codigo).toBe('token_ya_usado');
    }
  });

  it('acepta un token vigente y no usado', () => {
    const solicitud = { expiraEn: new Date('2026-08-24T10:30:00Z'), usadoEn: null };
    expect(() => validarSolicitudVigente(solicitud, ahora)).not.toThrow();
  });
});

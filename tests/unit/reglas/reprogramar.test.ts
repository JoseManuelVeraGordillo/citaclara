// Reprogramación: recálculo de fin y reaplicación de RN1/RN2/horario laboral
// (FR-011, FR-012, US3).
import { describe, expect, it } from 'vitest';
import {
  ErrorReglaNegocio,
  validarCitaReprogramable,
  validarHorarioLaboral,
  validarNoEnElPasado,
  validarSinSolapeAplicacion,
  type IntervaloCita,
} from '@/lib/agenda/reglas';
import { horaMadridAUtc } from '@/lib/tiempo/zona-horaria';

describe('validarCitaReprogramable (FR-012)', () => {
  it('permite reprogramar una cita en estado reservada', () => {
    expect(() => validarCitaReprogramable('reservada')).not.toThrow();
  });

  it.each(['completada', 'cancelada', 'no_asistida'] as const)(
    'rechaza reprogramar una cita en estado "%s" con código cita_no_reservada',
    (estado) => {
      expect(() => validarCitaReprogramable(estado)).toThrow(ErrorReglaNegocio);
      try {
        validarCitaReprogramable(estado);
      } catch (e) {
        expect((e as ErrorReglaNegocio).codigo).toBe('cita_no_reservada');
      }
    },
  );
});

describe('reprogramación: recálculo de fin y reaplicación de reglas', () => {
  const otraCitaDelProfesional: IntervaloCita = {
    id: 'otra',
    inicio: horaMadridAUtc('2026-08-17', 9, 0),
    fin: horaMadridAUtc('2026-08-17', 9, 30),
    estado: 'reservada',
  };

  it('recalcula el fin como nuevoInicio + duración del servicio', () => {
    const nuevoInicio = horaMadridAUtc('2026-08-17', 11, 0);
    const duracionMinutos = 45;
    const nuevoFin = new Date(nuevoInicio.getTime() + duracionMinutos * 60000);
    expect(nuevoFin.toISOString()).toBe(horaMadridAUtc('2026-08-17', 11, 45).toISOString());
  });

  it('RN1 se reaplica: rechaza mover la cita a un hueco que solapa con otra cita del profesional', () => {
    const nuevoInicio = horaMadridAUtc('2026-08-17', 9, 15);
    const nuevoFin = horaMadridAUtc('2026-08-17', 9, 45);
    expect(() =>
      validarSinSolapeAplicacion([otraCitaDelProfesional], nuevoInicio, nuevoFin, 'cita-a-mover'),
    ).toThrow(/solapa/);
  });

  it('RN1 permite mover la cita a un hueco libre distinto, excluyéndose a sí misma', () => {
    const nuevoInicio = horaMadridAUtc('2026-08-17', 10, 0);
    const nuevoFin = horaMadridAUtc('2026-08-17', 10, 30);
    expect(() =>
      validarSinSolapeAplicacion([otraCitaDelProfesional], nuevoInicio, nuevoFin, 'cita-a-mover'),
    ).not.toThrow();
  });

  it('RN2 se reaplica: rechaza reprogramar a un inicio pasado', () => {
    const ahora = horaMadridAUtc('2026-08-17', 10, 0);
    const nuevoInicioPasado = horaMadridAUtc('2026-08-17', 9, 0);
    expect(() => validarNoEnElPasado(nuevoInicioPasado, ahora)).toThrow(ErrorReglaNegocio);
  });

  it('horario laboral se reaplica: rechaza reprogramar fuera del horario laboral', () => {
    const nuevoInicio = horaMadridAUtc('2026-08-17', 20, 30);
    const nuevoFin = horaMadridAUtc('2026-08-17', 21, 0);
    expect(() => validarHorarioLaboral(nuevoInicio, nuevoFin)).toThrow(ErrorReglaNegocio);
  });
});

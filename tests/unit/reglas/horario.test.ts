// Horario laboral (FR-007) y huecos libres/ocupados en tiempo continuo (FR-002, FR-003).
import { describe, expect, it } from 'vitest';
import { calcularHuecos, estaEnHorarioLaboral, tramosLaboralesDelDia } from '@/lib/agenda/horario';
import { horaMadridAUtc } from '@/lib/tiempo/zona-horaria';

describe('tramosLaboralesDelDia (FR-007)', () => {
  it('devuelve dos tramos (09:00–14:00 y 16:00–20:00 Europe/Madrid) en un día laborable', () => {
    const tramos = tramosLaboralesDelDia('2026-08-17'); // lunes
    expect(tramos).toHaveLength(2);
    expect(tramos[0].inicio.toISOString()).toBe(horaMadridAUtc('2026-08-17', 9, 0).toISOString());
    expect(tramos[0].fin.toISOString()).toBe(horaMadridAUtc('2026-08-17', 14, 0).toISOString());
    expect(tramos[1].inicio.toISOString()).toBe(horaMadridAUtc('2026-08-17', 16, 0).toISOString());
    expect(tramos[1].fin.toISOString()).toBe(horaMadridAUtc('2026-08-17', 20, 0).toISOString());
  });

  it('no devuelve tramos en sábado ni domingo', () => {
    expect(tramosLaboralesDelDia('2026-08-22')).toHaveLength(0); // sábado
    expect(tramosLaboralesDelDia('2026-08-23')).toHaveLength(0); // domingo
  });
});

describe('estaEnHorarioLaboral (FR-007)', () => {
  it('acepta un intervalo íntegramente dentro del tramo de mañana', () => {
    const inicio = horaMadridAUtc('2026-08-17', 9, 30);
    const fin = horaMadridAUtc('2026-08-17', 10, 0);
    expect(estaEnHorarioLaboral(inicio, fin)).toBe(true);
  });

  it('rechaza un intervalo que termina fuera del tramo de mañana (13:45–14:15)', () => {
    const inicio = horaMadridAUtc('2026-08-17', 13, 45);
    const fin = horaMadridAUtc('2026-08-17', 14, 15);
    expect(estaEnHorarioLaboral(inicio, fin)).toBe(false);
  });

  it('rechaza un intervalo en el hueco entre tramos (14:00–16:00)', () => {
    const inicio = horaMadridAUtc('2026-08-17', 14, 30);
    const fin = horaMadridAUtc('2026-08-17', 15, 0);
    expect(estaEnHorarioLaboral(inicio, fin)).toBe(false);
  });

  it('rechaza un intervalo en fin de semana', () => {
    const inicio = horaMadridAUtc('2026-08-22', 10, 0);
    const fin = horaMadridAUtc('2026-08-22', 10, 30);
    expect(estaEnHorarioLaboral(inicio, fin)).toBe(false);
  });
});

describe('calcularHuecos (FR-002, FR-003)', () => {
  it('devuelve el tramo completo como un único hueco libre cuando no hay citas', () => {
    const huecos = calcularHuecos('2026-08-17', []);
    expect(huecos).toHaveLength(2);
    expect(huecos.every((h) => h.estado === 'libre')).toBe(true);
  });

  it('divide el tramo en libre/ocupado/libre alrededor de una cita', () => {
    const inicio = horaMadridAUtc('2026-08-17', 9, 30);
    const fin = horaMadridAUtc('2026-08-17', 10, 0);
    const huecos = calcularHuecos('2026-08-17', [
      {
        id: 'c1',
        inicio,
        fin,
        clienteNombre: 'Laura García',
        servicioNombre: 'Primera consulta',
        estado: 'reservada',
      },
    ]);

    const tramoManana = huecos.filter(
      (h) =>
        h.inicio >= horaMadridAUtc('2026-08-17', 9, 0) &&
        h.fin <= horaMadridAUtc('2026-08-17', 14, 0),
    );
    expect(tramoManana.map((h) => h.estado)).toEqual(['libre', 'ocupado', 'libre']);
    expect(tramoManana[1].cita?.id).toBe('c1');
  });

  it('ignora citas canceladas o no asistidas (el hueco vuelve a mostrarse libre)', () => {
    const inicio = horaMadridAUtc('2026-08-17', 9, 30);
    const fin = horaMadridAUtc('2026-08-17', 10, 0);
    const huecos = calcularHuecos('2026-08-17', [
      {
        id: 'c1',
        inicio,
        fin,
        clienteNombre: 'Laura García',
        servicioNombre: 'Primera consulta',
        estado: 'cancelada',
      },
    ]);
    expect(huecos.every((h) => h.estado === 'libre')).toBe(true);
  });
});

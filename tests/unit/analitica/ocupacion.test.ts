import { describe, expect, it } from 'vitest';
import { calcularOcupacionSemanal, type CitaParaAnalitica } from '@/lib/analitica/metricas';
import { obtenerVentana8SemanasCompletas } from '@/lib/analitica/semanas';

const FECHA_REFERENCIA_UTC = new Date(Date.UTC(2026, 7, 17, 10, 0, 0));
const VENTANA = obtenerVentana8SemanasCompletas(FECHA_REFERENCIA_UTC);
const PRIMERA_SEMANA = VENTANA.semanas[0]; // 2026-06-22, lunes

const PROFESIONALES = [
  { id: 'prof-1', nombre: 'Nuria Lagar', activo: true },
  { id: 'prof-2', nombre: 'David Rayo', activo: false },
];

function cita(overrides: Partial<CitaParaAnalitica>): CitaParaAnalitica {
  return {
    profesionalId: 'prof-1',
    servicioId: 'srv-1',
    inicio: new Date(`${PRIMERA_SEMANA}T09:00:00+02:00`), // lunes 09:00 Madrid (CEST)
    fin: new Date(`${PRIMERA_SEMANA}T09:30:00+02:00`),
    estado: 'reservada',
    precioCentimos: 0,
    ...overrides,
  };
}

describe('calcularOcupacionSemanal (FR-002, US2)', () => {
  it('cuenta reservada y completada como ocupado, misma definición que calcularHuecos', () => {
    const citas = [
      cita({ profesionalId: 'prof-1', estado: 'reservada' }),
      cita({
        profesionalId: 'prof-1',
        estado: 'completada',
        inicio: new Date(`${PRIMERA_SEMANA}T10:00:00+02:00`),
        fin: new Date(`${PRIMERA_SEMANA}T10:30:00+02:00`),
      }),
    ];

    const resultado = calcularOcupacionSemanal(PROFESIONALES, citas, VENTANA);
    const semanaNuria = resultado.find((r) => r.profesionalId === 'prof-1')?.semanas[0];

    expect(semanaNuria?.minutosOcupados).toBe(60);
  });

  it('cancelada y no_asistida NO cuentan como ocupado (liberan el hueco)', () => {
    const citas = [
      cita({ profesionalId: 'prof-1', estado: 'cancelada' }),
      cita({ profesionalId: 'prof-1', estado: 'no_asistida' }),
    ];

    const resultado = calcularOcupacionSemanal(PROFESIONALES, citas, VENTANA);
    const semanaNuria = resultado.find((r) => r.profesionalId === 'prof-1')?.semanas[0];

    expect(semanaNuria?.minutosOcupados).toBe(0);
    expect(semanaNuria?.porcentaje).toBe(0);
  });

  it('un profesional sin citas en una semana muestra 0% sin error (FR-009)', () => {
    const resultado = calcularOcupacionSemanal(PROFESIONALES, [], VENTANA);

    for (const profesional of resultado) {
      for (const semana of profesional.semanas) {
        expect(semana.porcentaje).toBe(0);
        expect(Number.isFinite(semana.porcentaje)).toBe(true);
      }
    }
  });

  it('la capacidad semanal es 2700 minutos (5 días × 9h laborales) para una semana laboral completa', () => {
    const resultado = calcularOcupacionSemanal(PROFESIONALES, [], VENTANA);
    const semana = resultado[0].semanas[0];

    expect(semana.minutosDisponibles).toBe(2700);
  });

  it('conserva el estado activo/inactivo de cada profesional (Edge Case "profesional dado de baja")', () => {
    const resultado = calcularOcupacionSemanal(PROFESIONALES, [], VENTANA);

    expect(resultado.find((r) => r.profesionalId === 'prof-1')?.activo).toBe(true);
    expect(resultado.find((r) => r.profesionalId === 'prof-2')?.activo).toBe(false);
  });
});

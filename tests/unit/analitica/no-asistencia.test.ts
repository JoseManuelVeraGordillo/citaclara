import { describe, expect, it } from 'vitest';
import { calcularTasaNoAsistencia, type CitaParaAnalitica } from '@/lib/analitica/metricas';

const PROFESIONALES = [
  { id: 'prof-1', nombre: 'Nuria Lagar', activo: true },
  { id: 'prof-2', nombre: 'Jose Lagar', activo: true },
];

function cita(overrides: Partial<CitaParaAnalitica>): CitaParaAnalitica {
  return {
    profesionalId: 'prof-1',
    servicioId: 'srv-1',
    inicio: new Date('2026-06-22T09:00:00Z'),
    fin: new Date('2026-06-22T09:30:00Z'),
    estado: 'completada',
    precioCentimos: 0,
    ...overrides,
  };
}

describe('calcularTasaNoAsistencia (FR-003, US3)', () => {
  it('el denominador incluye completada + cancelada + no_asistida (Assumptions de spec.md)', () => {
    const citas = [
      cita({ profesionalId: 'prof-1', estado: 'completada' }),
      cita({ profesionalId: 'prof-1', estado: 'cancelada' }),
      cita({ profesionalId: 'prof-1', estado: 'no_asistida' }),
    ];

    const resultado = calcularTasaNoAsistencia(PROFESIONALES, citas);
    const nuria = resultado.find((r) => r.profesionalId === 'prof-1');

    expect(nuria?.totalHistoricas).toBe(3);
    expect(nuria?.totalNoAsistidas).toBe(1);
    expect(nuria?.porcentaje).toBeCloseTo(33.33, 2);
  });

  it('excluye citas futuras reservada del cálculo (FR-010)', () => {
    const citas = [
      cita({ profesionalId: 'prof-1', estado: 'completada' }),
      cita({ profesionalId: 'prof-1', estado: 'reservada' }),
    ];

    const resultado = calcularTasaNoAsistencia(PROFESIONALES, citas);
    const nuria = resultado.find((r) => r.profesionalId === 'prof-1');

    expect(nuria?.totalHistoricas).toBe(1);
  });

  it('un profesional sin citas históricas muestra porcentaje null, no 0% ni error (FR-009)', () => {
    const resultado = calcularTasaNoAsistencia(PROFESIONALES, []);

    expect(resultado.every((r) => r.porcentaje === null)).toBe(true);
  });

  it('reproduce las cifras reales de la semilla (42 no_asistida de 387 históricas de Nuria Lagar)', () => {
    const citas: CitaParaAnalitica[] = [
      ...Array.from({ length: 42 }, () => cita({ profesionalId: 'prof-1', estado: 'no_asistida' })),
      ...Array.from({ length: 31 }, () => cita({ profesionalId: 'prof-1', estado: 'cancelada' })),
      ...Array.from({ length: 314 }, () => cita({ profesionalId: 'prof-1', estado: 'completada' })),
    ];

    const resultado = calcularTasaNoAsistencia(PROFESIONALES, citas);
    const nuria = resultado.find((r) => r.profesionalId === 'prof-1');

    expect(nuria?.totalHistoricas).toBe(387);
    expect(nuria?.porcentaje).toBeCloseTo(10.85, 2);
  });
});

import { describe, expect, it } from 'vitest';
import { calcularEvolucionSemanal, type CitaParaAnalitica } from '@/lib/analitica/metricas';
import { obtenerVentana8SemanasCompletas } from '@/lib/analitica/semanas';

const FECHA_REFERENCIA_UTC = new Date(Date.UTC(2026, 7, 17, 10, 0, 0));
const VENTANA = obtenerVentana8SemanasCompletas(FECHA_REFERENCIA_UTC);
const PRIMERA_SEMANA = VENTANA.semanas[0]; // 2026-06-22

const PROFESIONALES = [
  { id: 'prof-1', nombre: 'Nuria Lagar', activo: true },
  { id: 'prof-2', nombre: 'David Rayo', activo: true },
];

function cita(overrides: Partial<CitaParaAnalitica>): CitaParaAnalitica {
  return {
    profesionalId: 'prof-1',
    servicioId: 'srv-1',
    inicio: new Date(`${PRIMERA_SEMANA}T09:00:00+02:00`),
    fin: new Date(`${PRIMERA_SEMANA}T09:30:00+02:00`),
    estado: 'completada',
    precioCentimos: 6000,
    ...overrides,
  };
}

describe('calcularEvolucionSemanal (FR-005, US4)', () => {
  it('desglosa por profesional, no agregado del despacho (Clarification 2026-08-24)', () => {
    const citas = [
      cita({ profesionalId: 'prof-1' }),
      cita({ profesionalId: 'prof-2' }),
    ];

    const resultado = calcularEvolucionSemanal(PROFESIONALES, citas, VENTANA);

    expect(resultado).toHaveLength(2);
    expect(resultado.find((r) => r.profesionalId === 'prof-1')?.semanas[0].totalCitas).toBe(1);
    expect(resultado.find((r) => r.profesionalId === 'prof-2')?.semanas[0].totalCitas).toBe(1);
  });

  it('totalCitas cuenta cualquier estado, ingresosCentimos solo completada', () => {
    const citas = [
      cita({ profesionalId: 'prof-1', estado: 'completada', precioCentimos: 6000 }),
      cita({ profesionalId: 'prof-1', estado: 'reservada', precioCentimos: 6000 }),
      cita({ profesionalId: 'prof-1', estado: 'cancelada', precioCentimos: 6000 }),
    ];

    const resultado = calcularEvolucionSemanal(PROFESIONALES, citas, VENTANA);
    const semana = resultado.find((r) => r.profesionalId === 'prof-1')?.semanas[0];

    expect(semana?.totalCitas).toBe(3);
    expect(semana?.ingresosCentimos).toBe(6000);
  });

  it('una semana sin citas de un profesional muestra 0 citas / 0,00 € sin romper la serie (FR-009)', () => {
    const resultado = calcularEvolucionSemanal(PROFESIONALES, [], VENTANA);

    for (const profesional of resultado) {
      expect(profesional.semanas).toHaveLength(8);
      for (const semana of profesional.semanas) {
        expect(semana.totalCitas).toBe(0);
        expect(semana.ingresosCentimos).toBe(0);
      }
    }
  });

  it('ignora citas fuera de la ventana de 8 semanas', () => {
    const citas = [cita({ profesionalId: 'prof-1', inicio: new Date('2020-01-01T09:00:00Z') })];

    const resultado = calcularEvolucionSemanal(PROFESIONALES, citas, VENTANA);
    const totalCitasVentana = resultado
      .find((r) => r.profesionalId === 'prof-1')
      ?.semanas.reduce((acc, s) => acc + s.totalCitas, 0);

    expect(totalCitasVentana).toBe(0);
  });
});

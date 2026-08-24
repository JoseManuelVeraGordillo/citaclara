import { describe, expect, it } from 'vitest';
import { calcularIngresosPorServicio, type CitaParaAnalitica } from '@/lib/analitica/metricas';

const SERVICIOS = [
  { id: 'srv-consulta', nombre: 'Primera consulta' },
  { id: 'srv-contrato', nombre: 'Redacción de contrato' },
  { id: 'srv-gestion', nombre: 'Gestión administrativa' },
];

function cita(overrides: Partial<CitaParaAnalitica>): CitaParaAnalitica {
  return {
    profesionalId: 'prof-1',
    servicioId: 'srv-consulta',
    inicio: new Date('2026-06-22T09:00:00Z'),
    fin: new Date('2026-06-22T09:30:00Z'),
    estado: 'completada',
    precioCentimos: 6000,
    ...overrides,
  };
}

describe('calcularIngresosPorServicio (FR-004, US1)', () => {
  it('suma precioCentimos solo de citas completada, agrupado por servicio', () => {
    const citas = [
      cita({ servicioId: 'srv-consulta', estado: 'completada', precioCentimos: 6000 }),
      cita({ servicioId: 'srv-consulta', estado: 'completada', precioCentimos: 6000 }),
      cita({ servicioId: 'srv-contrato', estado: 'completada', precioCentimos: 12000 }),
    ];

    const resultado = calcularIngresosPorServicio(SERVICIOS, citas);

    expect(resultado.find((r) => r.servicioId === 'srv-consulta')?.totalCentimos).toBe(12000);
    expect(resultado.find((r) => r.servicioId === 'srv-contrato')?.totalCentimos).toBe(12000);
  });

  it('excluye citas reservada, cancelada y no_asistida del importe (Edge Case)', () => {
    const citas = [
      cita({ servicioId: 'srv-consulta', estado: 'reservada' }),
      cita({ servicioId: 'srv-consulta', estado: 'cancelada' }),
      cita({ servicioId: 'srv-consulta', estado: 'no_asistida' }),
    ];

    const resultado = calcularIngresosPorServicio(SERVICIOS, citas);

    expect(resultado.find((r) => r.servicioId === 'srv-consulta')?.totalCentimos).toBe(0);
  });

  it('un servicio sin citas completadas aparece con 0 en vez de desaparecer (FR-009)', () => {
    const resultado = calcularIngresosPorServicio(SERVICIOS, []);

    expect(resultado).toHaveLength(SERVICIOS.length);
    expect(resultado.every((r) => r.totalCentimos === 0)).toBe(true);
  });

  it('las cifras cuadran al céntimo, sin redondeo (Principio "Los Números No Admiten Creatividad")', () => {
    const citas = [
      cita({ servicioId: 'srv-gestion', estado: 'completada', precioCentimos: 5000 }),
      cita({ servicioId: 'srv-gestion', estado: 'completada', precioCentimos: 4999 }),
    ];

    const resultado = calcularIngresosPorServicio(SERVICIOS, citas);

    expect(resultado.find((r) => r.servicioId === 'srv-gestion')?.totalCentimos).toBe(9999);
  });
});

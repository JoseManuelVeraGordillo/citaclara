// Ventana 24-48h, exclusión de citas no reservadas, dedupe y detección de
// cliente sin email (FR-001, FR-004, FR-005, FR-009, FR-012).
import { describe, expect, it } from 'vitest';
import { seleccionarCitasParaRecordar, type CitaCandidata } from '@/lib/recordatorios/seleccion';

const AHORA = new Date('2026-08-15T09:00:00.000Z');

function horasDespues(horas: number): string {
  return new Date(AHORA.getTime() + horas * 60 * 60 * 1000).toISOString();
}

function citaBase(overrides: Partial<CitaCandidata> = {}): CitaCandidata {
  return {
    id: 'cita-1',
    inicio: horasDespues(30),
    estado: 'reservada',
    clienteEmail: 'cliente@test.es',
    recordatoriosExistentes: [],
    ...overrides,
  };
}

describe('seleccionarCitasParaRecordar (FR-001, FR-004, FR-005, FR-009, FR-012)', () => {
  it('selecciona una cita reservada cuyo inicio cae dentro de la ventana 24-48h', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [citaBase({ inicio: horasDespues(30) })]);
    expect(resultado.aGenerar).toEqual([{ citaId: 'cita-1', conEmail: true }]);
  });

  it('incluye los límites exactos de la ventana (24h y 48h)', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [
      citaBase({ id: 'a', inicio: horasDespues(24) }),
      citaBase({ id: 'b', inicio: horasDespues(48) }),
    ]);
    expect(resultado.aGenerar.map((r) => r.citaId).sort()).toEqual(['a', 'b']);
  });

  it('excluye una cita cuyo inicio cae fuera de la ventana (antes de 24h o después de 48h)', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [
      citaBase({ id: 'muy-cerca', inicio: horasDespues(23.9) }),
      citaBase({ id: 'muy-lejos', inicio: horasDespues(48.1) }),
    ]);
    expect(resultado.aGenerar).toEqual([]);
  });

  it('excluye una cita ya cancelada aunque esté dentro de la ventana (FR-005)', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [
      citaBase({ estado: 'cancelada' }),
    ]);
    expect(resultado.aGenerar).toEqual([]);
  });

  it('no genera un segundo recordatorio si ya existe uno para el mismo inicio (FR-004)', () => {
    const inicio = horasDespues(30);
    const resultado = seleccionarCitasParaRecordar(AHORA, [
      citaBase({ inicio, recordatoriosExistentes: [{ citaInicio: inicio }] }),
    ]);
    expect(resultado.aGenerar).toEqual([]);
  });

  it('sí genera un recordatorio nuevo si el inicio cambió respecto al recordatorio existente (FR-009, reprogramación)', () => {
    const inicioNuevo = horasDespues(30);
    const resultado = seleccionarCitasParaRecordar(AHORA, [
      citaBase({
        inicio: inicioNuevo,
        recordatoriosExistentes: [{ citaInicio: horasDespues(100) }],
      }),
    ]);
    expect(resultado.aGenerar).toEqual([{ citaId: 'cita-1', conEmail: true }]);
  });

  it('marca conEmail=false cuando el cliente no tiene email registrado (FR-012)', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [citaBase({ clienteEmail: '' })]);
    expect(resultado.aGenerar).toEqual([{ citaId: 'cita-1', conEmail: false }]);
  });

  it('trata un email de solo espacios como "sin email" (research.md §6, defensivo)', () => {
    const resultado = seleccionarCitasParaRecordar(AHORA, [citaBase({ clienteEmail: '   ' })]);
    expect(resultado.aGenerar).toEqual([{ citaId: 'cita-1', conEmail: false }]);
  });
});

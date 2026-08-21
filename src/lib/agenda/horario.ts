import { diaSemanaMadrid, horaMadridAUtc } from '@/lib/tiempo/zona-horaria';

/** Horario laboral del despacho: 09:00–14:00 y 16:00–20:00, lunes a viernes, Europe/Madrid (FR-007). */
const TRAMOS_LABORALES = [
  { horaInicio: 9, horaFin: 14 },
  { horaInicio: 16, horaFin: 20 },
] as const;

export interface Tramo {
  inicio: Date;
  fin: Date;
}

/** Tramos laborales (en UTC) de un día concreto; vacío si es fin de semana. */
export function tramosLaboralesDelDia(fechaIso: string): Tramo[] {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fechaReferenciaUtc = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
  const diaSemana = diaSemanaMadrid(fechaReferenciaUtc);
  if (diaSemana > 5) return [];

  return TRAMOS_LABORALES.map((tramo) => ({
    inicio: horaMadridAUtc(fechaIso, tramo.horaInicio, 0),
    fin: horaMadridAUtc(fechaIso, tramo.horaFin, 0),
  }));
}

/** True si `[inicio, fin)` cae íntegramente dentro de un único tramo laboral (FR-007). */
export function estaEnHorarioLaboral(inicio: Date, fin: Date): boolean {
  if (inicio >= fin) return false;
  const tramos = tramosLaboralesDelDia(fechaIsoMadrid(inicio));
  return tramos.some((tramo) => inicio >= tramo.inicio && fin <= tramo.fin);
}

function fechaIsoMadrid(fechaUtc: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(fechaUtc);
}

export interface CitaOcupada {
  id: string;
  inicio: Date;
  fin: Date;
  clienteNombre: string;
  servicioNombre: string;
  estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida';
}

export interface Hueco {
  inicio: Date;
  fin: Date;
  estado: 'libre' | 'ocupado';
  cita?: {
    id: string;
    clienteNombre: string;
    servicioNombre: string;
    estado: 'reservada' | 'completada' | 'cancelada' | 'no_asistida';
  };
}

/**
 * Divide los tramos laborales del día en huecos libres/ocupados en tiempo
 * continuo, a partir de las citas activas (reservada/completada) del
 * profesional ese día (FR-002).
 */
export function calcularHuecos(fechaIso: string, citas: CitaOcupada[]): Hueco[] {
  const tramos = tramosLaboralesDelDia(fechaIso);
  const ocupadas = [...citas]
    .filter((c) => c.estado === 'reservada' || c.estado === 'completada')
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const huecos: Hueco[] = [];

  for (const tramo of tramos) {
    let cursor = tramo.inicio;
    for (const cita of ocupadas) {
      if (cita.fin <= tramo.inicio || cita.inicio >= tramo.fin) continue;
      const inicioCita = cita.inicio < cursor ? cursor : cita.inicio;
      if (inicioCita > cursor) {
        huecos.push({ inicio: cursor, fin: inicioCita, estado: 'libre' });
      }
      const finCita = cita.fin > tramo.fin ? tramo.fin : cita.fin;
      huecos.push({
        inicio: inicioCita,
        fin: finCita,
        estado: 'ocupado',
        cita: {
          id: cita.id,
          clienteNombre: cita.clienteNombre,
          servicioNombre: cita.servicioNombre,
          estado: cita.estado,
        },
      });
      cursor = finCita;
    }
    if (cursor < tramo.fin) {
      huecos.push({ inicio: cursor, fin: tramo.fin, estado: 'libre' });
    }
  }

  return huecos;
}

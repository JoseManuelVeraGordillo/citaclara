export interface Profesional {
  id: string;
  nombre: string;
  especialidad: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  duracionMinutos: number;
  precioCentimos: number;
}

export type EstadoCita = 'reservada' | 'completada' | 'cancelada' | 'no_asistida';

export interface CitaHueco {
  id: string;
  clienteNombre: string;
  servicioNombre: string;
  estado: EstadoCita;
}

export interface Hueco {
  inicio: string; // ISO UTC
  fin: string; // ISO UTC
  estado: 'libre' | 'ocupado';
  cita?: CitaHueco;
}

export interface CitaCancelada {
  id: string;
  inicio: string; // ISO UTC
  clienteNombre: string;
  servicioNombre: string;
  canceladaPor: 'secretaria' | 'cliente' | null;
}

export interface RespuestaAgendaDia {
  profesional: { id: string; nombre: string };
  fecha: string;
  huecos: Hueco[];
  citasCanceladas: CitaCancelada[];
}

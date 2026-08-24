'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cambiarEstadoCita } from '@/lib/agenda/actions';
import { mensajeError } from '@/lib/agenda/mensajes';
import { formatearEnMadrid } from '@/lib/tiempo/zona-horaria';
import type { CitaCancelada, Hueco } from '@/app/agenda/tipos';

const ETIQUETA_ESTADO: Record<string, string> = {
  reservada: 'Reservada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistida: 'No asistida',
};

interface Props {
  huecos: Hueco[];
  citasCanceladas: CitaCancelada[];
  onReservar: (hueco: Hueco) => void;
  onReprogramar: (hueco: Hueco) => void;
  onCambio: () => void;
}

export function VistaHuecos({ huecos, citasCanceladas, onReservar, onReprogramar, onCambio }: Props) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [citaEnCurso, setCitaEnCurso] = useState<string | null>(null);

  function marcarEstado(citaId: string, nuevoEstado: 'completada' | 'cancelada' | 'no_asistida') {
    setError(null);
    setCitaEnCurso(citaId);
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoCita({ citaId, nuevoEstado });
      setCitaEnCurso(null);
      if (!resultado.ok) {
        setError(mensajeError(resultado.codigo, resultado.mensaje));
        return;
      }
      onCambio();
    });
  }

  if (huecos.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay horario laboral este día.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {huecos.map((hueco) => {
              const inicio = formatearEnMadrid(new Date(hueco.inicio), 'HH:mm');
              const fin = formatearEnMadrid(new Date(hueco.fin), 'HH:mm');
              const libre = hueco.estado === 'libre';
              const cita = hueco.cita;
              const estaOcupadoConAcciones = !libre && cita?.estado === 'reservada';

              return (
                <TableRow key={`${hueco.inicio}-${hueco.fin}`}>
                  <TableCell className="whitespace-nowrap font-mono text-sm">
                    {inicio}–{fin}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        libre ? 'secondary' : cita?.estado === 'reservada' ? 'default' : 'outline'
                      }
                    >
                      {libre ? 'Libre' : ETIQUETA_ESTADO[cita?.estado ?? 'reservada']}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cita ? `${cita.clienteNombre} — ${cita.servicioNombre}` : '—'}
                    {cita?.sinRecordatorioEnviado && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-destructive"
                        aria-label={`Sin recordatorio enviado a ${cita.clienteNombre}: falta email`}
                      >
                        Sin recordatorio (falta email)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {libre && (
                      <Button
                        size="sm"
                        aria-label={`Reservar el hueco de ${inicio} a ${fin}`}
                        onClick={() => onReservar(hueco)}
                      >
                        Reservar
                      </Button>
                    )}
                    {estaOcupadoConAcciones && cita && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Reprogramar la cita de ${cita.clienteNombre} a las ${inicio}`}
                          onClick={() => onReprogramar(hueco)}
                        >
                          Reprogramar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Marcar como completada la cita de ${cita.clienteNombre} a las ${inicio}`}
                          disabled={pendiente && citaEnCurso === cita.id}
                          onClick={() => marcarEstado(cita.id, 'completada')}
                        >
                          Completada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Marcar como cancelada la cita de ${cita.clienteNombre} a las ${inicio}`}
                          disabled={pendiente && citaEnCurso === cita.id}
                          onClick={() => marcarEstado(cita.id, 'cancelada')}
                        >
                          Cancelada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Marcar como no asistida la cita de ${cita.clienteNombre} a las ${inicio}`}
                          disabled={pendiente && citaEnCurso === cita.id}
                          onClick={() => marcarEstado(cita.id, 'no_asistida')}
                        >
                          No asistida
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {citasCanceladas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Cancelaciones de este día</h3>
          <ul className="space-y-1">
            {citasCanceladas.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="font-mono">{formatearEnMadrid(new Date(c.inicio), 'HH:mm')}</span>
                <span>
                  {c.clienteNombre} — {c.servicioNombre}
                </span>
                <Badge variant="outline">
                  {c.canceladaPor === 'cliente' ? 'Cancelada por el cliente' : 'Cancelada por secretaría'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

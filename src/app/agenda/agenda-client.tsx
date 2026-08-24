'use client';

import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { VistaHuecos } from '@/app/agenda/components/vista-huecos';
import { FormularioAlta } from '@/app/agenda/components/formulario-alta';
import { ModalReprogramar } from '@/app/agenda/components/modal-reprogramar';
import type { Hueco, Profesional, RespuestaAgendaDia, Servicio } from '@/app/agenda/tipos';

interface Props {
  profesionales: Profesional[];
  servicios: Servicio[];
  fechaInicial: string;
}

export function AgendaClient({ profesionales, servicios, fechaInicial }: Props) {
  const [profesionalId, setProfesionalId] = useState(profesionales[0]?.id ?? '');
  const [fecha, setFecha] = useState(fechaInicial);
  const [huecos, setHuecos] = useState<Hueco[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [huecoParaReservar, setHuecoParaReservar] = useState<Hueco | null>(null);
  const [huecoParaReprogramar, setHuecoParaReprogramar] = useState<Hueco | null>(null);

  const cargarAgenda = useCallback(async () => {
    if (!profesionalId || !fecha) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const respuesta = await fetch(`/api/agenda?profesionalId=${profesionalId}&fecha=${fecha}`);
      if (!respuesta.ok) {
        setErrorCarga('No se ha podido cargar la agenda de este día.');
        return;
      }
      const datos: RespuestaAgendaDia = await respuesta.json();
      setHuecos(datos.huecos);
    } finally {
      setCargando(false);
    }
  }, [profesionalId, fecha]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar profesional/fecha
    cargarAgenda();
  }, [cargarAgenda]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="profesional">Profesional</Label>
          <select
            id="profesional"
            value={profesionalId}
            onChange={(e) => setProfesionalId(e.target.value)}
            className="border-input flex h-9 w-56 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {p.especialidad}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando agenda…</p>}
      {errorCarga && (
        <p role="alert" className="text-sm text-destructive">
          {errorCarga}
        </p>
      )}

      {!cargando && !errorCarga && (
        <VistaHuecos
          huecos={huecos}
          onReservar={setHuecoParaReservar}
          onReprogramar={setHuecoParaReprogramar}
          onCambio={cargarAgenda}
        />
      )}

      <FormularioAlta
        hueco={huecoParaReservar}
        profesionalId={profesionalId}
        servicios={servicios}
        onCerrar={() => setHuecoParaReservar(null)}
        onExito={() => {
          setHuecoParaReservar(null);
          cargarAgenda();
        }}
      />

      <ModalReprogramar
        key={huecoParaReprogramar?.cita?.id ?? 'ninguna'}
        hueco={huecoParaReprogramar}
        profesionales={profesionales}
        servicios={servicios}
        profesionalIdActual={profesionalId}
        onCerrar={() => setHuecoParaReprogramar(null)}
        onExito={() => {
          setHuecoParaReprogramar(null);
          cargarAgenda();
        }}
      />
    </div>
  );
}

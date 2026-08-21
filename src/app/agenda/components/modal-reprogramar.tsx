'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reprogramarCita } from '@/lib/agenda/actions';
import { mensajeError } from '@/lib/agenda/mensajes';
import { formatearEnMadrid, horaMadridAUtc } from '@/lib/tiempo/zona-horaria';
import type { Hueco, Profesional, Servicio } from '@/app/agenda/tipos';

interface Props {
  hueco: Hueco | null;
  profesionales: Profesional[];
  servicios: Servicio[];
  profesionalIdActual: string;
  onCerrar: () => void;
  onExito: () => void;
}

function aInputLocal(iso: string): string {
  // input datetime-local espera "YYYY-MM-DDTHH:mm" en hora local (Europe/Madrid).
  const formateado = formatearEnMadrid(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  return formateado;
}

function deInputLocalAUtc(valor: string): string {
  // Interpreta el valor del <input> (hora de pared en Europe/Madrid) y devuelve el instante UTC.
  const [fecha, hora] = valor.split('T');
  const [horas, minutos] = hora.split(':').map(Number);
  return horaMadridAUtc(fecha, horas, minutos).toISOString();
}

/** Reprogramación de una cita reservada (FR-011, FR-012, US3). */
export function ModalReprogramar({
  hueco,
  profesionales,
  servicios,
  profesionalIdActual,
  onCerrar,
  onExito,
}: Props) {
  const citaId = hueco?.cita?.id;
  const [profesionalId, setProfesionalId] = useState(profesionalIdActual);
  const [servicioId, setServicioId] = useState<string>('');
  const [inicioLocal, setInicioLocal] = useState(hueco ? aInputLocal(hueco.inicio) : '');
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hueco || !citaId) return null;

  function enviar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await reprogramarCita({
        citaId: citaId!,
        profesionalId: profesionalId || undefined,
        servicioId: servicioId || undefined,
        inicio: deInputLocalAUtc(inicioLocal),
      });
      if (!resultado.ok) {
        setError(mensajeError(resultado.codigo, resultado.mensaje));
        return;
      }
      onExito();
    });
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprogramar cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reprogramar-profesional">Profesional</Label>
            <select
              id="reprogramar-profesional"
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reprogramar-servicio">
              Servicio (opcional, mantiene el actual si no se cambia)
            </Label>
            <select
              id="reprogramar-servicio"
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">— Mantener servicio actual —</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {s.duracionMinutos} min
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reprogramar-inicio">Nuevo inicio</Label>
            <Input
              id="reprogramar-inicio"
              type="datetime-local"
              value={inicioLocal}
              onChange={(e) => setInicioLocal(e.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="button" onClick={enviar} disabled={pendiente} className="w-full">
            {pendiente ? 'Guardando…' : 'Reprogramar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

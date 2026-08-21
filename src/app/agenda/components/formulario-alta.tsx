'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { darDeAltaCita } from '@/lib/agenda/actions';
import { mensajeError } from '@/lib/agenda/mensajes';
import { formatearEnMadrid } from '@/lib/tiempo/zona-horaria';
import {
  ModalCliente,
  type ClienteEncontrado,
  type ClienteNuevo,
} from '@/app/agenda/components/modal-cliente';
import type { Hueco, Servicio } from '@/app/agenda/tipos';

interface Props {
  hueco: Hueco | null;
  profesionalId: string;
  servicios: Servicio[];
  onCerrar: () => void;
  onExito: () => void;
}

/** Alta de cita nueva sobre un hueco libre (FR-003, FR-013, US1). */
export function FormularioAlta({ hueco, profesionalId, servicios, onCerrar, onExito }: Props) {
  const [servicioId, setServicioId] = useState<string>(servicios[0]?.id ?? '');
  const [cliente, setCliente] = useState<ClienteEncontrado | null>(null);
  const [clienteNuevo, setClienteNuevo] = useState<ClienteNuevo | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hueco) return null;
  const inicioHueco = hueco.inicio;

  function enviar() {
    setError(null);
    if (!cliente && !clienteNuevo) {
      setError(mensajeError('cliente_invalido'));
      return;
    }
    iniciarTransicion(async () => {
      const resultado = await darDeAltaCita({
        profesionalId,
        servicioId,
        clienteId: cliente?.id,
        clienteNuevo: clienteNuevo ?? undefined,
        inicio: inicioHueco,
      });
      if (!resultado.ok) {
        setError(mensajeError(resultado.codigo, resultado.mensaje));
        return;
      }
      onExito();
    });
  }

  const etiquetaCliente = cliente
    ? `${cliente.nombre} ${cliente.apellidos}`
    : clienteNuevo
      ? `${clienteNuevo.nombre} ${clienteNuevo.apellidos} (ficha nueva)`
      : 'Sin elegir';

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Nueva cita — {formatearEnMadrid(new Date(hueco.inicio), "d 'de' MMMM, HH:mm")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="servicio">Servicio</Label>
            <select
              id="servicio"
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {s.duracionMinutos} min — {(s.precioCentimos / 100).toFixed(2)} €
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm">{etiquetaCliente}</span>
              <ModalCliente
                onElegirExistente={(c) => {
                  setCliente(c);
                  setClienteNuevo(null);
                }}
                onCrearNuevo={(c) => {
                  setClienteNuevo(c);
                  setCliente(null);
                }}
              />
            </div>
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
            {pendiente ? 'Guardando…' : 'Dar de alta la cita'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

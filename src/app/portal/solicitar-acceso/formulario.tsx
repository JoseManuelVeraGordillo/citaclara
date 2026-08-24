'use client';

import { useActionState } from 'react';
import {
  solicitarAccesoFormAction,
  type EstadoSolicitarAcceso,
} from '@/lib/portal/acceso-action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const estadoInicial: EstadoSolicitarAcceso = {};

/** Formulario de solicitud de acceso (FR-001): teléfono → enlace de un solo uso. */
export function SolicitarAccesoForm() {
  const [estado, accion, pendiente] = useActionState(solicitarAccesoFormAction, estadoInicial);

  if (estado.mensaje) {
    return (
      <p className="text-sm" role="status">
        {estado.mensaje}
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="telefono">Tu teléfono</Label>
        <Input
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          autoFocus
          required
          placeholder="6XXXXXXXX"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? 'Enviando…' : 'Enviar enlace de acceso'}
      </Button>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { confirmarCancelacionRecordatorio } from '@/lib/recordatorios/actions';
import { mensajeErrorRecordatorio } from '@/lib/recordatorios/mensajes';

interface Props {
  token: string;
}

/** Botón de confirmación explícita antes de cancelar (FR-007, US3). */
export function ConfirmarCancelacion({ token }: Props) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelada, setCancelada] = useState(false);

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await confirmarCancelacionRecordatorio(token);
      if (!resultado.ok) {
        setError(mensajeErrorRecordatorio(resultado.codigo));
        return;
      }
      setCancelada(true);
    });
  }

  if (cancelada) {
    return (
      <p role="status" className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        Tu cita se ha cancelado correctamente. El hueco ya está libre para otra persona. Gracias
        por avisar.
      </p>
    );
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
      <Button type="button" onClick={confirmar} disabled={pendiente} className="w-full">
        {pendiente ? 'Cancelando…' : 'Sí, cancelar mi cita'}
      </Button>
    </div>
  );
}

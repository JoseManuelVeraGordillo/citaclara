'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cancelarCita } from '@/lib/portal/acciones';

const MENSAJES_ERROR: Record<string, string> = {
  no_autenticado: 'Tu sesión ha caducado. Vuelve a solicitar acceso.',
  cita_no_es_del_cliente: 'Esta cita no pertenece a tu cuenta.',
  cita_no_reservada: 'Esta cita ya no se puede cancelar (su estado ha cambiado).',
  fuera_de_plazo:
    'Ya no puedes cancelar esta cita online: quedan menos de 24 horas para su inicio. Llama al despacho para gestionarla.',
};

interface Props {
  citaId: string;
  cancelable: boolean;
}

/** Botón de cancelación con confirmación (FR-005, FR-006, US2-Escenarios 1-3). */
export function BotonCancelar({ citaId, cancelable }: Props) {
  const router = useRouter();
  const [pendiente, iniciarTransicion] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cancelable) {
    return (
      <p className="text-xs text-muted-foreground">
        Ya no se puede cancelar online (quedan menos de 24 horas). Llama al despacho si necesitas
        anularla.
      </p>
    );
  }

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await cancelarCita(citaId);
      if (!resultado.ok) {
        setError(resultado.codigo ? (MENSAJES_ERROR[resultado.codigo] ?? resultado.mensaje) : resultado.mensaje!);
        setConfirmando(false);
        return;
      }
      router.refresh();
    });
  }

  if (confirmando) {
    return (
      <div className="space-y-2">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-sm">¿Seguro que quieres cancelar esta cita?</p>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={pendiente} onClick={confirmar}>
            {pendiente ? 'Cancelando…' : 'Sí, cancelar'}
          </Button>
          <Button size="sm" variant="outline" disabled={pendiente} onClick={() => setConfirmando(false)}>
            No, mantener la cita
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="sm" variant="outline" onClick={() => setConfirmando(true)}>
        Cancelar cita
      </Button>
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import { entrarComoPanel, type EstadoLogin } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const estadoInicial: EstadoLogin = {};

export default function PaginaLoginPanel() {
  const [estado, accion, pendiente] = useActionState(entrarComoPanel, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-background p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CitaClara</h1>
          <p className="text-sm text-muted-foreground">Panel de analítica del despacho</p>
        </div>

        <form action={accion} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="clave">Clave de panel</Label>
            <Input
              id="clave"
              name="clave"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              aria-invalid={estado.error ? true : undefined}
              aria-describedby={estado.error ? 'clave-error' : undefined}
            />
          </div>

          {estado.error && (
            <p id="clave-error" role="alert" className="text-sm text-destructive">
              {estado.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pendiente}>
            {pendiente ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  );
}

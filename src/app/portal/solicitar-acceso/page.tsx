import { SolicitarAccesoForm } from './formulario';

const MENSAJES_ERROR: Record<string, string> = {
  token_invalido: 'El enlace de acceso no es válido. Solicita uno nuevo.',
  token_expirado: 'El enlace de acceso ha caducado. Solicita uno nuevo.',
  token_ya_usado: 'Ese enlace de acceso ya se ha utilizado. Solicita uno nuevo.',
};

export default async function PaginaSolicitarAcceso({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const mensajeError = error ? (MENSAJES_ERROR[error] ?? 'No se ha podido verificar el acceso.') : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-background p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CitaClara</h1>
          <p className="text-sm text-muted-foreground">Consulta y cancela tus citas</p>
        </div>

        {mensajeError && (
          <p role="alert" className="text-sm text-destructive">
            {mensajeError}
          </p>
        )}

        <SolicitarAccesoForm />
      </div>
    </main>
  );
}

import { obtenerDatosCancelacion } from '@/lib/recordatorios/actions';
import { formatearEnMadrid } from '@/lib/tiempo/zona-horaria';
import { ConfirmarCancelacion } from '@/app/cancelar-cita/[token]/confirmar-cancelacion';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * Página pública de cancelación de cita desde el enlace del recordatorio
 * (FR-006, FR-007, FR-008, US3). Sin sesión de secretaría: el token es la
 * única prueba de identidad (research.md §5, contracts/recordatorios.md).
 */
export default async function PaginaCancelarCita({ params }: Props) {
  const { token } = await params;
  const datos = await obtenerDatosCancelacion(token);

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cancelar mi cita</h1>
        <p className="text-sm text-muted-foreground">CitaClara — Nuria Lagar Abogados</p>
      </header>

      {datos.estadoEnlace === 'no_valido' && (
        <p role="alert" className="text-sm text-destructive">
          Este enlace no es válido. Comprueba que lo has copiado completo.
        </p>
      )}

      {datos.estadoEnlace === 'ya_cancelado' && (
        <p
          role="status"
          className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
        >
          Tu cita se ha cancelado correctamente. El hueco ya está libre para otra persona. Gracias
          por avisar.
        </p>
      )}

      {datos.estadoEnlace === 'plazo_agotado' && (
        <p role="alert" className="text-sm text-destructive">
          Ya no se puede cancelar esta cita por este medio: faltan menos de 24 horas para la cita.
          Si necesitas ayuda, contacta con el despacho.
        </p>
      )}

      {datos.estadoEnlace === 'valido' && datos.cita && (
        <div className="space-y-4">
          <div className="rounded-md border px-4 py-3 text-sm">
            <p>
              <span className="font-medium">Fecha:</span>{' '}
              {formatearEnMadrid(new Date(datos.cita.inicio), "EEEE d 'de' MMMM 'de' yyyy")}
            </p>
            <p>
              <span className="font-medium">Hora:</span>{' '}
              {formatearEnMadrid(new Date(datos.cita.inicio), 'HH:mm')}h
            </p>
            <p>
              <span className="font-medium">Profesional:</span> {datos.cita.profesionalNombre}
            </p>
            <p>
              <span className="font-medium">Área:</span> {datos.cita.area}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Si no vas a poder asistir, confirma la cancelación para que el hueco quede libre.
          </p>
          <ConfirmarCancelacion token={token} />
        </div>
      )}
    </main>
  );
}

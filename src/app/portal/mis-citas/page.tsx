import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { PLAZO_CANCELACION_MS } from '@/lib/portal/plazo';
import { COOKIE_SESION_CLIENTE, clienteIdDeSesion } from '@/lib/portal/sesion-cliente';
import { formatearEnMadrid } from '@/lib/tiempo/zona-horaria';
import { Badge } from '@/components/ui/badge';
import { BotonCancelar } from './components/boton-cancelar';

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistida: 'No asistida',
};

/** `mis-citas` — FR-002, FR-003, FR-004, US1-Escenarios 1-3. */
export default async function PaginaMisCitas() {
  const almacen = await cookies();
  const clienteId = await clienteIdDeSesion(almacen.get(COOKIE_SESION_CLIENTE)?.value);
  if (!clienteId) {
    redirect('/portal/solicitar-acceso');
  }

  const ahora = new Date();

  const [futuras, pasadas] = await Promise.all([
    prisma.cita.findMany({
      where: { clienteId, estado: 'reservada', inicio: { gt: ahora } },
      orderBy: { inicio: 'asc' },
      include: { profesional: true, servicio: true },
    }),
    prisma.cita.findMany({
      where: { clienteId, estado: { in: ['completada', 'cancelada', 'no_asistida'] } },
      orderBy: { inicio: 'desc' },
      include: { profesional: true, servicio: true },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Mis citas</h1>
        <p className="text-sm text-muted-foreground">Nuria Lagar Abogados</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Próximas citas</h2>
        {futuras.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes ninguna cita próxima.</p>
        ) : (
          <ul className="space-y-3">
            {futuras.map((cita) => {
              const cancelable = cita.inicio.getTime() - ahora.getTime() >= PLAZO_CANCELACION_MS;
              return (
                <li key={cita.id} className="space-y-2 rounded-lg border p-4">
                  <p className="font-medium">
                    {formatearEnMadrid(cita.inicio, "EEEE d 'de' MMMM 'a las' HH:mm")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cita.servicio.nombre} con {cita.profesional.nombre}
                  </p>
                  <BotonCancelar citaId={cita.id} cancelable={cancelable} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Historial</h2>
        {pasadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes citas pasadas.</p>
        ) : (
          <ul className="space-y-3">
            {pasadas.map((cita) => (
              <li
                key={cita.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">
                    {formatearEnMadrid(cita.inicio, "d 'de' MMMM 'de' yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cita.servicio.nombre} con {cita.profesional.nombre}
                  </p>
                </div>
                <Badge variant="outline">{ETIQUETA_ESTADO[cita.estado]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

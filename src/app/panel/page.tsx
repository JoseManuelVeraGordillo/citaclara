import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_SESION_PANEL, esSesionPanelValida } from '@/lib/auth/sesion';
import { salirPanel } from '@/lib/auth/actions';
import { obtenerVentana8SemanasCompletas } from '@/lib/analitica/semanas';
import {
  obtenerIngresosPorServicio,
  obtenerOcupacionSemanal,
  obtenerTasaNoAsistencia,
  obtenerEvolucionSemanal,
} from '@/lib/analitica/metricas';
import { prisma } from '@/lib/db/prisma';
import { Button } from '@/components/ui/button';
import { IngresosPorServicio } from '@/app/panel/components/ingresos-por-servicio';
import { OcupacionSemanal } from '@/app/panel/components/ocupacion-semanal';
import { TasaNoAsistencia } from '@/app/panel/components/tasa-no-asistencia';
import { EvolucionSemanal } from '@/app/panel/components/evolucion-semanal';

export const dynamic = 'force-dynamic';

export default async function PaginaPanel() {
  const almacen = await cookies();
  const sesionValida = await esSesionPanelValida(almacen.get(COOKIE_SESION_PANEL)?.value);
  if (!sesionValida) {
    redirect('/panel-login');
  }

  const despacho = await prisma.despacho.findFirst({ select: { id: true } });
  if (!despacho) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">
          No hay ningún despacho configurado. Ejecuta la semilla de datos.
        </p>
      </main>
    );
  }

  const ventana = obtenerVentana8SemanasCompletas(new Date());

  const [ingresos, ocupacion, noAsistencia, evolucion] = await Promise.all([
    obtenerIngresosPorServicio(despacho.id, ventana),
    obtenerOcupacionSemanal(despacho.id, ventana),
    obtenerTasaNoAsistencia(despacho.id),
    obtenerEvolucionSemanal(despacho.id, ventana),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel de analítica</h1>
          <p className="text-sm text-muted-foreground">CitaClara — Nuria Lagar Abogados</p>
        </div>
        <form action={salirPanel}>
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <IngresosPorServicio datos={ingresos} ventana={ventana} />
        <OcupacionSemanal datos={ocupacion} />
        <TasaNoAsistencia datos={noAsistencia} />
        <EvolucionSemanal datos={evolucion} />
      </div>
    </main>
  );
}

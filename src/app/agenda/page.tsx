import { prisma } from '@/lib/db/prisma';
import { fechaMadrid } from '@/lib/tiempo/zona-horaria';
import { AgendaClient } from '@/app/agenda/agenda-client';
import { Header } from '@/components/layout/header';

export const dynamic = 'force-dynamic';

export default async function PaginaAgenda() {
  const [profesionales, servicios] = await Promise.all([
    prisma.profesional.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
  ]);

  const fechaHoy = fechaMadrid(new Date());

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>

        <AgendaClient
          profesionales={profesionales.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            especialidad: p.especialidad,
          }))}
          servicios={servicios.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            duracionMinutos: s.duracionMinutos,
            precioCentimos: s.precioCentimos,
          }))}
          fechaInicial={fechaHoy}
        />
      </main>
    </>
  );
}

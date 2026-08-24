'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import type { TasaNoAsistenciaProfesional } from '@/lib/analitica/metricas';

const CONFIG: ChartConfig = {
  porcentaje: { label: 'Tasa de no asistencia', color: 'var(--chart-1)' },
};

interface Props {
  datos: TasaNoAsistenciaProfesional[];
}

export function TasaNoAsistencia({ datos }: Props) {
  const conDatos = datos.filter((p) => p.porcentaje !== null);
  const sinDatos = datos.filter((p) => p.porcentaje === null);

  return (
    <section
      className="space-y-3 rounded-lg border bg-background p-6"
      aria-labelledby="titulo-no-asistencia"
    >
      <div>
        <h2 id="titulo-no-asistencia" className="text-lg font-semibold tracking-tight">
          Tasa de no asistencia por profesional
        </h2>
        <p className="text-sm text-muted-foreground">
          Porcentaje de citas históricas resueltas marcadas como no asistida
        </p>
      </div>

      {sinDatos.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {sinDatos.map((profesional) => (
            <li key={profesional.profesionalId}>
              {profesional.nombreProfesional}: sin datos
              {!profesional.activo && (
                <Badge variant="outline" className="ml-1 text-xs">
                  inactivo
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      {conDatos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ningún profesional tiene citas históricas todavía.
        </p>
      ) : (
        <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
          <BarChart data={conDatos} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="nombreProfesional"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={{ fontSize: 12 }}
              tickFormatter={(valor: string) => {
                const profesional = conDatos.find((p) => p.nombreProfesional === valor);
                return profesional && !profesional.activo ? `${valor} (inactivo)` : valor;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(valor: number) => `${valor}%`}
              width={48}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(valor) => `${valor}%`} labelKey="nombreProfesional" />}
            />
            <Bar dataKey="porcentaje" fill="var(--color-porcentaje)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

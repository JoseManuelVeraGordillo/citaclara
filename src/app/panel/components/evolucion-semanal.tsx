'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { EvolucionSemanalProfesional } from '@/lib/analitica/metricas';
import { formatearCentimos, formatearSemanaCorta } from '@/lib/analitica/formato';

const COLORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

interface Props {
  datos: EvolucionSemanalProfesional[];
}

export function EvolucionSemanal({ datos }: Props) {
  const config: ChartConfig = Object.fromEntries(
    datos.map((profesional, indice) => [
      profesional.profesionalId,
      { label: profesional.nombreProfesional, color: COLORES[indice % COLORES.length] },
    ]),
  );

  const semanas = datos[0]?.semanas.map((s) => s.semanaInicio) ?? [];

  const filasCitas = semanas.map((semanaInicio, indiceSemana) => {
    const fila: Record<string, string | number> = { semanaEtiqueta: formatearSemanaCorta(semanaInicio) };
    for (const profesional of datos) {
      fila[profesional.profesionalId] = profesional.semanas[indiceSemana]?.totalCitas ?? 0;
    }
    return fila;
  });

  const filasIngresos = semanas.map((semanaInicio, indiceSemana) => {
    const fila: Record<string, string | number> = { semanaEtiqueta: formatearSemanaCorta(semanaInicio) };
    for (const profesional of datos) {
      fila[profesional.profesionalId] = profesional.semanas[indiceSemana]?.ingresosCentimos ?? 0;
    }
    return fila;
  });

  if (datos.length === 0) {
    return (
      <section className="space-y-3 rounded-lg border bg-background p-6" aria-labelledby="titulo-evolucion">
        <h2 id="titulo-evolucion" className="text-lg font-semibold tracking-tight">
          Evolución de las últimas 8 semanas
        </h2>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay profesionales registrados en el despacho.
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-6 rounded-lg border bg-background p-6 md:col-span-2"
      aria-labelledby="titulo-evolucion"
    >
      <div>
        <h2 id="titulo-evolucion" className="text-lg font-semibold tracking-tight">
          Evolución de las últimas 8 semanas
        </h2>
        <p className="text-sm text-muted-foreground">Citas e ingresos por profesional, semana a semana</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Citas por semana</h3>
          <ChartContainer config={config} className="aspect-auto h-56 w-full">
            <LineChart data={filasCitas} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="semanaEtiqueta" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {datos.map((profesional) => (
                <Line
                  key={profesional.profesionalId}
                  type="monotone"
                  dataKey={profesional.profesionalId}
                  stroke={`var(--color-${profesional.profesionalId})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Ingresos por semana</h3>
          <ChartContainer config={config} className="aspect-auto h-56 w-full">
            <LineChart data={filasIngresos} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="semanaEtiqueta" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(valor: number) => formatearCentimos(valor)}
                width={90}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(valor) => formatearCentimos(Number(valor))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {datos.map((profesional) => (
                <Line
                  key={profesional.profesionalId}
                  type="monotone"
                  dataKey={profesional.profesionalId}
                  stroke={`var(--color-${profesional.profesionalId})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </section>
  );
}

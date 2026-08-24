'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { IngresoPorServicio } from '@/lib/analitica/metricas';
import type { VentanaOchoSemanas } from '@/lib/analitica/semanas';
import { formatearCentimos, formatearSemanaCorta } from '@/lib/analitica/formato';

const CONFIG: ChartConfig = {
  totalCentimos: { label: 'Ingresos', color: 'var(--chart-1)' },
};

interface Props {
  datos: IngresoPorServicio[];
  ventana: VentanaOchoSemanas;
}

export function IngresosPorServicio({ datos, ventana }: Props) {
  const totalCentimos = datos.reduce((suma, d) => suma + d.totalCentimos, 0);
  const rangoVentana = `${formatearSemanaCorta(ventana.inicio)} – ${formatearSemanaCorta(ventana.fin)}`;

  return (
    <section className="space-y-3 rounded-lg border bg-background p-6" aria-labelledby="titulo-ingresos">
      <div>
        <h2 id="titulo-ingresos" className="text-lg font-semibold tracking-tight">
          Ingresos por servicio
        </h2>
        <p className="text-sm text-muted-foreground">
          Citas completadas, {rangoVentana} — total {formatearCentimos(totalCentimos)}
        </p>
      </div>

      {datos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay servicios registrados en el despacho.
        </p>
      ) : (
        <ChartContainer config={CONFIG} className="aspect-auto h-72 w-full">
          <BarChart data={datos} margin={{ left: 8, right: 8, bottom: 32 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="nombreServicio"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(valor: number) => formatearCentimos(valor)}
              width={90}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(valor) => formatearCentimos(Number(valor))}
                  labelKey="nombreServicio"
                />
              }
            />
            <Bar dataKey="totalCentimos" fill="var(--color-totalCentimos)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

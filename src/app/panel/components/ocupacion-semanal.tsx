'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import type { OcupacionSemanalProfesional } from '@/lib/analitica/metricas';
import { formatearSemanaCorta } from '@/lib/analitica/formato';

const COLORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

interface Props {
  datos: OcupacionSemanalProfesional[];
}

export function OcupacionSemanal({ datos }: Props) {
  const config: ChartConfig = Object.fromEntries(
    datos.map((profesional, indice) => [
      profesional.profesionalId,
      { label: profesional.nombreProfesional, color: COLORES[indice % COLORES.length] },
    ]),
  );

  const semanas = datos[0]?.semanas.map((s) => s.semanaInicio) ?? [];
  const filas = semanas.map((semanaInicio, indiceSemana) => {
    const fila: Record<string, string | number> = {
      semanaInicio,
      semanaEtiqueta: formatearSemanaCorta(semanaInicio),
    };
    for (const profesional of datos) {
      fila[profesional.profesionalId] = profesional.semanas[indiceSemana]?.porcentaje ?? 0;
    }
    return fila;
  });

  return (
    <section className="space-y-3 rounded-lg border bg-background p-6" aria-labelledby="titulo-ocupacion">
      <div>
        <h2 id="titulo-ocupacion" className="text-lg font-semibold tracking-tight">
          Ocupación semanal por profesional
        </h2>
        <p className="text-sm text-muted-foreground">
          Porcentaje del horario laboral ocupado, últimas 8 semanas completas
        </p>
      </div>

      <ul className="flex flex-wrap gap-3 text-sm">
        {datos.map((profesional) => (
          <li key={profesional.profesionalId} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: config[profesional.profesionalId]?.color }}
              aria-hidden="true"
            />
            {profesional.nombreProfesional}
            {!profesional.activo && (
              <Badge variant="outline" className="text-xs">
                inactivo
              </Badge>
            )}
          </li>
        ))}
      </ul>

      {datos.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay profesionales registrados en el despacho.
        </p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <LineChart data={filas} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="semanaEtiqueta"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(valor: number) => `${valor}%`}
              width={48}
            />
            <ChartTooltip content={<ChartTooltipContent formatter={(valor) => `${valor}%`} />} />
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
      )}
    </section>
  );
}

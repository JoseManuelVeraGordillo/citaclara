# Implementation Plan: Panel de Analítica del Despacho

**Branch**: `004-panel-analitica-despacho` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-panel-analitica-despacho/spec.md`

## Summary

Jose necesita una página de solo lectura, protegida por la clave de panel
del despacho (`clavePanelHash`, ya existente en el modelo de datos y hasta
ahora sin uso funcional), que muestre cuatro visualizaciones para
argumentar renovaciones: ingresos por servicio de las últimas 8 semanas
completas, ocupación semanal por profesional (mismas 8 semanas), tasa de
no asistencia por profesional (histórico completo) y evolución semanal de
citas/ingresos desglosada por profesional. El enfoque técnico añade una
única página nueva (`/panel`) al proyecto Next.js existente, calcula las
métricas con consultas Prisma agregadas en el propio Server Component (sin
mutaciones, sin API pública nueva) y renderiza los gráficos con
`recharts` a través del wrapper de gráficos de shadcn/ui, ya integrado con
el resto de la UI. No se toca el esquema de base de datos ni la lógica de
agenda existente.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS (mismo proyecto que 001-agenda-citas)

**Primary Dependencies**: Next.js 16 (App Router), Prisma ORM, Tailwind CSS
v4, shadcn/ui (Radix UI primitives), date-fns + date-fns-tz, **recharts**
(nueva dependencia, ver `research.md` — necesaria para cumplir FR-008
"gráficos claros" sin reinventar ejes/leyendas/tooltips accesibles a mano)

**Storage**: PostgreSQL 16+ ya existente (mismo esquema que 001-agenda-citas); esta feature no añade tablas ni migraciones, solo consultas de lectura sobre `Cita`, `Profesional`, `Servicio` y `Despacho.clavePanelHash`

**Testing**: Vitest (unit de las funciones de cálculo de métricas contra
fixtures derivadas de la semilla; integración para verificar 0 escrituras),
Playwright (e2e: entrar con clave de panel y comprobar las 4 secciones)

**Target Platform**: Aplicación web responsive — portátil de Jose/secretaría, **móvil** (FR-008) y, en su caso, proyector/pantalla de reunión —, servida desde el mismo servidor Node.js que la agenda

**Project Type**: web — mismo proyecto único full-stack Next.js que 001-agenda-citas (no se crea un segundo proyecto)

**Performance Goals**: Carga del panel en menos de 2 segundos con el
volumen de datos de la semilla (~1.900 citas); no hay objetivo de
throughput — es una página interna sin carga concurrente significativa
(Jose/secretaría, uso puntual antes o durante una reunión).

**Constraints**: Zona horaria única Europe/Madrid para toda semana/fecha
mostrada o calculada (Principio II, reutiliza `lib/tiempo/zona-horaria.ts`);
importes exactos al céntimo, sin floats (Principio II, reutiliza
`precioCentimos` como entero); 0 escrituras verificable (SC-003, FR-006);
WCAG 2.1 AA heredado del mismo sistema de componentes que 001-agenda-citas;
textos en español de España (Principio VIII).

**Scale/Scope**: Mismo despacho pequeño que 001-agenda-citas (3
profesionales, ~40 clientes, ~1.900 citas tras 8 semanas de historia de
semilla, crece lentamente con el uso real); 4 visualizaciones, 1 página.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Spec First | Este plan deriva íntegramente de `spec.md` (004-panel-analitica-despacho), ya registrada. `specs/MAPA.md` no existía en el repo (mismo hueco ya señalado en el plan de 001-agenda-citas) — el propio Principio I dice que una spec sin propietario "bloquea el merge". Resuelto: `specs/MAPA.md` creado con 001 y 004 registradas, cada una con propietario único (ver `/speckit-analyze` C1). | ✅ Pass |
| II. Los Números No Admiten Creatividad | Ingresos se suman en céntimos enteros (`precioCentimos`, nunca float); toda semana se calcula y muestra en Europe/Madrid reutilizando las utilidades ya existentes (`zona-horaria.ts`), sin ambigüedad de rango (ver `research.md`). | ✅ Pass |
| III. El Solape Es El Fallo Capital | No aplica de forma directa: esta feature no crea, modifica ni reprograma citas, por lo que no puede introducir un solape. FR-006/SC-003 exigen y verifican explícitamente 0 escrituras. | ✅ Pass (N/A por diseño) |
| IV. Simplicidad y Cero Alcance Fantasma | Mismo proyecto Next.js único (sin backend/frontend separados, sin API pública nueva); única dependencia nueva es `recharts`, justificada explícitamente por el requisito de "gráficos claros" (FR-008) y su integración directa con el wrapper de gráficos ya provisto por shadcn/ui; sin filtros de fecha personalizados ni exportación (excluidos explícitamente en Assumptions de la spec). | ✅ Pass |
| V. Demostrable con Datos Reproducibles | Todos los ejemplos de la spec y los tests de esta feature referencian la semilla determinista ya existente (`prisma/seed.ts`); no se genera ni se necesita ningún dato nuevo. | ✅ Pass |
| VI. Los Tests Acompañan a la Spec | Cada FR/escenario de aceptación se referencia en `contracts/panel-analitica.md` y se traduce a tests unitarios (cálculo), de integración (0 escrituras) y e2e (carga de panel) en `tasks.md`. | ✅ Pass (a completar en tasks) |
| VII. Interfaz Clara y Moderna | Mismo sistema Tailwind + shadcn/ui (Radix UI) que 001-agenda-citas, con gráficos accesibles vía el wrapper de shadcn sobre `recharts`; diseño responsive portátil/móvil; sin jerga técnica en textos de UI (FR-008). | ✅ Pass |
| VIII. Español de España | Todos los textos de UI, mensajes de estado vacío/error y esta documentación en español de España. | ✅ Pass |

**No hay violaciones que requieran justificación en Complexity Tracking.**

**Re-evaluación post-diseño (tras Phase 1)**: `data-model.md` no añade
tablas, columnas ni migraciones; `contracts/panel-analitica.md` define solo
funciones de lectura interna (sin API pública nueva) más dos Server
Actions de sesión (`entrarComoPanel`, `salirPanel`), simétricas a las ya
existentes para secretaría. Ningún hallazgo de diseño introduce una
violación nueva; la tabla anterior sigue vigente sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/004-panel-analitica-despacho/
├── plan.md               # This file (/speckit-plan command output)
├── research.md            # Phase 0 output (/speckit-plan command)
├── data-model.md           # Phase 1 output (/speckit-plan command)
├── quickstart.md           # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── panel-analitica.md  # Phase 1 output (/speckit-plan command)
├── checklists/
└── tasks.md                # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Mismo proyecto único full-stack Next.js (App Router) que 001-agenda-citas.
Se añade una página nueva (`/panel`) y su login (`/panel-login`), un módulo
de cálculo de métricas de solo lectura, y se extiende el módulo de sesión
existente con una segunda cookie independiente para la clave de panel.

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/                       # ya existe (clave de secretaría)
│   │   └── panel-login/
│   │       └── page.tsx                  # entrada con clave de panel (FR-001)
│   ├── agenda/                           # ya existe, sin cambios
│   └── panel/
│       ├── page.tsx                      # Server Component: consulta y compone las 4 secciones
│       └── components/
│           ├── ingresos-por-servicio.tsx  # US1 (FR-004)
│           ├── ocupacion-semanal.tsx      # US2 (FR-002)
│           ├── tasa-no-asistencia.tsx     # US3 (FR-003)
│           └── evolucion-semanal.tsx      # US4 (FR-005)
├── lib/
│   ├── agenda/                           # ya existe, sin cambios (se reutiliza tramosLaboralesDelDia)
│   ├── analitica/
│   │   ├── metricas.ts                   # funciones puras: ingresos, ocupación, no asistencia, evolución
│   │   └── semanas.ts                    # cálculo de la ventana de 8 semanas completas (Europe/Madrid)
│   ├── auth/
│   │   ├── sesion.ts                     # se añade cookie/valor de sesión de panel
│   │   └── actions.ts                    # se añaden entrarComoPanel, salirPanel
│   ├── db/                               # ya existe, sin cambios
│   └── tiempo/                           # ya existe, sin cambios (se reutiliza zona-horaria.ts)
└── components/ui/
    └── chart.tsx                         # wrapper shadcn/ui sobre recharts (nuevo, generado vía shadcn CLI)

tests/
├── unit/
│   └── analitica/
│       ├── ingresos.test.ts               # US1 (FR-004) vs. semilla
│       ├── ocupacion.test.ts              # US2 (FR-002) vs. semilla
│       ├── no-asistencia.test.ts          # US3 (FR-003) vs. semilla
│       ├── evolucion.test.ts              # US4 (FR-005) vs. semilla
│       └── semanas.test.ts                # ventana de 8 semanas completas, exclusión de semana en curso (FR-007)
├── integration/
│   └── panel-solo-lectura.test.ts        # SC-003: cargar el panel no cambia ninguna fila de Cita/Cliente/Profesional/Servicio
└── e2e/
    └── panel.spec.ts                      # entrar con clave de panel y comprobar las 4 secciones (Playwright)
```

**Structure Decision**: Se mantiene el proyecto único (`src/`, `prisma/`,
`tests/`) de 001-agenda-citas; no se crea un segundo proyecto ni una API
pública separada, porque el panel no tiene más consumidor que esta misma
UI (Principio IV). Las métricas se calculan en el Server Component de
`/panel` mediante consultas Prisma agregadas — sin capa de servicio HTTP
intermedia — igual que la agenda usa Server Components/Actions en lugar de
una API REST.

## Complexity Tracking

*No aplica: el Constitution Check no registra violaciones.*

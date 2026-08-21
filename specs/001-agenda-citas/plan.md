# Implementation Plan: Núcleo de Agenda de CitaClara

**Branch**: `001-agenda-citas` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agenda-citas/spec.md`

## Summary

CitaClara necesita una agenda de citas para un despacho de abogados pequeño:
secretaría ve la ocupación de cada profesional en tiempo continuo, da de
alta citas, cambia su estado (completada/cancelada/no_asistida) y las
reprograma, todo bajo dos reglas de negocio no negociables — cero solape
(RN1), ni siquiera bajo condiciones de carrera entre varias secretarias
simultáneas, y ningún alta/reprogramación en el pasado (RN2). El enfoque
técnico es un único proyecto full-stack Next.js 15 (App Router) + TypeScript
sobre PostgreSQL con Prisma, donde RN1 se garantiza con una restricción
`EXCLUDE` a nivel de base de datos (no solo validación en aplicación), y la
UI usa Tailwind CSS + shadcn/ui para una interfaz profesional, accesible
(WCAG 2.1 AA) y responsive, con una semilla determinista basada en una
semilla pseudoaleatoria fija.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Tailwind
CSS v4, shadcn/ui (Radix UI primitives), date-fns + date-fns-tz

**Storage**: PostgreSQL 16+ (restricción `EXCLUDE USING gist` sobre rango
`tsrange` para garantizar RN1 a nivel de base de datos)

**Testing**: Vitest (unit e integración), Playwright (end-to-end de los
flujos de secretaría y test de concurrencia RN1 contra base de datos real)

**Target Platform**: Aplicación web responsive (portátil de secretaría y
móvil de cliente), servida desde Node.js

**Project Type**: web — proyecto único full-stack (frontend + backend en
la misma app Next.js)

**Performance Goals**: Alta de cita completa en menos de 1 minuto desde
apertura de la agenda del día (SC-001); identificación visual de huecos
libres/ocupados en menos de 5 segundos (SC-005); estos son objetivos de
UX/flujo, no de throughput — no hay carga concurrente masiva esperada
(despacho pequeño, unas pocas secretarias).

**Constraints**: Zona horaria única Europe/Madrid (CET/CEST) para toda
fecha/hora mostrada o calculada (Principio II); importes exactos al
céntimo, sin floats (Principio II); RN1 garantizada al 100% incluso bajo
condiciones de carrera (Principio III, FR-005); WCAG 2.1 AA (contraste
4.5:1, texto redimensionable, navegable por teclado) (FR-016); textos en
español de España (Principio VIII).

**Scale/Scope**: Despacho pequeño (2–5 profesionales, aquí 3), ~40 fichas
de cliente, unas pocas secretarias concurrentes, 3 historias de usuario
(alta+visualización, cambio de estado, reprogramación).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Spec First | Este plan deriva íntegramente de `spec.md` (001-agenda-citas), ya registrada. Pendiente confirmar propietario único en `specs/MAPA.md` antes de implementar. | ✅ Pass (con nota) |
| II. Los Números No Admiten Creatividad | Importes en céntimos enteros (nunca float); todas las fechas/horas se almacenan en UTC y se muestran siempre convertidas a Europe/Madrid en la UI, sin ambigüedad (ver `research.md` §5, `data-model.md`). | ✅ Pass |
| III. El Solape Es El Fallo Capital | RN1 se implementa como restricción `EXCLUDE USING gist` en PostgreSQL, no solo como validación de aplicación, garantizando atomicidad bajo condiciones de carrera; se exige un test de integración específico de concurrencia (ver `quickstart.md`). | ✅ Pass |
| IV. Simplicidad y Cero Alcance Fantasma | Un único proyecto full-stack (sin backend/frontend separados); sin sistema de autenticación de usuarios granular (cookie de sesión simple); sin funcionalidades fuera del alcance de la spec (recordatorios, pagos, analítica, acceso de cliente quedan fuera). | ✅ Pass |
| V. Demostrable con Datos Reproducibles | Semilla con generador pseudoaleatorio de semilla fija y fecha de referencia fija (no `Date.now()`), verificable por snapshot/diff (ver `quickstart.md`). | ✅ Pass |
| VI. Los Tests Acompañan a la Spec | Cada FR/escenario de aceptación se referencia en los contratos (`contracts/agenda-actions.md`) y se traducirá a tests concretos en `tasks.md`/`/speckit-tasks`. | ✅ Pass (a completar en tasks) |
| VII. Interfaz Clara y Moderna | Tailwind + shadcn/ui sobre Radix UI para accesibilidad por defecto (WCAG 2.1 AA); diseño responsive portátil/móvil; sin jerga técnica en textos de UI. | ✅ Pass |
| VIII. Español de España | Todos los textos de UI, mensajes de error y esta documentación en español de España. | ✅ Pass |

**No hay violaciones que requieran justificación en Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/001-agenda-citas/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── agenda-actions.md # Phase 1 output (/speckit-plan command)
├── checklists/
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único full-stack Next.js (App Router). Frontend y backend
conviven en la misma app: las páginas de la agenda usan Server Components
para lectura y Server Actions para mutaciones (alta, cambio de estado,
reprogramación), evitando una capa de API REST separada.

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/                 # entrada con clave de secretaría (FR-001)
│   ├── agenda/
│   │   ├── page.tsx                # agenda del día: selector profesional/fecha + huecos
│   │   └── components/             # vista de huecos, formulario de alta, modal de cliente
│   └── api/
│       └── clientes/route.ts       # búsqueda de clientes (contracts#buscarClientes)
├── lib/
│   ├── db/
│   │   └── prisma.ts               # cliente Prisma
│   ├── agenda/
│   │   ├── actions.ts              # darDeAltaCita, cambiarEstadoCita, reprogramarCita
│   │   ├── reglas.ts               # RN1 (aplicación + traducción de error BD), RN2, horario laboral
│   │   └── horario.ts              # cálculo de huecos libres/ocupados en tiempo continuo
│   ├── auth/
│   │   └── sesion.ts               # cookie de sesión de secretaría
│   └── tiempo/
│       └── zona-horaria.ts         # conversión UTC ↔ Europe/Madrid (Principio II)
├── components/ui/                  # componentes shadcn/ui (accesibles, WCAG 2.1 AA)
└── styles/

prisma/
├── schema.prisma                   # Despacho, Profesional, Servicio, Cliente, Cita + EXCLUDE constraint (RN1)
├── migrations/
└── seed.ts                         # semilla determinista (FR-015, Principio V)

tests/
├── unit/
│   └── reglas/                     # RN1 (lógica aplicación), RN2, cálculo de fin, horario laboral
├── integration/
│   └── concurrencia-rn1.test.ts    # dos altas simultáneas sobre el mismo hueco (Principio III, gate)
└── e2e/
    └── agenda.spec.ts              # US1, US2, US3 de extremo a extremo (Playwright)
```

**Structure Decision**: Proyecto único (`src/`, `prisma/`, `tests/`) en la
raíz del repositorio. Se descarta la opción de frontend/backend separados
porque no hay un cliente externo distinto de esta misma UI que consuma una
API pública (Principio IV); Server Actions de Next.js cubren las mutaciones
sin necesidad de un backend independiente.

## Complexity Tracking

*No aplica: el Constitution Check no registra violaciones.*

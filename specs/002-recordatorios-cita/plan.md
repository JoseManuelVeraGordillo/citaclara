# Implementation Plan: Recordatorios de Cita por Email

**Branch**: `003-recordatorios-cita` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-recordatorios-cita/spec.md`

## Summary

CitaClara necesita reducir la no asistencia (dolor nº1 del despacho
piloto): un proceso diario detecta las citas `reservada` cuyo `inicio`
cae entre 24 y 48 horas en el futuro, genera para cada una un correo de
recordatorio (con enlace de cancelación protegido por token) y lo escribe
como fichero `.eml` en `datos/salida-correo/` (no hay SMTP en v1),
garantizando como máximo un recordatorio por cita/fecha y reenviando si la
cita se reprograma dentro de ventana. El enfoque técnico reutiliza el
mismo proyecto full-stack Next.js + TypeScript + PostgreSQL/Prisma de
`001-agenda-citas`: una tabla `Recordatorio` nueva, un script `tsx`
ejecutado por un cron externo (sin scheduler embebido), un módulo puro de
selección testeable con un "ahora" inyectable (reproducibilidad,
Principio V), un constructor de `.eml` sin dependencias nuevas, y una
página pública `/cancelar-cita/[token]` sin sesión de secretaría.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS (mismo proyecto
que `001-agenda-citas`)

**Primary Dependencies**: Next.js 16 (App Router), Prisma ORM, `node:crypto`
y `node:fs` (nativos, sin dependencia nueva), `tsx` (ya usado por
`prisma/seed.ts`), date-fns + date-fns-tz (reutilizando
`src/lib/tiempo/zona-horaria.ts`)

**Storage**: PostgreSQL 16+ (misma base de datos que `001-agenda-citas`;
tabla nueva `Recordatorio`, ver `data-model.md`)

**Testing**: Vitest (unit del módulo de selección y del constructor
`.eml`, integración de deduplicación y cancelación por token), Playwright
(flujo end-to-end de cancelación desde `/cancelar-cita/[token]`)

**Target Platform**: (a) script de línea de comandos ejecutado por un
cron externo al desplegar; (b) página web pública responsive
(`/cancelar-cita/[token]`), accedida típicamente desde el móvil del
cliente

**Project Type**: web — mismo proyecto único full-stack que
`001-agenda-citas` (sin repos ni servicios nuevos)

**Performance Goals**: no hay objetivo de throughput (despacho pequeño,
proceso diario por lotes, no interactivo); la página de cancelación debe
responder con la misma naturalidad que el resto de la UI (sin objetivo
numérico específico más allá del estándar de una app web).

**Constraints**: Zona horaria única Europe/Madrid para toda fecha/hora en
el correo y en la página de cancelación (Principio II, reutilizando
`zona-horaria.ts`); el token de cancelación MUST ser impredecible
(Clarification, FR-007a); el proceso diario MUST ser idempotente sin
depender de un scheduler externo específico (Principio IV); ninguna
llamada a `Date.now()` dentro de la lógica de selección, que MUST aceptar
un "ahora" inyectado para ser reproducible (Principio V).

**Scale/Scope**: mismo despacho pequeño de `001-agenda-citas` (2–5
profesionales, ~40 fichas de cliente); volumen de recordatorios diarios
del orden de las citas que caen en una ventana de 24h, es decir, unas
pocas decenas como mucho.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Spec First | Este plan deriva íntegramente de `spec.md` (002-recordatorios-cita), ya clarificada. Pendiente registrar propietario en `specs/MAPA.md` antes de implementar. | ✅ Pass (con nota) |
| II. Los Números No Admiten Creatividad | Toda fecha/hora del `.eml` y de la página de cancelación se formatea con `zona-horaria.ts` (Europe/Madrid, sin ambigüedad); esta feature no maneja importes. | ✅ Pass |
| III. El Solape Es El Fallo Capital | Esta feature no crea ni reprograma citas: la única escritura sobre `Cita` es la transición `reservada → cancelada` ya definida y probada en `001-agenda-citas`, que libera un hueco (reduce ocupación) y no puede producir solape. No se requiere test de concurrencia nuevo sobre RN1. | ✅ Pass (no aplica gate de concurrencia RN1) |
| IV. Simplicidad y Cero Alcance Fantasma | Sin scheduler embebido, sin librería de envío de correo real, sin panel nuevo de recordatorios (se reutiliza `/agenda` para el indicador de "omitido sin email"); ver `research.md` §1, §4, §7. | ✅ Pass |
| V. Demostrable con Datos Reproducibles | Selección de citas aislada en función pura sin `Date.now()`, con "ahora" inyectable; se ejecuta contra la semilla determinista de `001-agenda-citas` para verificar SC-001/SC-002/SC-004 (`research.md` §2, `quickstart.md`). | ✅ Pass |
| VI. Los Tests Acompañan a la Spec | Cada FR se referencia en `contracts/recordatorios.md`; se traduce a tests concretos en `tasks.md`/`/speckit-tasks` (unit de selección/ventana/dedupe/token, integración de doble ejecución y cancelación, e2e del flujo de cancelación). | ✅ Pass (a completar en tasks) |
| VII. Interfaz Clara y Moderna | Página `/cancelar-cita/[token]` reutiliza Tailwind + shadcn/ui, sin jerga técnica, responsive (uso típico desde móvil de cliente); indicador de "sin recordatorio enviado" integrado en la UI existente de agenda. | ✅ Pass |
| VIII. Español de España | Texto del `.eml`, de la página de cancelación y de los mensajes de error, todo en español de España (FR-010). | ✅ Pass |

**No hay violaciones que requieran justificación en Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/002-recordatorios-cita/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── recordatorios.md  # Phase 1 output (/speckit-plan command)
├── checklists/
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Mismo proyecto único full-stack Next.js (App Router) de
`001-agenda-citas`; esta feature añade módulos y una tabla, sin crear
proyectos ni servicios nuevos.

```text
src/
├── app/
│   ├── agenda/
│   │   └── components/              # + indicador "sin recordatorio enviado" (research.md §7)
│   └── cancelar-cita/
│       └── [token]/
│           └── page.tsx             # página pública, sin sesión (contracts#GET /cancelar-cita/[token])
├── lib/
│   ├── recordatorios/
│   │   ├── seleccion.ts             # función pura: ventana 24-48h + dedupe (contracts#seleccionarCitasParaRecordar)
│   │   ├── actions.ts               # confirmarCancelacionRecordatorio (Server Action)
│   │   └── mensajes.ts              # textos de error en español de España
│   ├── correo/
│   │   └── eml.ts                   # construcción del contenido .eml (research.md §4)
│   └── tiempo/
│       └── zona-horaria.ts          # ya existe (001-agenda-citas), reutilizado
├── components/ui/                   # shadcn/ui ya existente, reutilizado
└── generated/prisma/                # cliente Prisma generado

scripts/
└── enviar-recordatorios.ts          # entrypoint del proceso diario (contracts#enviarRecordatoriosDelDia)

prisma/
├── schema.prisma                    # + model Recordatorio (data-model.md)
└── migrations/                      # + migración de la tabla nueva

datos/
└── salida-correo/                   # ficheros .eml generados (FR-003), no versionado

tests/
├── unit/
│   └── recordatorios/
│       ├── seleccion.test.ts        # ventana 24-48h, dedupe, reenvío tras reprogramación (FR-001,004,009)
│       └── eml.test.ts              # formato del .eml, fechas sin ambigüedad (FR-002,010)
├── integration/
│   ├── dedupe-recordatorios.test.ts # doble ejecución del proceso sobre la misma agenda (US2, SC-002)
│   └── cancelacion-token.test.ts    # cancelación válida, plazo agotado, token inválido (US3, FR-006,007,008)
└── e2e/
    └── cancelar-cita.spec.ts        # flujo completo desde el enlace del .eml (Playwright)
```

**Structure Decision**: se mantiene el proyecto único (`src/`, `prisma/`,
`tests/`) de `001-agenda-citas`; el proceso diario vive en `scripts/` en
la raíz (mismo patrón que `prisma/seed.ts`, pero fuera de `prisma/`
porque no es una herramienta de esquema/semilla sino un proceso de
negocio) y se invoca vía `npm run recordatorios:enviar`. No se introduce
un backend ni un scheduler separados (Principio IV).

## Complexity Tracking

*No aplica: el Constitution Check no registra violaciones.*

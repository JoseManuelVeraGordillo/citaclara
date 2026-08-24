# Implementation Plan: Portal del Cliente

**Branch**: `002-portal-cliente-citas` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-portal-cliente-citas/spec.md`

## Summary

Los clientes de Nuria Lagar Abogados podrán ver sus citas futuras y
pasadas, y cancelar una cita futura, sin llamar por teléfono a recepción.
El acceso no crea cuentas ni contraseñas: el cliente solicita acceso con
su teléfono y recibe un enlace de un solo uso (expira a los 15 minutos)
que abre una sesión de cliente limitada a sus propias citas. Solo puede
cancelar citas `reservada` cuyo inicio esté a 24 horas o más del instante
actual; al cancelar, el hueco se libera de inmediato en la agenda de
secretaría (igual que una cancelación de secretaría), y la agenda muestra
visualmente que el origen fue el cliente. Se reutiliza íntegramente el
proyecto full-stack Next.js 15 + TypeScript + PostgreSQL/Prisma de
`001-agenda-citas`: mismo esquema de `Cliente`/`Cita`, mismo enum de
estado, misma conversión de zona horaria; se añade una tabla de tokens de
acceso, un campo de origen de cancelación en `Cita`, y una cancelación
atómica basada en `UPDATE ... WHERE estado = 'reservada'` (mismo patrón
"la BD serializa validación y escritura" que ya usa RN1). Reservar,
mover citas o pagar quedan explícitamente fuera de alcance.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 20 LTS (mismo proyecto que 001-agenda-citas)

**Primary Dependencies**: Next.js 15 (App Router), Prisma ORM, Tailwind
CSS v4, shadcn/ui (Radix UI primitives), date-fns + date-fns-tz — sin
dependencias nuevas respecto a `package.json` actual (research.md).

**Storage**: PostgreSQL 16+ (mismo esquema base; añade tabla
`SolicitudAccesoCliente` y campo `Cita.canceladaPor`)

**Testing**: Vitest (unit e integración, incluida la cancelación
atómica/condición de carrera), Playwright (end-to-end del flujo del
portal: solicitar acceso, canjear token, ver citas, cancelar)

**Target Platform**: Aplicación web responsive, prioritariamente móvil
(el cliente accede desde su teléfono), servida desde Node.js

**Project Type**: web — mismo proyecto único full-stack que 001-agenda-citas (no se crea un segundo proyecto/paquete)

**Performance Goals**: El cliente encuentra su próxima cita en menos de
10 segundos (SC-001) y completa una cancelación elegible en menos de 30
segundos (SC-002) desde que accede a su página personal; objetivos de
UX/flujo, no de throughput (mismo perfil de carga pequeño que 001).

**Constraints**: Zona horaria única Europe/Madrid para toda fecha/hora
mostrada (Principio II, reutilizando `lib/tiempo/zona-horaria.ts`);
acceso sin cuenta ni contraseña (FR-001); token de un solo uso con
expiración corta (FR-001a); cancelación restringida a ≥24h de antelación
(FR-005/FR-006); cancelación atómica ante condiciones de carrera
(FR-008); español de España (Principio VIII); sin envío real a proveedor
de terceros en esta feature (research.md §1, deuda técnica consciente).

**Scale/Scope**: Mismo despacho único (Nuria Lagar Abogados), ~40 fichas
de cliente de la semilla existente, 2 historias de usuario (ver
citas, cancelar cita).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Spec First | Este plan deriva íntegramente de `spec.md` (002-portal-cliente-citas), ya registrada con sus tres Clarifications resueltas. Pendiente confirmar propietario único en `specs/MAPA.md` antes de implementar. | ✅ Pass (con nota) |
| II. Los Números No Admiten Creatividad | No se introducen importes nuevos; fechas/horas siguen almacenándose en UTC y mostrándose siempre convertidas a Europe/Madrid, reutilizando la utilidad ya existente. | ✅ Pass |
| III. El Solape Es El Fallo Capital | Esta feature no crea ni reprograma citas (no toca RN1); solo cancela, lo que nunca puede introducir un solape nuevo. No aplica. | ✅ N/A |
| IV. Simplicidad y Cero Alcance Fantasma | Se reutiliza el mismo proyecto, esquema y utilidades de 001-agenda-citas; no se integra ningún proveedor de email/SMS real (research.md §1); la cancelación atómica usa una sentencia SQL condicional en vez de infraestructura de bloqueo adicional (research.md §4). Sin funcionalidades fuera del alcance de la spec (reserva, movimiento de citas, pagos). | ✅ Pass |
| V. Demostrable con Datos Reproducibles | Reutiliza la semilla determinista existente de 001-agenda-citas (clientes y citas futuras/pasadas); no se necesita una semilla nueva para esta feature. | ✅ Pass |
| VI. Los Tests Acompañan a la Spec | Cada FR/escenario de aceptación se referencia en `contracts/portal-cliente.md` y se traducirá a tests concretos en `tasks.md`/`/speckit-tasks`, incluida la condición de carrera de FR-008. | ✅ Pass (a completar en tasks) |
| VII. Interfaz Clara y Moderna | Reutiliza Tailwind + shadcn/ui sobre Radix UI (accesibilidad por defecto); diseño responsive con prioridad móvil (target principal del cliente); sin jerga técnica en textos de UI. | ✅ Pass |
| VIII. Español de España | Todos los textos de UI, mensajes de error y esta documentación en español de España. | ✅ Pass |

**No hay violaciones que requieran justificación en Complexity Tracking.**

## Project Structure

### Documentation (this feature)

```text
specs/002-portal-cliente-citas/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── portal-cliente.md # Phase 1 output (/speckit-plan command)
├── checklists/
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Mismo proyecto único full-stack Next.js (App Router) que
`001-agenda-citas`. El portal del cliente vive junto a la agenda de
secretaría, comparte `prisma/schema.prisma`, `lib/db/prisma.ts` y
`lib/tiempo/zona-horaria.ts`, y añade su propia sesión (cookie distinta a
la de secretaría) y sus propias Server Actions.

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/                          # ya existe (001, sin cambios)
│   ├── agenda/                              # ya existe (001); su historial de
│   │   └── ...                              #   cita añade la etiqueta de origen (FR-007a)
│   ├── portal/
│   │   ├── solicitar-acceso/
│   │   │   └── page.tsx                    # formulario de teléfono (FR-001)
│   │   ├── verificar/
│   │   │   └── [token]/route.ts            # canjea el token, abre sesión de cliente
│   │   └── mis-citas/
│   │       ├── page.tsx                    # listado futuras/pasadas (FR-002,003,004)
│   │       └── components/
│   │           └── boton-cancelar.tsx      # confirmación + cancelación (FR-005,006)
│   └── api/
│       └── portal/
│           └── mis-citas/route.ts          # contracts#verMisCitas
├── lib/
│   ├── db/
│   │   └── prisma.ts                       # ya existe, sin cambios
│   ├── agenda/                             # ya existe (001); reglas.ts gana la
│   │   └── ...                             #   cancelación atómica compartida (research.md §4)
│   ├── portal/
│   │   ├── acceso.ts                       # generarSolicitudAcceso, canjearToken (FR-001, FR-001a)
│   │   ├── email.ts                        # interfaz EmailSender + implementación de consola (research.md §1)
│   │   ├── acciones.ts                     # cancelarCitaCliente (contracts#cancelarCita)
│   │   └── sesion-cliente.ts               # cookie de sesión de cliente (research.md §3)
│   └── tiempo/
│       └── zona-horaria.ts                 # ya existe, sin cambios
└── components/ui/                          # ya existe (shadcn/ui), reutilizado

prisma/
├── schema.prisma                           # añade SolicitudAccesoCliente y Cita.canceladaPor
└── migrations/                             # nueva migración de esta feature

tests/
├── unit/
│   └── portal/
│       └── acceso.test.ts                  # expiración, un solo uso (FR-001a)
├── integration/
│   └── concurrencia-cancelacion.test.ts    # cancelación simultánea cliente/secretaría (FR-008)
└── e2e/
    └── portal.spec.ts                      # US1, US2 de extremo a extremo (Playwright)
```

**Structure Decision**: Se mantiene el proyecto único (`src/`, `prisma/`,
`tests/`) de 001-agenda-citas; el portal del cliente es un área nueva
dentro de la misma app (`src/app/portal`, `src/lib/portal`) en vez de un
proyecto o servicio separado, porque comparte base de datos, modelo de
datos y utilidades con la agenda de secretaría, y no hay ningún cliente
externo que consuma una API pública propia (Principio IV).

## Complexity Tracking

*No aplica: el Constitution Check no registra violaciones.*

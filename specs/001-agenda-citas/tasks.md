---

description: "Task list for Núcleo de Agenda de CitaClara"
---

# Tasks: Núcleo de Agenda de CitaClara

**Input**: Design documents from `/specs/001-agenda-citas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/agenda-actions.md, quickstart.md

**Tests**: Incluidas. La spec exige explícitamente pruebas de RN1 bajo condiciones de carrera (Principio III, FR-005) y de reproducibilidad de la semilla (Principio V, FR-015); el resto de historias siguen el mismo criterio de trazabilidad spec → test (Principio VI).

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye ruta de archivo exacta

## Path Conventions

Proyecto único full-stack Next.js 15 (App Router) en la raíz del repositorio, según `plan.md`:

```text
src/app/, src/lib/, src/components/ui/, src/styles/
prisma/
tests/unit/, tests/integration/, tests/e2e/
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js full-stack y herramientas base

- [X] T001 Crear proyecto Next.js 15 (App Router) con TypeScript 5.x en la raíz del repositorio, siguiendo la estructura de `plan.md` (`src/app`, `src/lib`, `src/components`, `src/styles`)
- [X] T002 [P] Instalar y configurar Tailwind CSS v4 en el proyecto
- [X] T003 [P] Instalar y configurar shadcn/ui (primitivas Radix UI) con componentes base (button, input, select, dialog, badge, table, form) en `src/components/ui/`
- [X] T004 [P] Instalar Prisma ORM y configurar datasource PostgreSQL (`prisma/schema.prisma`, carpeta `prisma/migrations/`)
- [X] T005 [P] Configurar ESLint y Prettier del proyecto
- [X] T006 [P] Configurar Vitest para tests unitarios e integración (`vitest.config.ts`, carpetas `tests/unit/`, `tests/integration/`)
- [X] T007 [P] Configurar Playwright para tests end-to-end (`playwright.config.ts`, carpeta `tests/e2e/`)
- [X] T008 [P] Instalar `date-fns` y `date-fns-tz` para conversión UTC ↔ Europe/Madrid
- [X] T009 Configurar variables de entorno (`.env.example` con `DATABASE_URL`, `DATABASE_URL_TEST`, secreto de sesión y clave de secretaría de semilla) según `quickstart.md`

**Checkpoint**: proyecto arrancable con `npm run dev`, linters y test runners configurados.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de datos, RN1 a nivel de base de datos, utilidades de tiempo/horario y autenticación — bloquean todas las historias de usuario

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [X] T010 Definir en `prisma/schema.prisma` las entidades Despacho, Profesional, Servicio, Cliente y Cita según `data-model.md` (incluye `precioCentimos` como entero, nunca float — Principio II)
- [X] T011 Generar migración Prisma con restricción `EXCLUDE USING gist` sobre `tsrange(inicio, fin)` de Cita, filtrada por `profesionalId` y `estado IN ('reservada','completada')`, para garantizar RN1 a nivel de base de datos (Principio III, FR-004, FR-005) en `prisma/migrations/`
- [X] T012 [P] Implementar cliente Prisma singleton en `src/lib/db/prisma.ts`
- [X] T013 [P] Implementar conversión UTC ↔ Europe/Madrid en `src/lib/tiempo/zona-horaria.ts`
- [X] T014 [P] Implementar cálculo de horario laboral (09:00–14:00 y 16:00–20:00, lunes a viernes, Europe/Madrid) y generación de huecos en tiempo continuo en `src/lib/agenda/horario.ts`
- [X] T015 Implementar reglas de negocio RN1 (validación de aplicación + traducción del error `EXCLUDE` de PostgreSQL a código `solape`), RN2 (rechazo de inicio pasado) y validación de horario laboral en `src/lib/agenda/reglas.ts` (depende de T012, T013, T014)
- [X] T016 [P] Implementar sesión de secretaría con cookie firmada y middleware de autenticación en `src/lib/auth/sesion.ts` y `middleware.ts` (FR-001)
- [X] T017 [P] Implementar página de login con clave de secretaría en `src/app/(auth)/login/page.tsx` y su server action asociada
- [X] T018 Implementar esqueleto de semilla determinista en `prisma/seed.ts`: generador pseudoaleatorio de semilla fija, fecha de referencia fija, Despacho "Nuria Lagar Abogados", 3 profesionales y 4 servicios (FR-015, Principio V)

**Checkpoint**: base de datos migrada con RN1 garantizada, utilidades de tiempo/horario y autenticación listas — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Ver la agenda del día y dar de alta una cita (Priority: P1) 🎯 MVP

**Goal**: Secretaría entra con la clave, ve los huecos libres/ocupados de un profesional en un día y da de alta una cita nueva sobre un hueco libre, con o sin ficha de cliente previa.

**Independent Test**: Abrir la agenda del día de un profesional, dar de alta una cita en un hueco libre y comprobar que aparece como ocupada con el fin calculado automáticamente.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estos tests primero y comprobar que fallan antes de implementar**

- [X] T019 [P] [US1] Test unitario de detección de solape RN1 en `tests/unit/reglas/rn1.test.ts`
- [X] T020 [P] [US1] Test unitario de rechazo de inicio en el pasado RN2 en `tests/unit/reglas/rn2.test.ts`
- [X] T021 [P] [US1] Test unitario de cálculo de horario laboral y huecos libres/ocupados en `tests/unit/reglas/horario.test.ts`
- [X] T022 [US1] Test de integración de concurrencia: dos `darDeAltaCita` simultáneas sobre el mismo hueco del mismo profesional, exactamente una tiene éxito (Principio III, gate obligatorio, FR-005, SC-002) en `tests/integration/concurrencia-rn1.test.ts`
- [X] T023 [P] [US1] Test e2e de flujo completo: entrar, ver agenda del día y dar de alta una cita (US1-Escenarios 1-5) en `tests/e2e/agenda.spec.ts`

### Implementation for User Story 1

- [X] T024 [US1] Implementar `obtenerAgendaDia` (`GET /api/agenda?profesionalId&fecha`) en `src/app/api/agenda/route.ts`, usando `horario.ts` (FR-002)
- [X] T025 [US1] Implementar `buscarClientes` (`GET /api/clientes?q=`) en `src/app/api/clientes/route.ts` (FR-013)
- [X] T026 [US1] Implementar server action `darDeAltaCita` en `src/lib/agenda/actions.ts`, aplicando `reglas.ts` y creando ficha de cliente nueva cuando se recibe `clienteNuevo` (FR-003, FR-013)
- [X] T027 [US1] Implementar página de agenda del día con selector de profesional y fecha en `src/app/agenda/page.tsx`
- [X] T028 [P] [US1] Implementar componente de vista de huecos (libres/ocupados) en `src/app/agenda/components/vista-huecos.tsx`
- [X] T029 [P] [US1] Implementar formulario de alta de cita (servicio, cliente, hueco) en `src/app/agenda/components/formulario-alta.tsx`
- [X] T030 [P] [US1] Implementar modal de búsqueda/creación de ficha de cliente en `src/app/agenda/components/modal-cliente.tsx`
- [X] T031 [US1] Traducir los códigos de error `solape`, `en_el_pasado`, `fuera_de_horario` y `cliente_invalido` a mensajes claros en español de España en la UI de alta (FR-014, FR-016)

**Checkpoint**: User Story 1 completamente funcional y probable de forma independiente.

---

## Phase 4: User Story 2 - Marcar el resultado de una cita (Priority: P2)

**Goal**: Secretaría marca una cita reservada como completada, cancelada o no asistida, de forma permanente.

**Independent Test**: Tomar una cita en estado "reservada" y comprobar que cada una de las tres acciones la deja en el estado correspondiente y ya no admite más cambios.

### Tests for User Story 2 ⚠️

- [X] T032 [P] [US2] Test unitario de la máquina de estados de Cita: transiciones válidas desde `reservada` e inmutabilidad de estados finales (FR-009, FR-010) en `tests/unit/reglas/estado.test.ts`
- [X] T033 [P] [US2] Test e2e de cambio de estado (completada, cancelada, no_asistida, y rechazo sobre estado final) (US2-Escenarios 1-4) en `tests/e2e/agenda.spec.ts`

### Implementation for User Story 2

- [X] T034 [US2] Implementar server action `cambiarEstadoCita` en `src/lib/agenda/actions.ts` (FR-008)
- [X] T035 [US2] Añadir validación de transición de estado (`estado_final_inmutable`, `transicion_no_permitida`) a `src/lib/agenda/reglas.ts` (FR-009, FR-010)
- [X] T036 [US2] Añadir controles de UI (botones/badges de estado) para marcar completada/cancelada/no_asistida sobre huecos ocupados en `src/app/agenda/components/vista-huecos.tsx`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Reprogramar una cita reservada (Priority: P3)

**Goal**: Secretaría cambia el profesional, servicio y/o inicio de una cita reservada sin cancelarla y recrearla.

**Independent Test**: Tomar una cita reservada, cambiarle la hora de inicio a otro hueco libre y comprobar que el fin se recalcula y que RN1/RN2 se siguen respetando.

### Tests for User Story 3 ⚠️

- [X] T037 [P] [US3] Test unitario de reprogramación: recálculo de fin y reaplicación de RN1/RN2/horario laboral en `tests/unit/reglas/reprogramar.test.ts`
- [X] T038 [P] [US3] Test e2e de reprogramación (US3-Escenarios 1-4: éxito, solape, pasado, cita no reservada) en `tests/e2e/agenda.spec.ts`

### Implementation for User Story 3

- [X] T039 [US3] Implementar server action `reprogramarCita` en `src/lib/agenda/actions.ts`, reutilizando `reglas.ts` (FR-011, FR-012)
- [X] T040 [US3] Implementar modal de reprogramación (cambio de profesional/servicio/inicio) en `src/app/agenda/components/modal-reprogramar.tsx`
- [X] T041 [US3] Conectar la entrada a reprogramación desde una cita ocupada en `vista-huecos.tsx` con `modal-reprogramar.tsx`

**Checkpoint**: las tres historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Semilla completa, reproducibilidad, accesibilidad y validación final

- [X] T042 Completar `prisma/seed.ts` con ~40 fichas de cliente, 8 semanas de historia (~10% no_asistida, ~8% cancelada) y 2 semanas futuras con reservas, todo determinista (FR-015)
- [X] T043 [P] Implementar script de snapshot de semilla en `prisma/scripts/seed-snapshot.ts` para verificar reproducibilidad
- [X] T044 [P] Test de integración de reproducibilidad de semilla: regenerar dos veces y comparar snapshots sin diferencias (Principio V, SC-004) en `tests/integration/seed-reproducibilidad.test.ts`
- [X] T045 [P] Pasada de accesibilidad WCAG 2.1 AA (contraste 4.5:1, texto redimensionable, navegación por teclado) sobre los componentes de `src/app/agenda/` (FR-016)
- [X] T046 [P] Pasada de estilos responsive (portátil/móvil) sobre la UI de agenda (FR-016)
- [X] T047 [P] Añadir scripts npm (`seed`, `seed:reset`, `seed:snapshot`, `test`, `test:integration`, `test:e2e`, `lint`) en `package.json` según `quickstart.md`
- [X] T048 Ejecutar la validación manual y automatizada completa de `quickstart.md` (US1, US2, US3, concurrencia, reproducibilidad de semilla)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias de usuario
- **User Stories (Phase 3-5)**: todas dependen de Foundational; pueden avanzar en paralelo si hay capacidad, o en orden de prioridad P1 → P2 → P3
- **Polish (Phase 6)**: depende de que las historias deseadas estén completas (T042/T044 dependen del esquema de T010-T011 y de los estados de Cita usados en US1/US2)

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational — sin dependencia de otras historias
- **User Story 2 (P2)**: puede empezar tras Foundational; reutiliza el hueco ocupado mostrado por US1 en la UI (`vista-huecos.tsx`), pero su lógica de servidor es independiente
- **User Story 3 (P3)**: puede empezar tras Foundational; reutiliza `vista-huecos.tsx` como punto de entrada visual, pero su server action y reglas son independientes

### Within Each User Story

- Tests antes de la implementación (deben fallar primero)
- Reglas/lib antes de server actions y route handlers
- Server actions/route handlers antes de componentes de UI que los consumen
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Todas las tareas [P] de Setup (T002-T003, T005-T008) pueden ejecutarse en paralelo
- Dentro de Foundational, T012-T014 y T016-T017 pueden ejecutarse en paralelo (T015 depende de T012-T014)
- Tras completar Foundational, US1, US2 y US3 pueden trabajarse en paralelo si hay varios agentes/desarrolladores (con la salvedad de que comparten `vista-huecos.tsx` y `actions.ts`, ver nota más abajo)
- Dentro de cada historia, los tests marcados [P] pueden ejecutarse en paralelo entre sí
- T028, T029, T030 (componentes de US1) pueden ejecutarse en paralelo

**Nota sobre archivos compartidos**: US1, US2 y US3 añaden funciones distintas al mismo archivo `src/lib/agenda/actions.ts` y modifican el mismo componente `vista-huecos.tsx`; si se trabajan en paralelo, coordinar para evitar conflictos de merge en esos dos archivos.

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de User Story 1:
Task: "Test unitario RN1 en tests/unit/reglas/rn1.test.ts"
Task: "Test unitario RN2 en tests/unit/reglas/rn2.test.ts"
Task: "Test unitario horario laboral en tests/unit/reglas/horario.test.ts"
Task: "Test e2e agenda en tests/e2e/agenda.spec.ts"

# Lanzar juntos los componentes de UI de User Story 1:
Task: "Componente vista-huecos.tsx"
Task: "Componente formulario-alta.tsx"
Task: "Componente modal-cliente.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **PARAR Y VALIDAR**: probar User Story 1 de forma independiente (incluye el test de concurrencia RN1, gate obligatorio del Principio III)
5. Desplegar/demostrar si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. Añadir User Story 1 → probar de forma independiente → desplegar/demo (MVP)
3. Añadir User Story 2 → probar de forma independiente → desplegar/demo
4. Añadir User Story 3 → probar de forma independiente → desplegar/demo
5. Cada historia añade valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y probable de forma independiente
- Verificar que los tests fallan antes de implementar
- Confirmar con el usuario antes de commitear (los hooks `after_tasks`/`after_implement` gestionan el auto-commit según configuración)
- Parar en cada checkpoint para validar la historia de forma independiente

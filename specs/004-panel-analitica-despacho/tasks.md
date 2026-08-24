---

description: "Task list for Panel de Analítica del Despacho"
---

# Tasks: Panel de Analítica del Despacho

**Input**: Design documents from `/specs/004-panel-analitica-despacho/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/panel-analitica.md, quickstart.md

**Tests**: Incluidas. La spec exige explícitamente trazabilidad spec → test
(Principio VI), cifras verificables contra la semilla determinista
(Principio V) y una prueba objetiva de "0 escrituras" (SC-003, FR-006).

**Organization**: Tareas agrupadas por historia de usuario para permitir
implementación y prueba independientes de cada una. Este feature reutiliza
el proyecto Next.js de 001-agenda-citas: no hay tareas de inicialización de
proyecto ni de esquema de base de datos (no se añaden migraciones).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3, US4)
- Cada tarea incluye ruta de archivo exacta

## Path Conventions

Mismo proyecto único full-stack Next.js (App Router) que 001-agenda-citas, según `plan.md`:

```text
src/app/panel/, src/app/(auth)/panel-login/, src/lib/analitica/, src/lib/auth/
tests/unit/analitica/, tests/integration/, tests/e2e/
```

---

## Phase 1: Setup

**Purpose**: Añadir la única dependencia nueva que introduce esta feature (el resto de tooling ya existe de 001-agenda-citas)

- [X] T001 [P] Instalar `recharts` y generar el componente wrapper de gráficos de shadcn/ui (`npx shadcn add chart`) en `src/components/ui/chart.tsx` (research.md §4)

**Checkpoint**: dependencia de gráficos disponible; el resto del entorno (Next.js, Prisma, Tailwind, shadcn/ui, Vitest, Playwright) ya está configurado por 001-agenda-citas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Autenticación de panel independiente de la de secretaría, cálculo de la ventana de 8 semanas completas y el esqueleto de la página protegida — bloquean las 4 historias de usuario, porque todas se muestran dentro de la misma página `/panel`

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [X] T002 [P] Añadir el valor de sesión `"panel"` y la cookie `citaclara_sesion_panel` (independiente de `citaclara_sesion`) en `src/lib/auth/sesion.ts` (research.md §2, FR-001)
- [X] T003 Implementar server actions `entrarComoPanel` y `salirPanel` en `src/lib/auth/actions.ts`, validando la clave contra `despacho.clavePanelHash` con `bcryptjs` (mismo patrón que `entrarComoSecretaria`) (contracts/panel-analitica.md, FR-001) — depende de T002
- [X] T004 [P] Implementar la página de login del panel en `src/app/(auth)/panel-login/page.tsx` (mismo patrón que `src/app/(auth)/login/page.tsx`, clave de panel en vez de clave de secretaría) — depende de T003
- [X] T005 [P] Implementar `obtenerVentana8SemanasCompletas` en `src/lib/analitica/semanas.ts`, reutilizando `diaSemanaMadrid` de `src/lib/tiempo/zona-horaria.ts` (research.md §5, data-model.md `VentanaOchoSemanas`, Assumptions de spec.md)
- [X] T006 Implementar el Server Component protegido `src/app/panel/page.tsx`: redirige a `/panel-login` si la cookie de sesión de panel no es válida, calcula la ventana de 8 semanas (T005), muestra cabecera con botón "Salir" (`salirPanel`) y un contenedor de layout con las 4 secciones (US1-US4) aún vacías — depende de T002, T003, T005

**Checkpoint**: `/panel` protegido y navegable (redirige sin clave, muestra cabecera vacía con clave válida); las 4 historias de usuario pueden empezar en paralelo.

---

## Phase 3: User Story 1 - Ver los ingresos que genera cada servicio (Priority: P1) 🎯 MVP

**Goal**: Jose ve el desglose de ingresos por servicio (citas `completada`, últimas 8 semanas completas), exacto al céntimo.

**Independent Test**: Abrir `/panel` con la clave de panel y comprobar que el desglose de ingresos por servicio coincide, céntimo a céntimo, con la suma de `precioCentimos` de las citas `completada` de la ventana de 8 semanas (p. ej., con la semilla: total 64.025,00 €).

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estos tests primero y comprobar que fallan antes de implementar**

- [X] T007 [P] [US1] Test unitario de `obtenerIngresosPorServicio` contra los importes de la semilla (ventana 2026-06-22 a 2026-08-16: Redacción de contrato 26.280,00 €, Primera consulta 15.600,00 €, Gestión administrativa 11.300,00 €, Consulta de seguimiento 10.845,00 €, total 64.025,00 €) en `tests/unit/analitica/ingresos.test.ts`
- [X] T008 [P] [US1] Test e2e de la sección de ingresos por servicio (entra con clave de panel, ve el desglose y el total) en `tests/e2e/panel.spec.ts`

### Implementation for User Story 1

- [X] T009 [US1] Implementar `obtenerIngresosPorServicio` en `src/lib/analitica/metricas.ts` (agregación Prisma `GROUP BY servicioId`, filtro `estado = 'completada'` y ventana de 8 semanas; servicio sin citas completadas en la ventana aparece con 0,00 €, FR-009) — depende de T005
- [X] T010 [P] [US1] Implementar componente `src/app/panel/components/ingresos-por-servicio.tsx` (gráfico de barras vía `chart.tsx`, importes formateados en euros con céntimos, leyenda clara sin jerga técnica — FR-008; rango de la ventana mostrado en formato inequívoco, p. ej. "22 jun – 16 ago 2026", no ISO crudo, FR-007)
- [X] T011 [US1] Conectar la sección de ingresos por servicio en `src/app/panel/page.tsx` — depende de T006, T009, T010

**Checkpoint**: User Story 1 completamente funcional y probable de forma independiente.

---

## Phase 4: User Story 2 - Ver la ocupación semanal de cada profesional (Priority: P1) 🎯 MVP

**Goal**: Jose ve, para cada profesional y cada una de las últimas 8 semanas completas, qué porcentaje de su horario laboral estuvo ocupado.

**Independent Test**: Abrir `/panel` y comprobar que el porcentaje de ocupación de cada profesional en una semana concreta coincide con los minutos en citas `reservada`/`completada` entre los minutos laborales disponibles (p. ej., con la semilla, semana 2026-06-22: Nuria Lagar 62,8%, David Rayo 68,3%, Jose Lagar 65,6%).

### Tests for User Story 2 ⚠️

- [X] T012 [P] [US2] Test unitario de `obtenerOcupacionSemanal` contra los porcentajes de la semilla (semana 2026-06-22: Nuria Lagar 62,8%, David Rayo 68,3%, Jose Lagar 65,6%) en `tests/unit/analitica/ocupacion.test.ts`
- [X] T013 [P] [US2] Test e2e de la sección de ocupación semanal por profesional en `tests/e2e/panel.spec.ts`

### Implementation for User Story 2

- [X] T014 [US2] Implementar `obtenerOcupacionSemanal` en `src/lib/analitica/metricas.ts`, reutilizando `tramosLaboralesDelDia` de `src/lib/agenda/horario.ts` para los minutos disponibles y sumando minutos de citas `reservada`/`completada` para los ocupados (misma definición que `calcularHuecos`, Assumptions de spec.md) — depende de T005
- [X] T015 [P] [US2] Implementar componente `src/app/panel/components/ocupacion-semanal.tsx` (gráfico de líneas multi-serie, una serie por profesional, eje Y 0-100%; 0% sin error cuando un profesional no tiene citas en una semana, FR-009; etiqueta visible "inactivo" junto al nombre cuando `activo = false`, Edge Case "profesional dado de baja"; etiquetas de semana en formato inequívoco, p. ej. "22 jun 2026", no ISO crudo, FR-007)
- [X] T016 [US2] Conectar la sección de ocupación semanal en `src/app/panel/page.tsx` — depende de T006, T014, T015

**Checkpoint**: User Stories 1 y 2 (ambas P1, MVP) funcionan de forma independiente.

---

## Phase 5: User Story 3 - Ver la tasa de no asistencia de cada profesional (Priority: P2)

**Goal**: Jose ve, para cada profesional, qué porcentaje de sus citas históricas resueltas terminan en "no asistida".

**Independent Test**: Abrir `/panel` y comprobar que la tasa de no asistencia de cada profesional coincide con `no_asistida / (completada + cancelada + no_asistida)` sobre el histórico completo (p. ej., con la semilla: Nuria Lagar 10,85% (42/387), David Rayo 11,84% (47/397), Jose Lagar 8,14% (32/393)).

### Tests for User Story 3 ⚠️

- [X] T017 [P] [US3] Test unitario de `obtenerTasaNoAsistencia` contra los porcentajes de la semilla (Nuria Lagar 10,85%, David Rayo 11,84%, Jose Lagar 8,14%) en `tests/unit/analitica/no-asistencia.test.ts`
- [X] T018 [P] [US3] Test e2e de la sección de tasa de no asistencia en `tests/e2e/panel.spec.ts`

### Implementation for User Story 3

- [X] T019 [US3] Implementar `obtenerTasaNoAsistencia` en `src/lib/analitica/metricas.ts` (agregación Prisma `GROUP BY profesionalId, estado`, histórico completo sin ventana; `porcentaje = null` si `totalHistoricas = 0`, FR-009, FR-010)
- [X] T020 [P] [US3] Implementar componente `src/app/panel/components/tasa-no-asistencia.tsx` (gráfico de barras, una por profesional; estado "sin datos" cuando `porcentaje = null`, FR-009; etiqueta visible "inactivo" junto al nombre cuando `activo = false`, Edge Case "profesional dado de baja")
- [X] T021 [US3] Conectar la sección de tasa de no asistencia en `src/app/panel/page.tsx` — depende de T006, T019, T020

**Checkpoint**: User Stories 1, 2 y 3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Ver la evolución de las últimas 8 semanas (Priority: P2)

**Goal**: Jose ve, por profesional, la evolución semanal de citas totales e ingresos a lo largo de las últimas 8 semanas completas.

**Independent Test**: Abrir `/panel` y comprobar que el gráfico de evolución muestra 8 puntos por profesional y que cada punto coincide con el recuento/suma de esa semana y ese profesional (p. ej., con la semilla, semana 2026-06-22: Nuria Lagar 49 citas / 2.735,00 €, David Rayo 48 citas / 3.130,00 €, Jose Lagar 48 citas / 2.745,00 €); la semana en curso nunca aparece.

### Tests for User Story 4 ⚠️

- [X] T022 [P] [US4] Test unitario de `obtenerEvolucionSemanal` contra citas/ingresos por profesional y semana de la semilla (semana 2026-06-22, los tres profesionales) en `tests/unit/analitica/evolucion.test.ts`
- [X] T023 [P] [US4] Test unitario de `obtenerVentana8SemanasCompletas` (`src/lib/analitica/semanas.ts`): con referencia 2026-08-17 devuelve exactamente los 8 lunes de 2026-06-22 a 2026-08-10 (ventana 2026-06-22 a 2026-08-16) y la semana en curso (la que contiene la referencia) queda excluida (FR-007, Assumptions "Últimas 8 semanas", US4-Escenario 2) en `tests/unit/analitica/semanas.test.ts`
- [X] T024 [P] [US4] Test e2e de la sección de evolución semanal (8 puntos por profesional, 3 series) en `tests/e2e/panel.spec.ts`

### Implementation for User Story 4

- [X] T025 [US4] Implementar `obtenerEvolucionSemanal` en `src/lib/analitica/metricas.ts` (agregación Prisma `GROUP BY profesionalId, semana`, desglosada por profesional — Clarification 2026-08-24) — depende de T005
- [X] T026 [P] [US4] Implementar componente `src/app/panel/components/evolucion-semanal.tsx` (gráfico de líneas multi-serie por profesional, dos métricas — citas e ingresos —, semana con 0 citas/0,00 € sin romper la serie, FR-009; etiquetas de semana en formato inequívoco, p. ej. "22 jun 2026", no ISO crudo, FR-007)
- [X] T027 [US4] Conectar la sección de evolución semanal en `src/app/panel/page.tsx` — depende de T006, T025, T026

**Checkpoint**: las cuatro historias de usuario funcionan de forma independiente; el panel completo está funcional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación objetiva de "solo lectura", accesibilidad, estilos responsive y validación final

- [X] T028 [P] Test de integración de solo lectura (SC-003, FR-006): recuento de filas de `Cita`, `Cliente`, `Profesional` y `Servicio` antes y después de cargar `/panel` y navegar sus 4 secciones, MUST ser idéntico, en `tests/integration/panel-solo-lectura.test.ts`
- [X] T029 [P] Pasada de accesibilidad WCAG 2.1 AA (contraste 4.5:1, leyendas y tooltips navegables por teclado, texto redimensionable) sobre `src/app/panel/` y sus 4 componentes de gráfico (FR-008)
- [X] T030 [P] Pasada de estilos responsive sobre `src/app/panel/page.tsx` y sus componentes: portátil de Jose, **móvil** (FR-008) y pantalla/proyector de reunión, sin métricas cortadas ni solapadas (SC-005)
- [X] T031 Ejecutar la validación manual y automatizada completa de `quickstart.md` (US1-US4, solo lectura, reproducibilidad de semilla)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las 4 historias de usuario (todas viven en la misma página `/panel`)
- **User Stories (Phase 3-6)**: todas dependen de Foundational; pueden avanzar en paralelo si hay capacidad, o en orden de prioridad P1 (US1, US2) → P2 (US3, US4)
- **Polish (Phase 7)**: depende de que las historias deseadas estén completas (T028 en particular requiere que exista `/panel` con al menos alguna sección para tener algo que "cargar y navegar")

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational — sin dependencia de otras historias
- **User Story 2 (P1)**: puede empezar tras Foundational — sin dependencia de otras historias
- **User Story 3 (P2)**: puede empezar tras Foundational — sin dependencia de otras historias
- **User Story 4 (P2)**: puede empezar tras Foundational — sin dependencia de otras historias (su cálculo es independiente de US1/US2/US3 aunque reutilice la misma ventana de 8 semanas de T005)

### Within Each User Story

- Tests antes de la implementación (deben fallar primero)
- Función de métrica en `lib/analitica/metricas.ts` antes que el componente de UI
- Componente de UI antes de conectarlo a `src/app/panel/page.tsx`
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- T001 (Setup) puede ejecutarse de inmediato
- Dentro de Foundational, T002, T004 y T005 pueden ejecutarse en paralelo (T003 depende de T002; T006 depende de T002, T003, T005)
- Tras completar Foundational, US1, US2, US3 y US4 pueden trabajarse en paralelo si hay varios agentes/desarrolladores
- Dentro de cada historia, el test unitario y el test e2e marcados [P] pueden ejecutarse en paralelo entre sí, y el componente de UI marcado [P] puede implementarse en paralelo a la función de métrica
- T028, T029 y T030 (Polish) pueden ejecutarse en paralelo entre sí

**Nota sobre archivos compartidos**: las 4 historias añaden funciones distintas al mismo archivo `src/lib/analitica/metricas.ts` y cada una conecta su sección al mismo `src/app/panel/page.tsx`; si se trabajan en paralelo, coordinar para evitar conflictos de merge en esos dos archivos (mismo patrón ya usado en 001-agenda-citas con `actions.ts`/`vista-huecos.tsx`). El archivo de test e2e `tests/e2e/panel.spec.ts` también es compartido entre T008, T013, T018 y T024.

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de User Story 1:
Task: "Test unitario de obtenerIngresosPorServicio en tests/unit/analitica/ingresos.test.ts"
Task: "Test e2e de la sección de ingresos en tests/e2e/panel.spec.ts"

# El componente de UI puede implementarse en paralelo a la función de métrica:
Task: "Componente ingresos-por-servicio.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 y 2 — ambas P1)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea las 4 historias)
3. Completar Phase 3: User Story 1 (ingresos por servicio)
4. Completar Phase 4: User Story 2 (ocupación semanal)
5. **PARAR Y VALIDAR**: probar US1 y US2 de forma independiente contra las cifras de la semilla — ya es suficiente para una primera demo de renovación (ingresos + ocupación son los dos argumentos comerciales centrales, spec.md)
6. Desplegar/demostrar si está listo

### Incremental Delivery

1. Setup + Foundational → `/panel` protegido y navegable
2. Añadir User Story 1 → probar de forma independiente → desplegar/demo (MVP parcial)
3. Añadir User Story 2 → probar de forma independiente → desplegar/demo (MVP completo, ambos P1)
4. Añadir User Story 3 → probar de forma independiente → desplegar/demo
5. Añadir User Story 4 → probar de forma independiente → desplegar/demo
6. Cada historia añade valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y probable de forma independiente
- Verificar que los tests fallan antes de implementar
- Confirmar con el usuario antes de commitear (los hooks `after_tasks`/`after_implement` gestionan el auto-commit según configuración)
- Parar en cada checkpoint para validar la historia de forma independiente
- No hay tareas de esquema/migración: esta feature es de solo lectura y reutiliza el modelo de datos de 001-agenda-citas sin cambios (data-model.md)

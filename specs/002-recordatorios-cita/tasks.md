---

description: "Task list for Recordatorios de Cita por Email"
---

# Tasks: Recordatorios de Cita por Email

**Input**: Design documents from `/specs/002-recordatorios-cita/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/recordatorios.md, quickstart.md

**Tests**: Incluidas. La spec exige garantías explícitas de deduplicación (FR-004, Principio VI) y de seguridad del token de cancelación (FR-007a); se sigue el mismo criterio de trazabilidad spec → test que en `001-agenda-citas`.

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye ruta de archivo exacta

## Path Conventions

Mismo proyecto único full-stack Next.js (App Router) de `001-agenda-citas`, según `plan.md`:

```text
src/app/, src/lib/, src/components/ui/
scripts/
prisma/
datos/salida-correo/
tests/unit/, tests/integration/, tests/e2e/
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar variables de entorno, script npm y directorio de salida antes de tocar código de negocio

- [X] T001 Añadir variable de entorno `APP_URL` (por defecto `http://localhost:3000`) a `.env.example`, usada para construir el enlace de cancelación (`research.md` §5)
- [X] T002 [P] Añadir script `"recordatorios:enviar": "tsx scripts/enviar-recordatorios.ts"` a `package.json`
- [X] T003 [P] Crear `datos/salida-correo/.gitkeep` y añadir `datos/salida-correo/*.eml` a `.gitignore` (los `.eml` generados no se versionan; el directorio sí)

**Checkpoint**: entorno preparado para las tareas de esquema y lógica de negocio.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de datos, generación de token, construcción de `.eml` y selección de citas — bloquean las tres historias de usuario

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [X] T004 Añadir `model Recordatorio` a `prisma/schema.prisma` según `data-model.md`: `citaId`, `citaInicio`, `estado` (enum `enviado`/`omitido_sin_email`), `token` (nullable, único), `generadoEn`, `canceladoEn` (nullable), relación con `Cita`, restricción `@@unique([citaId, citaInicio])`
- [X] T005 Generar migración Prisma para la tabla `recordatorios` en `prisma/migrations/` (depende de T004)
- [X] T006 [P] Implementar generación de token aleatorio de 32 bytes (`node:crypto`) en `src/lib/recordatorios/token.ts` (Clarification, FR-007a, `research.md` §5)
- [X] T007 [P] Implementar construcción del contenido `.eml` (From/To/Subject/Date/Content-Type/cuerpo, con fecha/hora/profesional/área y enlace de cancelación) en `src/lib/correo/eml.ts`, reutilizando `src/lib/tiempo/zona-horaria.ts` para fechas sin ambigüedad (FR-002, FR-003, FR-010, `research.md` §4, §8)
- [X] T008 Implementar función pura `seleccionarCitasParaRecordar(ahora, citas)` en `src/lib/recordatorios/seleccion.ts`: ventana 24-48h, exclusión de citas no `reservada`, deduplicación por `(citaId, citaInicio)`, detección de cliente sin email (FR-001, FR-004, FR-005, FR-009, FR-012, `contracts/recordatorios.md#seleccionarcitaspararecordar`)
- [X] T009 [P] Definir mensajes de error en español de España (`token_invalido`, `ya_cancelada`, `plazo_agotado`, enlace no válido genérico) en `src/lib/recordatorios/mensajes.ts` (FR-008, Principio VIII)

**Checkpoint**: base de datos migrada con la tabla `Recordatorio`; utilidades de token, `.eml` y selección listas — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Recordatorio automático antes de la cita (Priority: P1) 🎯 MVP

**Goal**: Cada día, el sistema detecta las citas reservadas de las próximas 24-48h y genera para cada una un `.eml` con los datos de la cita en `datos/salida-correo/`, dejando constancia también de las citas cuyo cliente no tiene email.

**Independent Test**: Sembrar citas en distintas fechas, ejecutar `npm run recordatorios:enviar -- --ahora=<instante de prueba>` y comprobar que aparece exactamente un `.eml` por cada cita dentro de la ventana, ninguno para las de fuera ni para las canceladas, y un indicador en `/agenda` para las citas sin email.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estos tests primero y comprobar que fallan antes de implementar**

- [X] T010 [P] [US1] Test unitario de `seleccionarCitasParaRecordar`: citas dentro/fuera de la ventana 24-48h, exclusión de citas no `reservada`, marca de "sin email" (FR-001, FR-005, FR-012) en `tests/unit/recordatorios/seleccion.test.ts`
- [X] T011 [P] [US1] Test unitario de construcción de `.eml`: incluye fecha/hora/profesional/área sin ambigüedad y enlace de cancelación con token (FR-002, FR-006, FR-010) en `tests/unit/recordatorios/eml.test.ts`
- [X] T012 [P] [US1] Test unitario de generación de token: longitud, aleatoriedad, dos tokens consecutivos no correlativos (FR-007a) en `tests/unit/recordatorios/token.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implementar `scripts/enviar-recordatorios.ts`: lee citas `reservada` con sus `Recordatorio` existentes, llama a `seleccionarCitasParaRecordar`; para cada cita con email genera token, crea `Recordatorio(estado="enviado")` y escribe el `.eml` en `datos/salida-correo/`; para cada cita sin email crea `Recordatorio(estado="omitido_sin_email")`; acepta `--ahora=<ISO 8601>` opcional; imprime resumen por stdout (FR-001 a FR-005, FR-009, FR-010, FR-012, `contracts/recordatorios.md#enviarrecordatoriosdeldia`) (depende de T005, T006, T007, T008)
- [X] T014 [US1] Añadir indicador "sin recordatorio enviado" junto a la cita en `src/app/agenda/components/vista-huecos.tsx` cuando exista un `Recordatorio` con `estado="omitido_sin_email"` para el `inicio` vigente de la cita (FR-012, `research.md` §7)

**Checkpoint**: User Story 1 completamente funcional y probable de forma independiente (ejecutar el script sobre la semilla genera los `.eml` correctos).

---

## Phase 4: User Story 2 - Sin recordatorios duplicados (Priority: P1)

**Goal**: Ejecutar el proceso diario varias veces sobre la misma agenda nunca produce más de un recordatorio por cita/fecha, y una reprogramación dentro de ventana sí genera uno nuevo.

**Independent Test**: Ejecutar `npm run recordatorios:enviar` dos veces seguidas con el mismo `--ahora` sobre la misma agenda y comprobar que no aparecen `.eml` nuevos en la segunda ejecución; reprogramar una cita ya notificada y comprobar que sí se genera uno nuevo.

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] Test de integración: ejecutar el proceso dos veces seguidas sobre la misma agenda y comprobar que no se generan `.eml` ni filas `Recordatorio` duplicadas (FR-004, SC-002) en `tests/integration/dedupe-recordatorios.test.ts`
- [X] T016 [P] [US2] Test de integración: reprogramar una cita ya notificada a una nueva fecha dentro de ventana y comprobar que se genera un recordatorio nuevo sin borrar el histórico del anterior (FR-009) en `tests/integration/reprogramacion-recordatorio.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Manejar en `scripts/enviar-recordatorios.ts` la violación de la restricción única `(citaId, citaInicio)` como "ya existe, omitir" en vez de error fatal, de forma que dos ejecuciones concurrentes del proceso también sean seguras (FR-004, `data-model.md`) (depende de T013)

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente y en combinación (repetible, sin duplicados, con reenvío correcto tras reprogramación).

---

## Phase 5: User Story 3 - Cancelación desde el email de recordatorio (Priority: P2)

**Goal**: El cliente que recibió un recordatorio puede cancelar su cita desde el enlace del email, confirmando explícitamente, hasta el inicio de la cita; el hueco queda libre en la agenda.

**Independent Test**: Generar un recordatorio, abrir su enlace `/cancelar-cita/[token]`, confirmar la cancelación y comprobar que la cita pasa a `cancelada` y el hueco vuelve a verse libre en `/agenda`; probar también un enlace tras el inicio de la cita y un token inválido.

### Tests for User Story 3 ⚠️

- [X] T018 [P] [US3] Test de integración de `confirmarCancelacionRecordatorio`: cancelación válida libera el hueco, plazo agotado tras el inicio de la cita, token inválido/inexistente, doble cancelación (FR-006, FR-007, FR-008, `contracts/recordatorios.md#confirmarcancelacionrecordatorio`) en `tests/integration/cancelacion-token.test.ts`
- [X] T019 [P] [US3] Test e2e: abrir el enlace de un `.eml` generado, confirmar la cancelación y comprobar que la cita se libera en `/agenda`; visitar el enlace tras el inicio de la cita y comprobar el mensaje de plazo agotado (US3-Escenarios 1 y 2) en `tests/e2e/cancelar-cita.spec.ts`

### Implementation for User Story 3

- [X] T020 [US3] Implementar server action `confirmarCancelacionRecordatorio` en `src/lib/recordatorios/actions.ts`: valida token existente con `estado="enviado"`, `canceladoEn=null` y `ahora < Cita.inicio`; en éxito cambia `Cita.estado` a `cancelada` (transición ya definida en `001-agenda-citas`) y fija `Recordatorio.canceladoEn` (FR-006, FR-007, FR-008, `contracts/recordatorios.md`) (depende de T004, T009)
- [X] T021 [US3] Implementar página pública `src/app/cancelar-cita/[token]/page.tsx`, sin sesión de secretaría: muestra fecha/hora/profesional/área y botón de confirmación explícito "Sí, cancelar mi cita", o el mensaje correspondiente si el enlace ya no es válido o el plazo está agotado (FR-006, FR-007, FR-007a, FR-008, Principio VII) (depende de T020)

**Checkpoint**: las tres historias de usuario funcionan de forma independiente y combinada.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y trazabilidad de gobernanza

- [X] T022 [P] Ejecutar y verificar manualmente el recorrido completo de `quickstart.md` (US1, US2, US3, reprogramación, cliente sin email, seguridad del token) contra los datos de la semilla determinista
- [X] T023 [P] Ejecutar `npm run lint` y `npm run test` sobre los ficheros nuevos/modificados de esta feature
- [X] T024 Registrar `002-recordatorios-cita` con su propietario único en `specs/MAPA.md` (Principio I)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — bloquea las tres historias de usuario
- **User Stories (Phase 3-5)**: todas dependen de Foundational
  - US1 (P1) y US2 (P1) son ambas MVP-críticas; US2 depende del script creado en US1 (T013) pero es una historia de prueba/robustez independiente de ese mismo comportamiento
  - US3 (P2) depende de que existan recordatorios enviados con token (US1), pero su implementación (página + server action) es un módulo aparte
- **Polish (Phase 6)**: depende de que las historias deseadas estén completas

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational (Phase 2) — sin dependencia de otras historias
- **User Story 2 (P1)**: puede empezar tras Foundational; sus tests ejercitan el script de US1 (T013), así que en la práctica se implementa después de T013, pero no añade lógica nueva de negocio fuera del manejo de conflictos (T017)
- **User Story 3 (P2)**: puede empezar tras Foundational; usa los tokens que genera US1 pero es un módulo de lectura/escritura independiente (página + server action)

### Within Each User Story

- Tests MUST escribirse y fallar antes de implementar
- Utilidades puras (selección, token, `.eml`) antes que el script que las orquesta
- Script/servicio antes que la UI que lo consume
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Todas las tareas de Setup marcadas [P] pueden ejecutarse en paralelo
- T006, T007 y T009 (Foundational) pueden ejecutarse en paralelo entre sí; T008 depende conceptualmente de conocer las entidades de T004 pero no de código de T006/T007
- Los tests marcados [P] dentro de cada historia pueden ejecutarse en paralelo
- US1 y US3 pueden implementarse en paralelo por desarrolladores distintos una vez completado Foundational (US3 solo necesita el contrato de `Recordatorio`, no el script de US1, para sus propios tests de integración con datos de fixture)

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de User Story 1:
Task: "Test unitario de seleccionarCitasParaRecordar en tests/unit/recordatorios/seleccion.test.ts"
Task: "Test unitario de construcción de .eml en tests/unit/recordatorios/eml.test.ts"
Task: "Test unitario de generación de token en tests/unit/recordatorios/token.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. Completar Phase 4: User Story 2 (garantía de no-duplicados, tan crítica como el envío)
5. **PARAR y VALIDAR**: probar US1+US2 de forma independiente contra la semilla
6. Desplegar/demostrar si está listo (el dolor nº1 — no-shows — ya se ataca sin necesidad de US3)

### Incremental Delivery

1. Setup + Foundational → base lista
2. Añadir US1 → probar de forma independiente → demo (recordatorios generándose)
3. Añadir US2 → probar de forma independiente → demo (MVP completo: sin duplicados)
4. Añadir US3 → probar de forma independiente → demo (cancelación autoservicio)
5. Cada historia añade valor sin romper las anteriores

### Parallel Team Strategy

Con varios desarrolladores:

1. El equipo completa Setup + Foundational en conjunto
2. Una vez lista Foundational:
   - Desarrollador A: User Story 1
   - Desarrollador B: User Story 3 (solo necesita el contrato de `Recordatorio`, no esperar a que US1 termine)
3. User Story 2 se aborda tras US1 (comparte el mismo script) antes de dar la feature por completa

---

## Notes

- [P] tareas = archivos distintos, sin dependencias
- [Story] etiqueta cada tarea con su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y probable de forma independiente
- Verificar que los tests fallan antes de implementar
- Confirmar (commit) tras cada tarea o grupo lógico
- Parar en cualquier checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de mismo archivo, dependencias cruzadas entre historias que rompan la independencia

---

description: "Task list for Portal del Cliente"
---

# Tasks: Portal del Cliente

**Input**: Design documents from `/specs/002-portal-cliente-citas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/portal-cliente.md, quickstart.md

**Tests**: Incluidas. La spec exige cancelación atómica bajo condiciones de carrera (FR-008) y trazabilidad spec → test (Principio VI); se sigue el mismo criterio que 001-agenda-citas.

**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y prueba independientes de cada una. Este feature extiende el proyecto ya existente de `001-agenda-citas` (mismo repositorio, sin nuevo Setup de infraestructura).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2)
- Cada tarea incluye ruta de archivo exacta

## Path Conventions

Mismo proyecto único full-stack Next.js 15 (App Router) que `001-agenda-citas`, según `plan.md`:

```text
src/app/portal/, src/app/api/portal/, src/lib/portal/
prisma/schema.prisma, prisma/migrations/
tests/unit/portal/, tests/integration/, tests/e2e/
```

---

## Phase 1: Setup

**Purpose**: No hay inicialización de proyecto nueva (reutiliza `001-agenda-citas`); solo configuración específica de esta feature.

- [X] T001 Añadir a `.env.example` la variable `PORTAL_SESSION_SECRET` (secreto HMAC de la cookie de sesión de cliente, distinto de `SESSION_SECRET` de secretaría) según `quickstart.md`

**Checkpoint**: entorno listo para la feature; nada más que instalar (research.md confirma cero dependencias nuevas).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de datos y utilidades compartidas por ambas historias de usuario

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [X] T002 Añadir a `prisma/schema.prisma` el modelo `SolicitudAccesoCliente` (`clienteId`, `tokenHash`, `expiraEn`, `usadoEn`, `creadoEn`) y el campo `canceladaPor` (enum `secretaria`\|`cliente`, nulo) en `Cita`, según `data-model.md`
- [X] T003 Generar migración Prisma para T002 en `prisma/migrations/`
- [X] T004 [P] Implementar la interfaz `EmailSender` y su implementación de consola (`enviarEnlaceAcceso`, sin proveedor real — research.md §1) en `src/lib/portal/email.ts`
- [X] T005 [P] Implementar generación/validación de token opaco de un solo uso (hash SHA-256, expiración de 15 min) en `src/lib/portal/acceso.ts` (depende de T002/T003)
- [X] T006 [P] Implementar cookie de sesión de cliente firmada (HMAC, mismo patrón que `src/lib/auth/sesion.ts` pero con `clienteId` en el payload y usando `PORTAL_SESSION_SECRET`) en `src/lib/portal/sesion-cliente.ts`
- [X] T007 Implementar cancelación atómica compartida (`UPDATE citas SET estado='cancelada', canceladaPor=$origen WHERE id=$1 AND estado='reservada'`, devolviendo si afectó alguna fila) en `src/lib/agenda/reglas.ts` (depende de T002/T003; research.md §4-§5)

**Checkpoint**: esquema migrado, utilidades de token/sesión/envío y cancelación atómica listas — las historias de usuario pueden empezar.

---

## Phase 3: User Story 1 - Ver mis citas futuras y pasadas (Priority: P1) 🎯 MVP

**Goal**: Un cliente solicita acceso con su teléfono, canjea el enlace de un solo uso y ve sus citas futuras y su historial de citas pasadas, sin cuenta ni contraseña.

**Independent Test**: Solicitar acceso con el teléfono de un cliente de la semilla, canjear el enlace de la consola de desarrollo y comprobar que se ven sus citas futuras y pasadas reales.

### Tests for User Story 1 ⚠️

> **NOTE: Escribir estos tests primero y comprobar que fallan antes de implementar**

- [X] T008 [P] [US1] Test unitario de token de acceso: expira a los 15 min, es de un solo uso, `token_invalido`/`token_expirado`/`token_ya_usado` (FR-001a) en `tests/unit/portal/acceso.test.ts`
- [X] T009 [P] [US1] Test e2e de flujo completo: solicitar acceso, canjear enlace, ver citas futuras y pasadas, ficha sin citas muestra mensaje vacío (US1-Escenarios 1-3) en `tests/e2e/portal.spec.ts`

### Implementation for User Story 1

- [X] T010 [US1] Implementar server action `solicitarAcceso` en `src/lib/portal/acceso.ts`: busca `Cliente` por `telefono` exacto, crea `SolicitudAccesoCliente` por cada coincidencia y envía el enlace vía `EmailSender` (FR-001, research.md §1-§2) (depende de T004, T005)
- [X] T011 [US1] Implementar `canjearAcceso` (`GET /portal/verificar/[token]/route.ts`): valida el token, abre cookie de sesión de cliente y redirige a `/portal/mis-citas` (FR-001, FR-001a) (depende de T005, T006)
- [X] T012 [US1] Implementar `verMisCitas` (`GET /api/portal/mis-citas/route.ts`): lista citas futuras (`reservada`, `inicio > ahora`) con `cancelable` calculado y pasadas (`completada`\|`cancelada`\|`no_asistida`) del cliente de la sesión (FR-002, FR-003, FR-004) (depende de T006)
- [X] T013 [US1] Implementar página de solicitud de acceso con formulario de teléfono en `src/app/portal/solicitar-acceso/page.tsx`
- [X] T014 [US1] Implementar página de listado de citas futuras/pasadas en `src/app/portal/mis-citas/page.tsx`, con mensaje claro cuando no hay citas futuras (US1-Escenario 3)
- [X] T015 [US1] Middleware/guard de sesión de cliente: redirige a `/portal/solicitar-acceso` si no hay cookie de sesión de cliente válida al entrar en `/portal/mis-citas` (FR-002)

**Checkpoint**: User Story 1 completamente funcional y probable de forma independiente (solo lectura, sin cancelación).

---

## Phase 4: User Story 2 - Cancelar una cita futura (Priority: P2)

**Goal**: El cliente cancela una cita futura propia con 24h o más de antelación; el hueco se libera de inmediato y la agenda de secretaría muestra que el origen fue el cliente.

**Independent Test**: Tomar una cita futura `reservada` con 24h+ de antelación, cancelarla desde `/portal/mis-citas` y comprobar que queda `cancelada`, desaparece de las citas futuras activas, y su hueco aparece libre y marcado como "cancelada por el cliente" en la agenda de secretaría.

### Tests for User Story 2 ⚠️

- [X] T016 [P] [US2] Test unitario de la validación de plazo de 24h (`fuera_de_plazo`) y de pertenencia (`cita_no_es_del_cliente`) en `tests/unit/portal/cancelar.test.ts`
- [X] T017 [US2] Test de integración de concurrencia: cancelación simultánea desde el portal y desde la agenda de secretaría sobre la misma cita `reservada`, exactamente una tiene éxito (FR-008) en `tests/integration/concurrencia-cancelacion.test.ts`
- [X] T018 [P] [US2] Test e2e de cancelación: éxito con 24h+, rechazo `fuera_de_plazo` con <24h, cita ya no reservada no ofrece cancelar (US2-Escenarios 1-3) en `tests/e2e/portal.spec.ts`

### Implementation for User Story 2

- [X] T019 [US2] Implementar server action `cancelarCita` en `src/lib/portal/acciones.ts`: valida pertenencia al cliente de la sesión y plazo ≥24h, y delega en la cancelación atómica de `reglas.ts` con `origen='cliente'` (FR-005, FR-006, FR-007, FR-008) (depende de T007, T006)
- [X] T020 [US2] Actualizar `cambiarEstadoCita` (secretaría) en `src/lib/agenda/actions.ts` para usar la cancelación atómica de `reglas.ts` con `origen='secretaria'` cuando el nuevo estado es `cancelada` (FR-007a) (depende de T007)
- [X] T021 [US2] Implementar botón de cancelar con confirmación en `src/app/portal/mis-citas/components/boton-cancelar.tsx`, visible solo si `cancelable` es verdadero, con mensaje claro al rechazar por `fuera_de_plazo` (FR-006, FR-009)
- [X] T022 [US2] Mostrar en `src/app/agenda/components/vista-huecos.tsx` la etiqueta "Cancelada por el cliente" cuando `canceladaPor === 'cliente'` en el historial de una cita cancelada (FR-007a)

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Accesibilidad, responsive y validación final

- [X] T023 [P] Pasada de accesibilidad WCAG 2.1 AA (contraste 4.5:1, texto redimensionable, navegación por teclado) sobre `src/app/portal/` (FR-009, Principio VII)
- [X] T024 [P] Pasada de estilos responsive con prioridad móvil sobre `src/app/portal/` (FR-009)
- [X] T025 Ejecutar la validación manual y automatizada completa de `quickstart.md` (US1, US2, concurrencia de cancelación)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA ambas historias de usuario
- **User Stories (Phase 3-4)**: dependen de Foundational; US1 y US2 pueden avanzar en paralelo si hay capacidad, o en orden de prioridad P1 → P2 (US2 depende funcionalmente de que exista `/portal/mis-citas` de US1 para el botón de cancelar, T021)
- **Polish (Phase 5)**: depende de que US1 y US2 estén completas

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational — sin dependencia de otras historias
- **User Story 2 (P2)**: puede empezar tras Foundational para su lógica de servidor (T019, T020); su UI (T021) depende de la página `mis-citas` de US1 (T014)

### Within Each User Story

- Tests antes de la implementación (deben fallar primero)
- Utilidades de `lib/` antes de server actions/route handlers
- Server actions/route handlers antes de páginas/componentes de UI que los consumen
- Historia completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Dentro de Foundational, T004, T005, T006 pueden ejecutarse en paralelo tras T002/T003; T007 depende del esquema de T002/T003
- Tras completar Foundational, los tests de US1 (T008, T009) pueden lanzarse en paralelo
- T010, T011, T012 comparten la utilidad de sesión/token pero tocan archivos distintos y pueden avanzar en paralelo una vez T004-T006 están listas
- T016 y T018 (tests de US2) pueden ejecutarse en paralelo; T017 (integración) requiere que T019 y T020 existan primero

**Nota sobre archivos compartidos**: T020 (US2) modifica `src/lib/agenda/actions.ts`, ya existente de 001-agenda-citas; coordinar con cualquier trabajo paralelo sobre ese archivo para evitar conflictos de merge.

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de User Story 1:
Task: "Test unitario de token de acceso en tests/unit/portal/acceso.test.ts"
Task: "Test e2e de flujo completo en tests/e2e/portal.spec.ts"

# Lanzar juntas las server actions/route handlers de User Story 1:
Task: "solicitarAcceso en src/lib/portal/acceso.ts"
Task: "canjearAcceso en src/app/portal/verificar/[token]/route.ts"
Task: "verMisCitas en src/app/api/portal/mis-citas/route.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea ambas historias)
3. Completar Phase 3: User Story 1
4. **PARAR Y VALIDAR**: probar User Story 1 de forma independiente (solicitar acceso, canjear enlace, ver citas)
5. Desplegar/demostrar si está listo (reduce ya las llamadas de "¿cuándo es mi cita?")

### Incremental Delivery

1. Setup + Foundational → base lista
2. Añadir User Story 1 → probar de forma independiente → desplegar/demo (MVP)
3. Añadir User Story 2 → probar de forma independiente (incluye el test de concurrencia de cancelación) → desplegar/demo
4. Cada historia añade valor sin romper la anterior

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y probable de forma independiente
- Verificar que los tests fallan antes de implementar
- Confirmar con el usuario antes de commitear (los hooks `after_tasks`/`after_implement` gestionan el auto-commit según configuración)
- Parar en cada checkpoint para validar la historia de forma independiente

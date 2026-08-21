# Feature Specification: Núcleo de Agenda de CitaClara

**Feature Branch**: `001-agenda-citas`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Núcleo de agenda de CitaClara. Contexto: despacho de abogados pequeño (2-5 profesionales); la secretaría gestiona la agenda; los clientes, de momento, solo existen como fichas. Alcance de la 001: entidades (despacho, profesionales, servicios, clientes, citas); regla de solape RN1 y regla de pasado RN2; interfaz de agenda del día para secretaría con alta, reprogramación y cambios de estado de citas; semilla determinista con Nuria Lagar Abogados, 3 profesionales, 4 servicios, ~40 clientes, 8 semanas de historia y 2 semanas futuras. Fuera de alcance: acceso del cliente, recordatorios, analítica, pagos online."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la agenda del día y dar de alta una cita (Priority: P1)

Secretaría entra en la agenda con la clave de secretaría, elige un profesional y una fecha, y ve de un vistazo qué huecos están libres y cuáles ocupados dentro del horario laboral del despacho. Sobre un hueco libre, da de alta una cita nueva eligiendo profesional, servicio y cliente (buscando una ficha existente o creando una nueva si el cliente no está registrado todavía).

**Why this priority**: Es el motivo de ser de la agenda: sin esto, secretaría no puede reservar ni ver la ocupación real de cada profesional. Es el mínimo producto viable.

**Independent Test**: Puede probarse por completo abriendo la agenda del día de un profesional, dando de alta una cita en un hueco libre y comprobando que aparece reflejada como ocupada con la hora de fin calculada automáticamente.

**Acceptance Scenarios**:

1. **Given** secretaría ha entrado con la clave de secretaría y selecciona un profesional y el día de hoy, **When** abre la agenda del día, **Then** ve todos los huecos del horario laboral (09:00–14:00 y 16:00–20:00) marcados como libres u ocupados, sin ambigüedad de hora ni de fecha.
2. **Given** un hueco libre de 30 minutos para un profesional, **When** secretaría da de alta una cita eligiendo ese profesional, un servicio de 30 minutos y un cliente existente, **Then** la cita queda registrada en estado "reservada" con el fin calculado como inicio + 30 minutos, y el hueco pasa a mostrarse como ocupado.
3. **Given** secretaría está dando de alta una cita para un cliente que no tiene ficha todavía, **When** introduce nombre, apellidos, teléfono y email nuevos, **Then** el sistema crea la ficha de cliente y la asocia a la cita nueva.
4. **Given** una cita reservada o completada ya ocupa un hueco de un profesional, **When** secretaría intenta dar de alta otra cita que se solapa con ese hueco para el mismo profesional (RN1), **Then** el sistema rechaza el alta con un mensaje claro y no se crea ninguna cita nueva.
5. **Given** la hora actual es posterior al inicio propuesto, **When** secretaría intenta dar de alta una cita en el pasado (RN2), **Then** el sistema rechaza el alta con un mensaje claro.

---

### User Story 2 - Marcar el resultado de una cita (Priority: P2)

Según transcurre el día, secretaría marca cada cita reservada como completada (el cliente fue atendido), cancelada (se anuló de antemano) o no asistida (el cliente no se presentó a una cita que seguía reservada).

**Why this priority**: Sin este cierre, la agenda queda llena de citas "reservadas" que ya pasaron y la ocupación real del despacho deja de ser fiable, además de perder la información de negocio (no asistencia, cancelación).

**Independent Test**: Puede probarse por completo tomando una cita en estado "reservada" y comprobando que cada una de las tres acciones (completada, cancelada, no asistida) la deja en el estado correspondiente y ya no admite más cambios de estado.

**Acceptance Scenarios**:

1. **Given** una cita en estado "reservada", **When** secretaría la marca como completada, **Then** la cita queda en estado "completada" de forma permanente.
2. **Given** una cita en estado "reservada", **When** secretaría la marca como cancelada, **Then** la cita queda en estado "cancelada" de forma permanente y el hueco vuelve a mostrarse como libre.
3. **Given** una cita en estado "reservada" cuyo cliente no se presentó, **When** secretaría la marca como no asistida, **Then** la cita queda en estado "no_asistida" de forma permanente.
4. **Given** una cita ya en un estado final (completada, cancelada o no_asistida), **When** secretaría intenta cambiar su estado de nuevo, **Then** el sistema rechaza el cambio porque el estado final es inmutable.

---

### User Story 3 - Reprogramar una cita reservada (Priority: P3)

Un cliente pide cambiar su cita. Secretaría localiza la cita reservada y le cambia el profesional, el servicio y/o la hora de inicio, sin tener que cancelarla y crear una nueva desde cero.

**Why this priority**: Mejora el flujo de trabajo diario de secretaría, pero el despacho puede operar (de forma más incómoda, cancelando y creando de nuevo) sin esta función, por lo que es de menor prioridad que el alta y el cierre de citas.

**Independent Test**: Puede probarse por completo tomando una cita reservada, cambiándole la hora de inicio a otro hueco libre del mismo o de otro profesional, y comprobando que el fin se recalcula y que las reglas RN1/RN2 se siguen respetando.

**Acceptance Scenarios**:

1. **Given** una cita reservada y un hueco libre distinto para el mismo profesional, **When** secretaría reprograma la cita a ese hueco, **Then** la cita conserva su identidad y su cliente, y su inicio/fin y hueco ocupado se actualizan.
2. **Given** una cita reservada, **When** secretaría la reprograma a un hueco que se solapa con otra cita reservada o completada del mismo profesional (RN1), **Then** el sistema rechaza la reprogramación y la cita original permanece sin cambios.
3. **Given** una cita reservada, **When** secretaría intenta reprogramarla a un inicio anterior al instante actual (RN2), **Then** el sistema rechaza la reprogramación.
4. **Given** una cita que ya está completada, cancelada o no asistida, **When** secretaría intenta reprogramarla, **Then** el sistema rechaza la operación porque solo las citas reservadas se pueden reprogramar.

---

### Edge Cases

- Dos altas o dos reprogramaciones piden el mismo hueco del mismo profesional casi al mismo tiempo (condición de carrera): el sistema MUST registrar solo una de las dos y rechazar la otra con un mensaje claro (RN1).
- Secretaría intenta dar de alta o reprogramar una cita con un inicio fuera del horario laboral del despacho: el sistema rechaza la operación.
- Secretaría intenta marcar como "no asistida" una cita que ya está completada o cancelada: el sistema lo rechaza, porque "no asistida" solo aplica a una cita que seguía reservada.
- Se busca una ficha de cliente por nombre/apellidos/teléfono y existen varias coincidencias parciales: secretaría debe poder distinguirlas antes de asociar una a la cita.
- Se genera la semilla de datos dos veces seguidas: los mismos profesionales, servicios, clientes, citas, importes y porcentajes de no asistencia/cancelación MUST resultar exactamente iguales ambas veces.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a secretaría autenticarse en la interfaz de agenda mediante una clave de secretaría propia del despacho, distinta de la clave de panel del despacho (reservada para funciones administrativas futuras, fuera de alcance de esta spec).
- **FR-002**: El sistema MUST mostrar, para un profesional y una fecha seleccionados, la agenda del día con los huecos libres y ocupados dentro del horario laboral del despacho (09:00–14:00 y 16:00–20:00, de lunes a viernes), sin ambigüedad de fecha, hora ni zona horaria.
- **FR-003**: El sistema MUST permitir a secretaría dar de alta una cita nueva eligiendo profesional, servicio, cliente (existente o de ficha nueva) y hora de inicio, y MUST calcular automáticamente la hora de fin como inicio + duración del servicio elegido.
- **FR-004**: El sistema MUST rechazar la creación o reprogramación de una cita cuyo intervalo [inicio, fin) se solape con otra cita en estado reservada o completada del mismo profesional (RN1).
- **FR-005**: El sistema MUST garantizar RN1 también bajo condiciones de carrera: si dos solicitudes (alta o reprogramación) piden casi simultáneamente el mismo hueco del mismo profesional, el sistema MUST registrar como máximo una de ellas y rechazar el resto con un mensaje claro.
- **FR-006**: El sistema MUST rechazar la creación o reprogramación de una cita cuyo inicio sea anterior al instante actual (RN2).
- **FR-007**: El sistema MUST rechazar la creación o reprogramación de una cita cuyo intervalo caiga fuera del horario laboral del despacho.
- **FR-008**: El sistema MUST permitir a secretaría marcar una cita en estado "reservada" como completada, cancelada o no asistida.
- **FR-009**: El sistema MUST impedir cualquier cambio de estado sobre una cita que ya esté en un estado final (completada, cancelada o no_asistida): el estado final MUST ser inmutable.
- **FR-010**: El sistema MUST restringir el estado "no_asistida" exclusivamente a citas que seguían en estado "reservada" en el momento de marcarlas.
- **FR-011**: El sistema MUST permitir a secretaría reprogramar una cita en estado "reservada" cambiando su profesional, servicio y/o inicio, recalculando el fin y aplicando las mismas validaciones RN1, RN2 y de horario laboral que en el alta.
- **FR-012**: El sistema MUST rechazar la reprogramación de una cita que no esté en estado "reservada".
- **FR-013**: El sistema MUST mantener fichas de cliente (nombre, apellidos, teléfono, email) reutilizables entre citas, permitiendo a secretaría buscar una ficha existente o crear una nueva al dar de alta una cita, sin dar acceso alguno al propio cliente sobre el sistema.
- **FR-014**: El sistema MUST mostrar todas las fechas, horas e importes sin ambigüedad y en español de España, incluyendo formato de fecha/hora y símbolo de moneda (€).
- **FR-015**: El sistema MUST poder poblarse mediante una semilla determinista que genera siempre el mismo despacho (Nuria Lagar Abogados), los mismos 3 profesionales, los mismos 4 servicios, unas ~40 fichas de cliente, 8 semanas de historia (~10% de citas no asistidas, ~8% canceladas) y 2 semanas futuras con reservas, reproduciendo exactamente los mismos datos en cada regeneración.
- **FR-016**: La interfaz de secretaría MUST ser utilizable sin formación previa ni manual, con textos libres de jerga técnica, contraste y tamaños de texto accesibles, y MUST funcionar correctamente tanto en portátil como en móvil.

### Key Entities

- **Despacho**: el bufete que opera CitaClara (p. ej. "Nuria Lagar Abogados"). Tiene una clave de panel propia para autenticación administrativa simplificada (fuera de alcance funcional en esta spec, más allá de existir como campo).
- **Profesional**: persona del despacho que atiende citas. Tiene nombre y especialidad (p. ej. abogado, administración), y pertenece a un despacho.
- **Servicio**: tipo de cita que un profesional puede ofrecer. Tiene nombre, duración en minutos y precio en euros.
- **Cliente**: ficha de la persona atendida por el despacho. Tiene nombre, apellidos, teléfono y email; no tiene acceso propio al sistema.
- **Cita**: une un profesional, un servicio y un cliente, con un inicio y un fin (fin = inicio + duración del servicio). Tiene un estado que evoluciona de "reservada" a exactamente uno de "completada", "cancelada" o "no_asistida", de forma permanente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Secretaría completa el alta de una cita nueva sobre un hueco libre en menos de 1 minuto desde que abre la agenda del día.
- **SC-002**: El sistema impide el 100% de los intentos de crear o reprogramar una cita solapada con otra reservada o completada del mismo profesional, incluidos los intentos simultáneos sobre el mismo hueco.
- **SC-003**: El sistema rechaza el 100% de los intentos de crear o reprogramar una cita con inicio en el pasado.
- **SC-004**: Regenerando la semilla de datos, el 100% de las cifras (importes, número de citas, porcentajes de no asistencia y de cancelación) coinciden exactamente con la ejecución anterior.
- **SC-005**: Una persona sin formación previa identifica visualmente los huecos libres y ocupados de un profesional en menos de 5 segundos de mirar la pantalla.
- **SC-006**: El 100% de las citas marcadas como no asistida corresponden a citas que estaban en estado reservada justo antes de marcarlas (ninguna completada o cancelada se puede marcar como no asistida).

## Assumptions

- El despacho operativo en esta spec es una única instancia (Nuria Lagar Abogados), aunque el modelo de datos no impide dar de alta más de un despacho en el futuro.
- "Auth simplificada v1, deuda consciente" significa una clave compartida por rol (clave de panel del despacho y clave de secretaría), sin usuarios individuales ni permisos granulares; se documenta como deuda técnica asumida a propósito, a resolver en una spec futura de autenticación.
- El horario laboral (09:00–14:00 y 16:00–20:00, lunes a viernes) es el mismo para los tres profesionales en esta spec; horarios individuales por profesional quedan fuera de alcance de la 001.
- Ninguna cita implica a más de un profesional ni a más de un servicio a la vez.
- Cancelar o marcar una cita como no asistida no dispara ninguna notificación al cliente (los recordatorios son una spec propia, fuera de alcance).
- La creación y edición de fichas de cliente es responsabilidad de secretaría dentro de esta misma interfaz de agenda; no existe portal de autoservicio para el cliente en esta spec.

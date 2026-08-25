# Feature Specification: Portal del Cliente

**Feature Branch**: `002-portal-cliente-citas`

**Created**: 2026-08-24

**Status**: Implementada

**Input**: User description: "Portal del cliente. Los clientes del despacho quieren ver sus citas y cancelarlas sin llamar por teléfono (Jose, recepción de Nuria Lagar Abogados, dedica \"la mitad de la mañana\" a esto). Alcance: un cliente accede a una página personal moderna donde ve sus citas futuras y pasadas y puede cancelar una cita futura. Interfaz limpia y responsive, pensada para móvil. Preguntas que la spec debe dejar decididas (formuladas cerradas, para Jose): cómo accede el cliente sin crear cuentas ni contraseñas, hasta cuándo puede cancelar, y qué pasa con el hueco liberado. Datos: citar casos reales de la semilla en los ejemplos. Fuera de alcance v1: reservar o mover citas online, pagos."

## Clarifications

### Session 2026-08-24

- Q: ¿Cómo accede el cliente a su página personal sin crear cuenta ni contraseña? → A: Enlace de acceso temporal que el cliente solicita cada vez introduciendo su teléfono, y que recibe como enlace/código de un solo uso (envío fuera del alcance técnico de esta spec de UI; ver FR-001 y Assumptions).
- Q: ¿Hasta cuándo antes del inicio de la cita puede cancelarla el cliente? → A: Hasta 24 horas antes del inicio de la cita.
- Q: ¿Qué ocurre con el hueco liberado cuando el cliente cancela? → A: El hueco queda libre de inmediato en la agenda de secretaría, igual que en una cancelación hecha por secretaría, y además la agenda muestra visualmente que el origen de esa cancelación fue el propio cliente.

### Session 2026-08-24 (revisión cruzada con 003)

- Q: 003-recordatorios-cita añade un segundo canal de autocancelación (el enlace del email de recordatorio). ¿Qué plazo de antelación aplica ahí? → A: El mismo plazo de 24 horas que define esta spec (FR-006): es la política única de "cancelación por autoservicio del cliente", propiedad de esta spec, y 003 la reutiliza en vez de fijar su propio plazo. Ver [[000-revision-cruzada-agosto2026]].
- Q: ¿El marcador de "origen cliente" de FR-007a cubre solo las cancelaciones desde el portal, o también las del email de recordatorio? → A: Cubre cualquier cancelación de origen cliente, sea cual sea el canal (portal o email); el campo de origen en sí lo define y almacena 001-agenda-citas (FR-017 de esa spec), y esta spec y 003 lo escriben con su valor correspondiente (`cliente_portal` / `cliente_email`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver mis citas futuras y pasadas (Priority: P1)

Un cliente del despacho (por ejemplo, Laura García Fernández) quiere saber cuándo es su próxima cita sin llamar a recepción. Accede a su página personal y ve, de un vistazo, sus citas futuras (profesional, servicio, fecha y hora) y su historial de citas pasadas (incluyendo si asistió, no asistió o canceló).

**Why this priority**: Es el valor mínimo del portal: si el cliente ni siquiera puede consultar sus citas sin llamar, el portal no reduce nada de la carga de recepción. Sin esto no hay producto.

**Independent Test**: Puede probarse por completo accediendo a la página personal de un cliente con citas futuras y pasadas en la semilla y comprobando que ambos listados se muestran correctamente, sin ambigüedad de fecha ni hora.

**Acceptance Scenarios**:

1. **Given** un cliente con al menos una cita futura registrada (p. ej. una cita reservada con David Rayo dentro de las 2 semanas futuras de la semilla), **When** accede a su página personal, **Then** ve esa cita con profesional, servicio, fecha y hora de inicio, sin ambigüedad de zona horaria.
2. **Given** un cliente con historial de citas pasadas (completadas, canceladas o no asistidas dentro de las 8 semanas de historia de la semilla), **When** accede a su página personal, **Then** ve ese historial con el estado final de cada cita claramente indicado.
3. **Given** un cliente sin ninguna cita futura, **When** accede a su página personal, **Then** ve un mensaje claro de que no tiene citas próximas, sin que la ausencia de citas parezca un error.

---

### User Story 2 - Cancelar una cita futura (Priority: P2)

El mismo cliente necesita anular una cita próxima. Desde su página personal, localiza la cita futura y la cancela sin tener que llamar a recepción.

**Why this priority**: Es la segunda mitad del problema que motiva la feature (Jose dedica media mañana a gestionar cancelaciones por teléfono). Depende de la User Story 1 (el cliente primero necesita ver la cita) pero aporta el ahorro de tiempo real a recepción.

**Independent Test**: Puede probarse por completo tomando una cita futura en estado "reservada" de un cliente, cancelándola desde la página personal y comprobando que queda en estado "cancelada" y ya no aparece como cancelable.

**Acceptance Scenarios**:

1. **Given** una cita futura en estado "reservada" dentro del plazo de cancelación permitido, **When** el cliente pulsa cancelar y confirma, **Then** la cita pasa a estado "cancelada" de forma permanente y deja de aparecer en el listado de citas futuras activas.
2. **Given** una cita futura cuyo inicio está a menos de 24 horas del instante actual, **When** el cliente intenta cancelarla, **Then** el sistema no permite la cancelación y explica el motivo con un mensaje claro, indicando que debe llamar al despacho para gestionarlo dentro de ese plazo.
3. **Given** una cita ya pasada o ya cancelada, **When** el cliente la ve en su historial, **Then** no se le ofrece ninguna acción de cancelar sobre ella.
4. **Given** el cliente cancela una cita futura, **When** la cancelación se confirma, **Then** el hueco queda libre de inmediato en la agenda de secretaría y la agenda muestra visualmente que el origen de la cancelación fue el propio cliente.

---

### Edge Cases

- El cliente intenta cancelar una cita que ya no está en estado "reservada" (p. ej. otra pestaña o secretaría la marcó como completada, no asistida o cancelada mientras tanto): el sistema MUST rechazar la cancelación y mostrar el estado actual real de la cita, sin dejar la interfaz en un estado inconsistente.
- El cliente accede a la página personal sin tener ninguna cita en el sistema (ficha nueva sin historial): el sistema MUST mostrar listados vacíos con un mensaje claro, nunca un error.
- El enlace de acceso de un cliente se comparte accidentalmente con otra persona: el acceso MUST limitarse en todo momento a las citas de ese único cliente, sin exponer nunca citas de otros clientes del despacho.
- El cliente intenta cancelar la misma cita dos veces casi a la vez (doble clic, dos pestañas): el sistema MUST aplicar la cancelación como máximo una vez y responder de forma coherente en el segundo intento (p. ej. informando de que ya está cancelada), sin duplicar efectos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a un cliente solicitar acceso a su página personal introduciendo su teléfono, y MUST concederle acceso mediante un enlace o código de un solo uso emitido para esa solicitud, sin exigir en ningún caso la creación de una cuenta ni el establecimiento de una contraseña.
- **FR-001a**: El enlace o código de acceso de un solo uso MUST caducar tras su uso o transcurrido un tiempo limitado desde su emisión, de forma que no quede utilizable indefinidamente.
- **FR-002**: El sistema MUST mostrar en la página personal del cliente únicamente sus propias citas, nunca las de otros clientes del despacho.
- **FR-003**: El sistema MUST listar las citas futuras del cliente (estado "reservada" con inicio posterior al instante actual) con profesional, servicio, fecha y hora de inicio, usando la zona horaria Europe/Madrid (CET/CEST) sin ambigüedad, en línea con el resto del sistema.
- **FR-004**: El sistema MUST listar el historial de citas pasadas del cliente (completadas, canceladas o no asistidas) con su estado final claramente indicado.
- **FR-005**: El sistema MUST permitir al cliente cancelar una cita propia en estado "reservada" cuyo inicio esté a 24 horas o más del instante actual, y MUST dejarla en estado "cancelada" de forma permanente (mismo estado final que usa secretaría, reutilizando las reglas ya definidas para la agenda).
- **FR-006**: El sistema MUST rechazar la cancelación de una cita que no esté en estado "reservada" o cuyo inicio esté a menos de 24 horas del instante actual, explicando el motivo al cliente en un mensaje claro e indicando que debe contactar con el despacho para gestionarla dentro de ese plazo. Este plazo de 24 horas es la política única de "cancelación por autoservicio del cliente" del sistema: cualquier otro canal de autocancelación del cliente que se añada en el futuro (p. ej. el enlace de cancelación del email de recordatorio de 003-recordatorios-cita) MUST aplicar este mismo plazo en lugar de definir uno propio.
- **FR-007**: El sistema MUST liberar el hueco de una cita cancelada por el cliente de la misma forma que libera el hueco de una cancelación hecha por secretaría, de modo que la agenda de secretaría refleje el hueco como libre inmediatamente tras la cancelación.
- **FR-007a**: La agenda de secretaría MUST distinguir visualmente una cita cancelada por el cliente de una cancelada por secretaría, de forma que quede claro el origen de la cancelación al consultar el historial de la agenda. Esta distinción MUST cubrir cualquier canal de origen cliente (portal, o el email de recordatorio de 003-recordatorios-cita), reutilizando el campo de origen de cancelación que define 001-agenda-citas (FR-017 de esa spec) en vez de introducir un mecanismo propio.
- **FR-008**: El sistema MUST garantizar que, ante dos intentos de cancelar la misma cita casi simultáneamente (desde el portal, desde la agenda de secretaría, desde el email de recordatorio, o cualquier combinación de ellos a la vez), la cita quede cancelada como máximo una vez, sin efectos duplicados ni inconsistencias de estado. Esta garantía es una instancia concreta de la regla general de idempotencia de transiciones de estado que define 001-agenda-citas (FR-018 de esa spec).
- **FR-009**: La página personal del cliente MUST ser utilizable sin formación previa ni manual, con textos libres de jerga técnica, en español de España, y MUST funcionar correctamente en móvil (prioritario) y en escritorio.
- **FR-010**: El sistema NO MUST ofrecer en esta feature ninguna función de reserva o modificación de hora de citas ni de pago; la única acción disponible sobre una cita futura es su cancelación.

### Key Entities

- **Cliente**: ficha ya existente del despacho (nombre, apellidos, teléfono, email). Esta feature añade la capacidad de que el propio cliente acceda a una vista de sus citas sin credenciales tradicionales.
- **Cita**: entidad ya existente (profesional, servicio, cliente, inicio, fin, estado). Esta feature añade la posibilidad de que el cambio de estado "reservada" → "cancelada" lo origine el propio cliente, no solo secretaría, respetando las mismas reglas de estado final inmutable ya vigentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente encuentra su próxima cita en su página personal en menos de 10 segundos desde que accede.
- **SC-002**: Un cliente completa la cancelación de una cita futura elegible en menos de 30 segundos desde que accede a su página personal, sin necesidad de llamar por teléfono.
- **SC-003**: El sistema impide el 100% de los intentos de cancelación fuera del plazo permitido o sobre citas que ya no están en estado "reservada".
- **SC-004**: Tras una cancelación hecha por el cliente, el hueco correspondiente aparece como libre en la agenda de secretaría de forma inmediata, sin intervención manual.
- **SC-005**: El tiempo que recepción dedica a gestionar consultas y cancelaciones de citas por teléfono se reduce de forma medible frente a la situación actual ("media mañana" dedicada a esta tarea).

## Assumptions

- El acceso del cliente reutiliza los datos de cliente ya sembrados (nombre, apellidos, teléfono, email); no se introduce en esta feature ningún campo de contraseña ni gestión de altas de usuario.
- El enlace/código de acceso de un solo uso se solicita con el teléfono del cliente (dato ya existente en su ficha); el canal concreto de entrega (SMS, email u otro) y los detalles técnicos de generación y caducidad son decisión del plan de esta feature, no de esta spec. Esta spec es la propietaria del patrón general "token de acceso de cliente sin contraseña" (un solo uso, caducidad limitada, imposible de adivinar); otras features que necesiten un token de acceso de cliente para una acción puntual (p. ej. el token de cancelación por cita del email de recordatorio en 003-recordatorios-cita) MUST aplicar el mismo nivel de entropía y caducidad que este patrón, en vez de fijar su propio criterio de seguridad.
- La cancelación hecha por el cliente deja la cita en exactamente el mismo estado final "cancelada" que ya existe para las cancelaciones de secretaría (001-agenda-citas); lo único nuevo es que la agenda de secretaría MUST poder mostrar que el origen de esa cancelación concreta fue el cliente (FR-007a), sin crear un estado adicional en el ciclo de vida de la cita.
- No se envían notificaciones adicionales (confirmación de cancelación, recordatorios) al despacho ni al cliente como parte de esta feature, más allá del propio enlace/código de acceso de FR-001; los recordatorios son una spec propia, fuera de alcance.
- Reservar o mover una cita online, y cualquier funcionalidad de pago, quedan explícitamente fuera de alcance de esta v1 del portal del cliente.
- El plazo de cancelación (24 horas) y el mecanismo de acceso sin contraseña aplican por igual a todos los clientes del único despacho existente (Nuria Lagar Abogados); no hay configuración por despacho en esta spec.

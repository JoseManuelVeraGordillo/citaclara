# Feature Specification: Recordatorios de Cita por Email

**Feature Branch**: `003-recordatorios-cita`

**Created**: 2026-08-24

**Status**: Implementada

**Input**: User description: "Recordatorios de cita. El dolor número uno del cliente piloto: la no asistencia. Alcance: un proceso diario genera un recordatorio por email para cada cita reservada de las próximas 24-48 horas, sin duplicar envíos; el email incluye los datos de la cita y una forma de que el cliente cancele si no va a ir (mejor un hueco libre que un no-show). Correo en modo simulado sin SMTP configurado: se escriben ficheros .eml en datos/salida-correo/. Preguntas cerradas para Jose: antelación exacta, qué pasa si el paciente cancela desde el email y con cuánta antelación puede, y si el recordatorio se reenvía cuando la cita se mueve. Fuera de alcance v1: SMS y WhatsApp."

## Clarifications

### Session 2026-08-24

- Q: ¿Necesita el enlace de cancelación del email llevar un identificador seguro e impredecible, para que nadie que no sea el cliente pueda adivinar el enlace de otra cita y cancelarla por error o malicia? → A: Sí, el enlace incluye un token único e impredecible por cita/recordatorio, imposible de adivinar, con el mismo nivel de entropía y caducidad que el patrón de token de acceso sin contraseña definido en 002-portal-cliente-citas (ver FR-007a).
- Q: Cuando una cita se reprograma fuera de la ventana de 24-48h después de haberse enviado ya su recordatorio, ¿debe pasar algo con ese recordatorio ya enviado? → A: No se hace nada especial: queda como histórico y, cuando la nueva fecha vuelva a entrar en ventana, se genera uno nuevo con normalidad (FR-009).

### Session 2026-08-24 (revisión cruzada con 001/002)

- Q: ¿Qué pasa si una cita dentro de la ventana tiene un cliente sin email registrado? → A: No puede ocurrir: 001-agenda-citas exige email obligatorio al crear la ficha de cliente (FR-013 de esa spec, confirmado en su modelo de datos), así que esta rama queda eliminada de la spec (se retira la clarificación original y FR-012); ver [[000-revision-cruzada-agosto2026]].
- Q: ¿Con cuánta antelación puede cancelar el cliente desde el enlace del email? → A: Se corrige a las mismas 24 horas antes del inicio que ya exige el portal del cliente (002-portal-cliente-citas, FR-006), en vez del plazo "hasta el inicio de la cita" que tenía esta spec inicialmente: es una única política de cancelación por autoservicio del cliente, propiedad de 002, y este canal la reutiliza.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recordatorio automático antes de la cita (Priority: P1)

Cada día, el sistema revisa las citas reservadas y envía un recordatorio por email a cada cliente cuya cita cae dentro de la ventana de antelación configurada (24-48 horas antes), de forma que el cliente no olvide que tiene cita y se reduzca la no asistencia.

**Why this priority**: Es el dolor número uno del cliente piloto (el despacho); sin este recordatorio no hay reducción de no-shows y el resto de la feature no tiene sentido.

**Independent Test**: Se puede probar generando una agenda con citas en distintas fechas, ejecutando el proceso diario y verificando que se genera exactamente un fichero `.eml` por cada cita dentro de la ventana, con los datos correctos de la cita, y ninguno para las citas fuera de la ventana.

**Acceptance Scenarios**:

1. **Given** una cita reservada cuya fecha/hora cae dentro de la ventana de antelación configurada, **When** se ejecuta el proceso diario de recordatorios, **Then** se genera un fichero `.eml` en `datos/salida-correo/` con los datos de la cita (fecha, hora, profesional, cliente y área) y el resultado queda registrado como enviado para esa cita.
2. **Given** una cita reservada cuya fecha/hora cae fuera de la ventana de antelación configurada, **When** se ejecuta el proceso diario de recordatorios, **Then** no se genera ningún recordatorio para esa cita.
3. **Given** una cita ya cancelada, **When** se ejecuta el proceso diario de recordatorios, **Then** no se genera ningún recordatorio para esa cita.

---

### User Story 2 - Sin recordatorios duplicados (Priority: P1)

El despacho necesita la garantía de que, aunque el proceso diario se ejecute más de una vez sobre la misma cita (por ejemplo, se relanza tras un fallo, o la cita permanece varios días dentro de la ventana), el cliente recibe como máximo un recordatorio por cita.

**Why this priority**: Un recordatorio duplicado o repetido genera confusión y desconfianza en el cliente, y mina la credibilidad del propio recordatorio ("¿ya había confirmado esto?"). Es tan crítico como el envío en sí.

**Independent Test**: Se puede probar ejecutando el proceso diario dos veces seguidas (mismo día y en días sucesivos mientras la cita sigue dentro de la ventana) sobre la misma agenda y verificando que solo existe un `.eml` por cita en `datos/salida-correo/`.

**Acceptance Scenarios**:

1. **Given** una cita para la que ya se generó un recordatorio, **When** el proceso diario se ejecuta de nuevo (ese mismo día o un día posterior) y la cita sigue dentro de la ventana, **Then** no se genera un segundo recordatorio para esa cita.
2. **Given** el proceso diario se interrumpe o se relanza accidentalmente el mismo día, **When** se vuelve a ejecutar, **Then** el conjunto de recordatorios generados en `datos/salida-correo/` para ese día no contiene duplicados.

---

### User Story 3 - Cancelación desde el email de recordatorio (Priority: P2)

El cliente que recibe el recordatorio y sabe que no va a poder asistir puede cancelar su cita directamente desde el email, liberando el hueco en la agenda en lugar de convertirse en una no asistencia silenciosa.

**Why this priority**: Complementa el objetivo de negocio (reducir no-shows) convirtiendo una no asistencia inevitable en un hueco libre reaprovechable; depende de que exista el recordatorio (US1), por eso va después.

**Independent Test**: Se puede probar generando un recordatorio, simulando la acción de cancelación indicada en el email y verificando que la cita cambia a estado cancelado y el hueco queda disponible en la agenda.

**Acceptance Scenarios**:

1. **Given** un cliente ha recibido el recordatorio de su cita y el inicio de esta sigue a 24 horas o más del instante actual, **When** pulsa el enlace de cancelación del email y confirma en la pantalla de confirmación, **Then** la cita pasa a estado cancelada y el hueco queda libre en la agenda.
2. **Given** un cliente intenta cancelar desde el email cuando el inicio de la cita está a menos de 24 horas del instante actual, **When** usa la forma de cancelación, **Then** el sistema le informa de que ya no puede cancelar por ese medio dentro de ese plazo y que debe contactar con el despacho, y la cita permanece reservada (mismo plazo y mismo mensaje que aplica en 002-portal-cliente-citas, FR-006).

---

### Edge Cases

- Si una cita se reprograma (cambia de fecha/hora) después de que ya se envió su recordatorio, y la nueva fecha vuelve a entrar en la ventana de 24-48h, el sistema genera un nuevo recordatorio para la nueva fecha/hora (el recordatorio anterior queda como histórico, sin necesidad de invalidarlo explícitamente).
- Si una cita se reprograma fuera de la ventana de 24-48h (por ejemplo, se aplaza varias semanas) después de que ya se envió su recordatorio, no se toma ninguna acción sobre ese recordatorio ya enviado; simplemente se generará uno nuevo cuando la nueva fecha vuelva a entrar en ventana.
- ¿Qué ocurre si una cita se cancela por otra vía (no desde el email) después de que ya se generó su recordatorio? El recordatorio ya emitido no debe reactivar la cita ni generarse de nuevo.
- ¿Qué ocurre si el proceso diario no se ejecuta un día (por ejemplo, el despacho está cerrado o hay un fallo) y al día siguiente hay citas que ya deberían haber recibido recordatorio? El proceso siguiente debe seguir detectándolas mientras sigan dentro de la ventana de antelación.
- ¿Qué ocurre si dos citas del mismo cliente caen ambas dentro de la ventana el mismo día? Cada cita reservada recibe su propio recordatorio independiente.
- Si la cancelación desde el email llega casi al mismo tiempo que una cancelación (u otro cambio de estado) desde el portal del cliente o desde la agenda de secretaría sobre la misma cita, el sistema MUST aplicar la transición como máximo una vez y responder de forma coherente al resto de intentos, siguiendo la garantía general de idempotencia de transiciones de estado que define 001-agenda-citas (FR-018 de esa spec).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ejecutar un proceso diario que identifique todas las citas reservadas cuya fecha/hora caiga dentro de la ventana de antelación de 24 a 48 horas antes de la cita; cada cita recibe su único recordatorio en el primer proceso diario en que entra en esa ventana (el momento exacto dentro de las 24-48h depende del día de ejecución del proceso).
- **FR-002**: El sistema MUST generar, para cada cita dentro de la ventana, un correo de recordatorio que incluya como mínimo: fecha, hora, profesional y área de la cita, de forma clara e inequívoca (sin ambigüedad horaria).
- **FR-003**: El sistema MUST escribir cada correo de recordatorio como un fichero `.eml` en `datos/salida-correo/`, ya que no hay SMTP configurado en v1 (modo simulado).
- **FR-004**: El sistema MUST garantizar que cada cita reservada recibe como máximo un recordatorio, incluso si el proceso diario se ejecuta varias veces sobre la misma cita.
- **FR-005**: El sistema MUST excluir del envío de recordatorios las citas que ya estén canceladas en el momento de ejecutar el proceso.
- **FR-006**: El correo de recordatorio MUST incluir una forma de que el cliente cancele la cita si no va a asistir.
- **FR-007**: El sistema MUST llevar al cliente que pulsa el enlace de cancelación a una pantalla de confirmación explícita ("sí, cancelar") antes de liberar el hueco de agenda correspondiente, sin exigir inicio de sesión; la cancelación por este medio se admite únicamente cuando el inicio de la cita esté a 24 horas o más del instante actual, el mismo plazo que exige 002-portal-cliente-citas para la cancelación desde el portal (FR-006 de esa spec): es una única política de cancelación por autoservicio del cliente, propiedad de 002, que este canal reutiliza en lugar de fijar un plazo propio.
- **FR-007a**: El enlace de cancelación MUST incluir un token único e impredecible por recordatorio, de modo que no sea posible adivinar o deducir el enlace de otra cita distinta, aplicando el mismo patrón de token de acceso de cliente sin contraseña (un solo uso, caducidad limitada, entropía suficiente) que define 002-portal-cliente-citas, en vez de un criterio de seguridad propio.
- **FR-007b**: Cuando la cancelación se aplica desde este canal, el sistema MUST registrar el origen de la cancelación como `cliente_email` en el campo de origen de cancelación que define 001-agenda-citas (FR-017 de esa spec), de modo que la agenda de secretaría lo muestre igual que cualquier otra cancelación de origen cliente.
- **FR-008**: El sistema MUST informar al cliente cuando intenta cancelar desde el email con el inicio de la cita a menos de 24 horas del instante actual, indicando que debe contactar con el despacho para gestionarlo dentro de ese plazo y dejando la cita reservada sin cambios.
- **FR-009**: El sistema MUST reenviar el recordatorio cuando una cita se reprograma a una fecha/hora distinta después de haber sido notificada, siempre que la nueva fecha/hora vuelva a entrar en la ventana de antelación de 24-48 horas; el recordatorio previo no cuenta como válido para la nueva fecha.
- **FR-010**: Todo texto del correo de recordatorio MUST redactarse en español de España, con fechas, horas y datos de la cita expresados sin ambigüedad.
- **FR-011**: El sistema MUST quedar fuera de alcance en v1 para el envío de recordatorios por SMS o WhatsApp.

### Key Entities

- **Recordatorio de Cita**: Representa el aviso generado para una cita concreta; se relaciona 1:1 con la cita y la fecha/hora que lo originó (una reprogramación fuera de ventana puede generar un recordatorio nuevo asociado a la nueva fecha), guarda el momento en que se generó (para evitar duplicados), un token único e impredecible para el enlace de cancelación, y su estado (generado, cancelación aplicada, cancelación ya no admitida por estar el inicio de la cita a menos de 24 horas).
- **Cita**: La reserva existente en la agenda del despacho para un cliente con un profesional en una fecha/hora concreta; su estado (reservada, cancelada) determina si es candidata a recordatorio. Al cancelarse desde este canal, guarda `cliente_email` en el campo de origen de cancelación propiedad de 001-agenda-citas (FR-017 de esa spec).
- **Fichero de Correo Simulado (.eml)**: Representa el correo de recordatorio en modo simulado, escrito en `datos/salida-correo/`; contiene los datos de la cita y el mecanismo de cancelación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las citas reservadas que entran en la ventana de antelación configurada generan exactamente un fichero de recordatorio, verificable en `datos/salida-correo/` frente a los datos de demostración deterministas.
- **SC-002**: Ejecutar el proceso diario varias veces sobre la misma agenda produce cero recordatorios duplicados por cita, en el 100% de los casos probados.
- **SC-003**: Un cliente que decide no asistir puede liberar su hueco de agenda a través del email de recordatorio sin necesidad de llamar o escribir al despacho.
- **SC-004**: El despacho puede verificar, para cualquier cita de los datos de demostración, el fichero `.eml` correspondiente y confirmar que sus datos (fecha, hora, profesional, área) coinciden exactamente con los de la cita en la agenda.

## Assumptions

- El proceso diario se ejecuta una vez al día (no en tiempo real ni varias veces al día) sobre el conjunto de citas reservadas.
- Los datos de contacto (email) de cada cliente ya existen en el sistema y son obligatorios en toda ficha de cliente (001-agenda-citas, FR-013 y su modelo de datos); esta feature no cubre su captura ni validación, y no necesita contemplar el caso de un cliente sin email registrado.
- El modo simulado de correo (`.eml` en `datos/salida-correo/`) es una decisión temporal para v1 mientras no haya SMTP configurado; la sustitución por envío real queda fuera de alcance de esta spec.
- "Cancelar desde el email" se resuelve mediante un enlace o acción incluida en el propio correo que el cliente puede usar sin necesidad de iniciar sesión en un portal aparte, dado el perfil de usuario objetivo (cliente de despacho de abogados, no necesariamente familiarizado con tecnología).
- El hueco de agenda liberado por una cancelación queda disponible para nueva reserva de forma inmediata, siguiendo el comportamiento ya existente de cancelación de citas en el sistema.

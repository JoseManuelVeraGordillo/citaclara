# Revisión cruzada de specs — Agosto 2026

**Fecha**: 2026-08-24
**Alcance**: Análisis de solapamiento entre las cuatro specs vivas del proyecto, leídas sin checkout desde la punta de cada rama:

| Spec | Rama | Commit leído | Ruta |
|---|---|---|---|
| 001 — Núcleo de Agenda | `001-agenda-citas` (= `main`, mismo commit) | `06e0276` | `specs/001-agenda-citas/spec.md` |
| 002 — Portal del Cliente | `002-portal-cliente-citas` | `34a2106` | `specs/002-portal-cliente-citas/spec.md` |
| 003 — Recordatorios de Cita | `003-recordatorios-cita` | `9079049` | `specs/002-recordatorios-cita/spec.md` (⚠️ ver nota) |
| 004 — Panel de Analítica | `004-panel-analitica-despacho` | `db6835c` | `specs/004-panel-analitica-despacho/spec.md` |

**Nota de higiene, no de contenido**: la spec de la rama `003-recordatorios-cita` vive en la ruta `specs/002-recordatorios-cita/` (prefijo `002`, no `003`), duplicando el número de carpeta que ya usa `002-portal-cliente-citas`. Es un choque de numeración de carpetas, no de contenido — pero conviene renombrarla a `specs/003-recordatorios-cita/` antes de que alguien confunda ambas specs "002" en un listado de directorios.

Las cuatro ramas tenían su spec commiteada; no hizo falta parar por spec ausente.

---

## 1. Ventana de cancelación por parte del cliente: dos reglas distintas para el mismo estado

**Specs implicadas**: 002 (Portal del Cliente) y 003 (Recordatorios de Cita)

**Cita 002** (`002-portal-cliente-citas:specs/002-portal-cliente-citas/spec.md`, FR-006):
> "El sistema MUST rechazar la cancelación de una cita que no esté en estado "reservada" o **cuyo inicio esté a menos de 24 horas** del instante actual, explicando el motivo al cliente [...] e indicando que debe contactar con el despacho para gestionarla dentro de ese plazo."

**Cita 003** (`003-recordatorios-cita:specs/002-recordatorios-cita/spec.md`, FR-007):
> "El sistema MUST llevar al cliente que pulsa el enlace de cancelación a una pantalla de confirmación explícita [...] sin exigir inicio de sesión; **la cancelación por este medio se admite hasta el inicio de la cita**."

**Por qué chocan**: son dos canales de autoservicio para el mismo cliente, sobre la misma transición de estado (`reservada` → `cancelada`), con dos plazos distintos. El recordatorio se envía entre 24 y 48h antes de la cita (003, FR-001), así que su enlace de cancelación queda operativo mucho más allá de las 24h que permite el portal. Un cliente al que el portal le dice "faltan menos de 24h, llama al despacho" puede abrir el email de recordatorio que recibió horas antes y cancelar igualmente por ahí, porque 003 solo comprueba que no haya pasado el *inicio* de la cita, no las 24h. En producción esto deja la restricción de 002 sin efecto práctico para cualquier cliente que haya recibido recordatorio, y en negocio contradice la razón de ser del límite de 24h (dar margen a secretaría para reaccionar).

**Propuesta de resolución**: una única política de "plazo de cancelación por autoservicio del cliente" (las 24h de 002), propiedad de 002 por ser quien la definió y motivó primero con Jose. 003 debe consumir esa misma regla en vez de redefinir la suya: el enlace del email deja de admitir cancelación "hasta el inicio" y pasa a aplicar el mismo corte de 24h que el portal (mismo mensaje de "llama al despacho" si se pulsa dentro de esa ventana). Si el negocio de verdad quiere un plazo más corto específico para el canal email, eso debe ser una decisión explícita documentada en 002 (dueña de la política), no una divergencia accidental introducida por 003.

---

## 2. Marcador de "origen de la cancelación": campo nuevo que 001 no tiene y que 003 no extiende a su propio canal

**Specs implicadas**: 001 (núcleo), 002 (Portal del Cliente), 003 (Recordatorios de Cita)

**Cita 001** (`main:specs/001-agenda-citas/spec.md`, Key Entities): la Cita solo tiene "un estado que evoluciona de 'reservada' a exactamente uno de 'completada', 'cancelada' o 'no_asistida'" — no hay ningún campo de origen/autor del cambio de estado. Confirmado en el schema real (`main:prisma/schema.prisma`, `model Cita`): no existe columna de origen, solo `estado`.

**Cita 002** (`002-portal-cliente-citas:specs/002-portal-cliente-citas/spec.md`, FR-007a):
> "La agenda de secretaría MUST distinguir visualmente una cita cancelada por el cliente de una cancelada por secretaría, de forma que quede claro el origen de la cancelación al consultar el historial de la agenda."

**Cita 003** (`003-recordatorios-cita:specs/002-recordatorios-cita/spec.md`): no menciona en ningún FR ni entidad que la cancelación hecha desde el email deba marcarse con un origen distinguible en la agenda. Su entidad "Recordatorio de Cita" guarda su propio estado ("cancelación aplicada"), pero eso vive en la tabla de recordatorios, no en la Cita que ve secretaría.

**Por qué chocan**: 002 introduce la necesidad de un campo/atributo de "origen de cancelación" sobre la entidad Cita que hoy no existe en el modelo de 001, y que 003 no sabe que existe. Si 003 se implementa primero o en paralelo sin conocer FR-007a de 002, la cancelación vía email quedará indistinguible de una cancelación de secretaría en la agenda — secretaría no podrá saber, mirando el historial, que fue el cliente quien canceló por email, rompiendo la garantía que 002 promete para *todas* las cancelaciones de origen cliente, no solo las hechas desde el portal.

**Propuesta de resolución**: el campo "origen de cancelación" sobre Cita pasa a ser propiedad de 001 (dueña del modelo de datos de Cita y de su máquina de estados), con un enum abierto que cubra los tres orígenes reales: `secretaria`, `cliente_portal`, `cliente_email`. 002 y 003 consumen ese campo al cancelar, cada una escribiendo su propio origen; 002 actualiza su FR-007a para hablar de "origen cliente" en general (no solo portal) y 003 añade un FR explícito de que su cancelación también deja constancia del origen en la Cita.

---

## 3. Idempotencia y condiciones de carrera entre tres canales de cancelación, no solo dos

**Specs implicadas**: 001 (núcleo), 002 (Portal del Cliente), 003 (Recordatorios de Cita)

**Cita 001** (`main:specs/001-agenda-citas/spec.md`, FR-005): la garantía de concurrencia (RN1) se define explícitamente solo para "creación o reprogramación", no para cambios de estado/cancelación:
> "Si dos solicitudes (alta o reprogramación) piden casi simultáneamente el mismo hueco del mismo profesional, el sistema MUST registrar como máximo una de ellas."

**Cita 002** (`002-portal-cliente-citas:specs/002-portal-cliente-citas/spec.md`, FR-008):
> "El sistema MUST garantizar que, ante dos intentos de cancelar la misma cita casi simultáneamente (**desde el portal, desde la agenda de secretaría, o ambos a la vez**), la cita quede cancelada como máximo una vez, sin efectos duplicados ni inconsistencias de estado."

**Cita 003** (`003-recordatorios-cita:specs/002-recordatorios-cita/spec.md`, Edge Cases): solo contempla el doble-clic sobre el propio enlace de email ("¿Qué ocurre si una cita se cancela por otra vía (no desde el email) después de que ya se generó su recordatorio? El recordatorio ya emitido no debe reactivar la cita ni generarse de nuevo") — cubre que el recordatorio no reviva la cita, pero no exige explícitamente que la cancelación-vía-email sea idempotente frente a una cancelación simultánea desde portal o secretaría.

**Por qué chocan**: 002 enumera dos canales concretos (portal + agenda) al definir su garantía de "cancelada como máximo una vez", sin contar con que 003 añade un tercer canal (email) que también puede disparar exactamente esa misma transición `reservada → cancelada` sobre la misma Cita. Nada obliga hoy a que el canal de 003 respete esa misma garantía frente a una carrera con los otros dos; en producción, dos cancelaciones casi simultáneas (una desde el email, otra desde secretaría marcando "no asistida" o completando la cita) podrían dejar la Cita en un estado inconsistente o generar un mensaje de éxito duplicado en dos canales a la vez.

**Propuesta de resolución**: la garantía de "una transición de estado final se aplica como máximo una vez, sea cual sea el canal que la origine" debe vivir en 001 como extensión de su máquina de estados (ya es la dueña de FR-009 "estado final inmutable"), redactada de forma agnóstica al canal. 002 y 003 dejan de redefinir su propia versión parcial de la regla y simplemente heredan "cualquier intento de cambiar el estado de una cita que ya no está en `reservada` se rechaza de forma coherente, sea cual sea el origen" — que además ya cubre el caso general sin necesidad de enumerar canales uno a uno cada vez que se añada uno nuevo.

---

## 4. Email de cliente: obligatorio en el núcleo, pero 003 asume que puede faltar

**Specs implicadas**: 001 (núcleo) y 003 (Recordatorios de Cita)

**Cita 001** (`main:specs/001-agenda-citas/data-model.md`, sección Cliente):
> "**Reglas de validación**: nombre, apellidos y teléfono obligatorios al crear ficha; **email obligatorio** (FR-013 los lista como parte de la ficha)."

Confirmado en schema real (`main:prisma/schema.prisma`, `model Cliente`): `email String` sin `?`, es decir, no nullable.

**Cita 003** (`003-recordatorios-cita:specs/002-recordatorios-cita/spec.md`, Clarification y FR-012):
> "Cuando el proceso diario encuentra una cita dentro de la ventana cuyo cliente no tiene email registrado, ¿qué debe hacer el sistema? → A: Omitir esa cita [...] y dejarla registrada como 'sin recordatorio enviado'."
> FR-012: "El sistema MUST omitir la generación de recordatorio para una cita cuyo cliente no tenga email registrado [...]."

**Por qué chocan**: 003 diseña un flujo entero (edge case, clarification, FR-012, y una parte del criterio de éxito SC-001 que depende de "todas las citas que entran en ventana") alrededor de un escenario — cliente sin email — que el modelo de datos de 001 declara imposible por construcción (email obligatorio al crear la ficha). Si 001 no cambia, FR-012 de 003 es código muerto que nunca se ejecuta, y no hay forma real de demostrar esa rama en los datos de demostración deterministas (contradice además el principio de "Demostrable con Datos Reproducibles" que ambas specs invocan). Si en cambio se decide que sí deben poder existir clientes sin email (por ejemplo, fichas antiguas o clientes que solo dieron teléfono), es 001 quien tiene que relajar esa restricción, porque es la propietaria del alta de fichas de cliente.

**Propuesta de resolución**: decidir explícitamente y en 001 (dueña de la ficha de Cliente) si el email pasa a ser opcional. Si se mantiene obligatorio, 003 debe eliminar la rama "cliente sin email" de su spec (Clarification, edge case y FR-012) por no ser alcanzable. Si se hace opcional, 001 debe actualizar su propia regla de validación y FR-013, y entonces FR-012 de 003 sí tiene sentido tal cual está.

---

## 5. Dos mecanismos de acceso sin contraseña para el cliente, diseñados por separado

**Specs implicadas**: 002 (Portal del Cliente) y 003 (Recordatorios de Cita)

**Cita 002** (`002-portal-cliente-citas:specs/002-portal-cliente-citas/spec.md`, FR-001):
> "El sistema MUST permitir a un cliente solicitar acceso a su página personal introduciendo su **teléfono**, y MUST concederle acceso mediante un enlace o código de un solo uso emitido para esa solicitud."

**Cita 003** (`003-recordatorios-cita:specs/002-recordatorios-cita/spec.md`, FR-007a):
> "El enlace de cancelación MUST incluir un **token único e impredecible por cita/recordatorio**, de modo que no sea posible adivinar o deducir el enlace de otra cita distinta."

**Por qué chocan**: no es una contradicción de reglas (los alcances son distintos: uno da acceso a *todas* las citas de un cliente, el otro a *cancelar una* cita concreta), pero son dos mecanismos de "acceso de cliente sin cuenta ni contraseña" diseñados de forma independiente, en el mismo día, sin que ninguna de las dos specs mencione a la otra. Esto es terreno fértil para que cada feature termine con su propia tabla de tokens, su propia política de expiración y su propio criterio de "impredecible", duplicando lógica de seguridad sensible (generación de tokens de un solo uso) en dos sitios del código con garantías potencialmente distintas.

**Propuesta de resolución**: no hace falta forzar un único mecanismo (los casos de uso son legítimamente distintos), pero sí un propietario único del *patrón* "token de acceso de cliente sin contraseña" (expiración, entropía mínima, un solo uso) para que 002 y 003 lo instancien igual en vez de reinventarlo cada una. Razonable que sea 002, por ser la primera en definir el patrón; 003 debería referenciar esa misma política en vez de fijar la suya en FR-007a.

---

## 6. Verificación positiva: `clavePanelHash` no tiene doble reclamación

**Spec implicada**: 004 (Panel de Analítica), en relación con 001

**Cita 001** (`main:specs/001-agenda-citas/spec.md`, Key Entities): "Despacho [...] Tiene una clave de panel propia para autenticación administrativa simplificada (**fuera de alcance funcional en esta spec, más allá de existir como campo**)."

**Cita 004** (`004-panel-analitica-despacho:specs/004-panel-analitica-despacho/spec.md`, FR-001 y Assumptions): "protegida por la clave de panel del despacho (`clavePanelHash`, ya existente en el modelo de datos y reservada precisamente para este tipo de función administrativa) [...] se asume que esta es esa función."

**Por qué NO chocan**: es el único caso revisado donde dos specs comparten un concepto (la clave de panel) sin conflicto — 001 la deja explícitamente reservada para uso futuro y 004 es la única de las cuatro specs que la reclama. Se incluye aquí solo para dejar constancia expresa de que no hace falta resolución: 004 es la propietaria legítima de `clavePanelHash` y ninguna otra spec la usa.

---

## Resumen de propietarios propuestos

| Concepto en disputa | Propietario propuesto | Specs que deben ajustarse |
|---|---|---|
| Plazo de cancelación por autoservicio del cliente (24h) | 002 | 003 debe adoptar el mismo plazo en el canal email |
| Campo "origen de cancelación" en Cita | 001 (modelo de datos) | 002 amplía FR-007a a "origen cliente" en general; 003 añade FR de que también marca origen |
| Idempotencia de cambios de estado ante concurrencia multicanal | 001 (máquina de estados) | 002 y 003 dejan de enumerar canales y heredan la regla general |
| Obligatoriedad del email de ficha de Cliente | 001 (ficha de cliente) | 003 depende de la decisión: elimina o mantiene la rama "sin email" según lo que decida 001 |
| Patrón de token de acceso sin contraseña (expiración, entropía) | 002 (primera en definirlo) | 003 referencia la misma política en vez de fijar la suya |
| `clavePanelHash` | 004 | ninguna — sin conflicto, confirmado |

Adicionalmente, corregir antes de seguir: la carpeta de la spec 003 vive en `specs/002-recordatorios-cita/` y debería renombrarse a `specs/003-recordatorios-cita/` para no compartir prefijo con `002-portal-cliente-citas`.

# Research: Portal del Cliente

**Feature**: 002-portal-cliente-citas | **Date**: 2026-08-24

Este documento resuelve las decisiones técnicas necesarias para implementar
la spec, reutilizando al máximo la base ya construida en `001-agenda-citas`
(mismo proyecto Next.js, mismo esquema Prisma, mismas convenciones de
zona horaria y estado de cita) y priorizando simplicidad (Principio IV)
sin introducir infraestructura de terceros no justificada por la spec.

## 1. Entrega del enlace/código de acceso de un solo uso (FR-001)

**Decision**: El cliente introduce su teléfono en una página de solicitud
de acceso. El sistema busca fichas de `Cliente` cuyo `telefono` coincida
exactamente y, por cada coincidencia, genera un token de un solo uso y lo
"entrega" a través de un `EmailSender` con interfaz única en el código
(`enviarEnlaceAcceso(destinatario, url)`), cuya única implementación en
esta feature es un envío best-effort a la `email` ya registrada en la
ficha de ese cliente. No se integra ningún proveedor real de email/SMS de
terceros (Resend, Twilio, SMTP, etc.) en esta feature.

**Rationale**: La spec deja explícitamente el canal de entrega como
decisión de plan (Assumptions de `spec.md`), y la Constitución (Principio
IV) exige rechazar infraestructura no justificada por la spec: el valor de
negocio de esta feature es que el cliente pueda ver y cancelar sus citas
sin llamar, no una integración concreta con un proveedor de mensajería.
Aislar el envío detrás de una interfaz `EmailSender` permite sustituir la
implementación por un proveedor real en una spec futura sin tocar la
lógica de negocio (generación/validación de token), documentando esta
frontera como deuda técnica consciente, igual que 001-agenda-citas
documentó la autenticación simplificada por clave compartida.

**Alternatives considered**:
- **Integrar un proveedor SMS real (p. ej. Twilio) porque el cliente
  introduce el teléfono**: añade una dependencia de pago y credenciales
  externas no exigidas por ningún FR de la spec (que solo pide "sin
  cuenta ni contraseña"); alcance fantasma según Principio IV.
- **Mostrar el enlace directamente en pantalla tras solicitarlo (sin
  envío alguno)**: más simple aún, pero contradice el propósito de FR-001
  (que el acceso llegue a un canal propio del cliente, no a quien esté
  delante de la pantalla de solicitud, que podría no ser el cliente).

## 2. Búsqueda de cliente por teléfono no único (FR-001)

**Decision**: `Cliente.telefono` no tiene restricción de unicidad (ya
decidido en 001-agenda-citas). Si la búsqueda por teléfono devuelve varias
fichas, el sistema genera y envía un token independiente a cada ficha
coincidente, cada uno vinculado a un único `clienteId`. La respuesta de la
página de solicitud es siempre el mismo mensaje genérico ("si el teléfono
está registrado, revisa tu email"), sin revelar cuántas fichas coinciden
ni sus datos, para no filtrar información de otros clientes que compartan
teléfono.

**Rationale**: Reutiliza el modelo de datos existente sin forzar una
migración de unicidad que rompería datos de la semilla ya sembrada
(Principio V); cada token queda de todos modos ligado a una única ficha,
por lo que FR-002 (un cliente solo ve sus propias citas) se cumple sin
ambigüedad una vez canjeado el token.

**Alternatives considered**:
- **Forzar unicidad de teléfono en BD**: requeriría limpiar/deduplicar la
  semilla determinista existente y contradice la Clarification ya cerrada
  en 001-agenda-citas de no forzar esa unicidad.

## 3. Token de acceso de un solo uso (FR-001, FR-001a)

**Decision**: Nueva tabla `SolicitudAccesoCliente` (token opaco aleatorio
de alta entropía, se almacena solo su hash SHA-256, nunca el token en
claro) con `clienteId`, `tokenHash`, `expiraEn` y `usadoEn` (nulo hasta
canjearse). El token expira a los 15 minutos de emitido y se invalida en
cuanto se canjea una vez (actualización atómica `UPDATE ... WHERE
usadoEn IS NULL`). Al canjearlo con éxito se abre una cookie de sesión de
cliente firmada (HMAC, mismo mecanismo que `src/lib/auth/sesion.ts` pero
con un valor distinto que incluye el `clienteId`), separada de la cookie
de sesión de secretaría.

**Rationale**: Un token de un solo uso con expiración corta cumple FR-001a
sin necesitar contraseñas ni gestión de altas; guardar solo el hash sigue
el mismo patrón ya usado para las claves de despacho (`claveSecretariaHash`,
`clavePanelHash`), evitando guardar secretos en claro (buena práctica
mínima, no un requisito nuevo de la spec). Reutilizar el mecanismo HMAC de
cookie firmada de `sesion.ts` evita introducir una librería de sesiones
nueva (Principio IV).

**Alternatives considered**:
- **JWT autocontenido sin tabla en BD**: evita una tabla adicional, pero
  no permite invalidar el token tras un único uso sin mantener igualmente
  una lista de revocación en BD; la tabla explícita es más simple de
  razonar y de testear (canjeado como máximo una vez, FR-008).

## 4. Cancelación atómica y detección de condición de carrera (FR-008)

**Decision**: La cancelación (tanto desde el portal del cliente como desde
la agenda de secretaría) se implementa como una única sentencia SQL
condicional: `UPDATE citas SET estado = 'cancelada', ... WHERE id = $1 AND
estado = 'reservada'`, comprobando el número de filas afectadas. Si afecta
0 filas, la cita ya no estaba en `reservada` (otra sesión llegó primero o
ya estaba en estado final) y se devuelve un mensaje claro sin duplicar
efectos.

**Rationale**: PostgreSQL garantiza que esta actualización condicional es
atómica por fila, sin necesidad de bloqueos explícitos ni de una
restricción `EXCLUDE` (esa restricción resuelve el solape de horario de
001-agenda-citas, un problema distinto). Es la solución más simple que
cumple FR-008 y es coherente con el patrón "servidor de BD serializa la
validación con la escritura" ya usado para RN1.

**Alternatives considered**:
- **Bloqueo optimista con columna de versión**: resuelve el mismo
  problema pero añade una columna y lógica de reintento no necesarias
  cuando una actualización condicional de una sola sentencia ya es
  atómica y suficiente.

## 5. Origen de la cancelación visible en la agenda de secretaría (FR-007a)

**Decision**: Se añade a `Cita` un campo `canceladaPor` (enum
`secretaria` | `cliente`, nulo salvo cuando `estado = 'cancelada'`),
fijado en el mismo `UPDATE` atómico de cancelación descrito en la
decisión 4, según qué acción de servidor lo invoque (Server Action del
portal vs. Server Action de la agenda). La UI de la agenda de secretaría
(001-agenda-citas) muestra ese origen como una etiqueta (p. ej. "Cancelada
por el cliente") en el historial de la cita.

**Rationale**: Es el campo mínimo necesario para que secretaría distinga
el origen sin inferirlo indirectamente (p. ej. por ausencia de sesión de
secretaría en logs, que no es consultable desde la UI). Extiende el
modelo ya existente de `Cita` en vez de crear una entidad de auditoría
genérica no pedida por la spec (Principio IV).

**Alternatives considered**:
- **Tabla de auditoría genérica de cambios de estado**: cubriría este caso
  y otros futuros, pero es alcance no pedido por ninguna FR de esta spec
  ni de 001-agenda-citas; se descarta por Principio IV.

## 6. Reutilización de zona horaria, estado y reglas ya existentes

**Decision**: El portal reutiliza tal cual `src/lib/tiempo/zona-horaria.ts`
(conversión UTC ↔ Europe/Madrid) y el enum `EstadoCita` ya definido en
`prisma/schema.prisma`. La regla "24 horas antes del inicio" (FR-005/006)
se calcula comparando `Cita.inicio` (UTC) con el instante actual + 24h, sin
necesidad de convertir a Europe/Madrid para la comparación (solo para
mostrarla al cliente).

**Rationale**: Evita divergencia entre cómo secretaría y el cliente
interpretan fechas/horas (Principio II); no hay ninguna razón de negocio
para reimplementar esta lógica ya probada en 001-agenda-citas.

## Resumen de Technical Context resuelto

Todas las incógnitas quedan resueltas; no quedan `NEEDS CLARIFICATION`
pendientes para esta feature. El proyecto sigue siendo el mismo Next.js
15 (App Router) + TypeScript + PostgreSQL + Prisma de 001-agenda-citas;
no se introduce ningún framework, base de datos ni dependencia nueva más
allá de lo ya presente en `package.json`.

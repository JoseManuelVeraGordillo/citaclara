# Research: Recordatorios de Cita por Email

**Feature**: 002-recordatorios-cita | **Date**: 2026-08-24

Este documento resuelve las decisiones técnicas necesarias para pasar de
`spec.md` (ya sin marcadores `NEEDS CLARIFICATION`) a un diseño concreto,
reutilizando al máximo lo ya construido en `001-agenda-citas`.

## 1. Cómo se dispara el "proceso diario"

**Decisión**: un script ejecutable con `tsx` (mismo patrón que
`prisma/seed.ts`), en `scripts/enviar-recordatorios.ts`, invocado por un
programador de tareas externo al proceso Next.js (cron del sistema
operativo o equivalente). El script en sí NO configura ni instala ningún
cron; solo expone el comando `npm run recordatorios:enviar` que debe
ejecutarse una vez al día.

**Rationale**: Principio IV (Simplicidad y Cero Alcance Fantasma) — añadir
un scheduler embebido (p. ej. `node-cron`) sería una pieza de
infraestructura no pedida por la spec, que solo exige que "un proceso
diario" exista y sea idempotente. El propio despacho (o su hosting) ya
necesita algún mecanismo de cron para tareas de mantenimiento; replicar
ese mecanismo dentro de la app añadiría una dependencia y un proceso de
fondo de más para un despacho pequeño.

**Alternativas consideradas**:
- `node-cron` / scheduler embebido en la app Next.js: rechazado, añade
  complejidad y un proceso long-running que la app actual no tiene.
- Ruta HTTP protegida que un cron externo llama (`/api/cron/recordatorios`):
  válido y compatible con el mismo código; se documenta como alternativa
  de despliegue en `quickstart.md`, pero el contrato principal es la
  función/script, no el transporte HTTP.

## 2. Reproducibilidad del "ahora" (Principio V)

**Decisión**: toda la lógica de selección de citas se implementa como una
función pura `seleccionarCitasParaRecordar(ahora: Date, citas: CitaCandidata[])`
en `src/lib/recordatorios/seleccion.ts`, que nunca llama a `Date.now()`
internamente. El script `scripts/enviar-recordatorios.ts` acepta un
override opcional del instante de referencia (`--ahora=<ISO>` o variable
de entorno `RECORDATORIOS_AHORA`) y, si no se indica, usa la hora real del
sistema.

**Rationale**: la semilla determinista de `001-agenda-citas`
(`prisma/seed.ts`) fija su "hoy" en `FECHA_REFERENCIA = 2026-08-17` con
datos hasta 2 semanas en el futuro, nunca en `Date.now()`. Para que
`SC-001`/`SC-004` de esta spec sean verificables contra esos mismos datos
deterministas, el proceso de recordatorios debe poder ejecutarse "como si
fuera" esa misma fecha de referencia en demos y tests, mientras que en
producción se ejecuta con la hora real. Aislar la selección en una función
pura hace esto trivial de testear sin tocar el reloj del sistema.

**Alternativas consideradas**: mockear `Date.now()` globalmente en tests
— rechazado, más frágil y no reutilizable desde el propio script en modo
demo.

## 3. Persistencia de recordatorios (deduplicación y estado)

**Decisión**: nueva tabla `Recordatorio` (Prisma) con una fila por
"intento de recordatorio" de una cita para una fecha/hora concreta:
`citaId`, `citaInicio` (copia del `Cita.inicio` vigente en el momento de
generarlo), `token` (nullable), `estado` (`enviado` | `omitido_sin_email`),
`generadoEn`, `canceladoEn` (nullable). Restricción única sobre
`(citaId, citaInicio)`.

**Rationale**: FR-004 exige como máximo un recordatorio por cita aunque el
proceso se ejecute varias veces; FR-009 exige que una reprogramación que
cambia `Cita.inicio` sí permita un recordatorio nuevo. Usar
`(citaId, citaInicio)` como clave de deduplicación resuelve ambos a la vez
sin lógica ad-hoc: el proceso simplemente intenta crear la fila y, si ya
existe para ese `inicio` exacto, la omite (ver `data-model.md`).
`estado = omitido_sin_email` permite dejar constancia de FR-012
(cliente sin email) en la misma tabla, sin crear una segunda entidad.

**Alternativas consideradas**: añadir un campo `recordatorioEnviadoEn`
directamente en `Cita` — rechazado porque no soporta de forma natural el
caso "reprogramada, hace falta un segundo recordatorio para la nueva
fecha" sin perder el histórico del primero, y mezclaría el ciclo de vida
del recordatorio con el de la cita.

## 4. Generación de ficheros `.eml` sin SMTP

**Decisión**: construir el contenido MIME (`From`, `To`, `Subject`, `Date`,
`Content-Type: text/plain; charset=utf-8`, cuerpo) a mano en
`src/lib/correo/eml.ts`, sin librería adicional, y escribirlo con
`fs.writeFileSync` en `datos/salida-correo/` (creando el directorio si no
existe). Nombre de fichero determinista y único:
`{citaInicioIso}-{citaId}.eml`.

**Rationale**: Principio IV — el formato `.eml` (RFC 5322) es texto plano
simple; no hace falta `nodemailer` ni otra dependencia de envío real
mientras no haya SMTP configurado (fuera de alcance de esta spec). Añadir
una librería de envío de correo solo para generar texto plano sería
alcance fantasma.

**Alternativas consideradas**: `nodemailer` con `streamTransport`/
`jsonTransport` — rechazado por ahora (dependencia adicional para un
formato que se puede construir a mano); se deja como candidato natural
cuando esta spec evolucione a SMTP real, sin que ese cambio futuro
requiera tocar el resto del diseño (el "constructor de contenido" queda
aislado en `eml.ts`).

## 5. Enlace y token de cancelación (seguridad)

**Decisión**: token aleatorio de 32 bytes (`crypto.randomBytes(32)`,
codificado en hex) generado con el módulo nativo `node:crypto` (sin
dependencia nueva), almacenado en `Recordatorio.token` con índice único.
El enlace es `{APP_URL}/cancelar-cita/{token}`; `APP_URL` es una nueva
variable de entorno (por defecto `http://localhost:3000` en desarrollo).
La página pública `/cancelar-cita/[token]` no requiere sesión, muestra los
datos de la cita y exige un paso de confirmación explícito antes de
ejecutar la cancelación (FR-007, FR-007a).

**Rationale**: Clarification de esta spec — el token debe ser
impredecible; 32 bytes aleatorios de una fuente criptográfica son
suficientes y siguen el mismo criterio de "sin dependencia nueva" que el
resto del diseño (Node ya trae `crypto`).

## 6. Cliente sin email registrado

**Decisión**: aunque `Cliente.email` es un campo obligatorio en el modelo
de `001-agenda-citas`, el proceso de recordatorios trata como "sin email"
tanto un valor `null` (por si el modelo evoluciona) como una cadena vacía
o solo espacios, de forma defensiva. En ese caso no se genera `.eml`; se
crea una fila `Recordatorio` con `estado = omitido_sin_email` (sin token).

**Rationale**: FR-012 exige un comportamiento definido para este caso
aunque hoy sea infrecuente con los datos de la semilla; tratarlo de forma
defensiva evita que un dato inesperado (importado, corregido a mano en
BD) rompa el proceso diario completo para el resto de citas.

## 7. Visibilidad para secretaría de los recordatorios omitidos

**Decisión**: en la vista de agenda ya existente (`/agenda`,
`001-agenda-citas`), cuando una cita dentro de la ventana tiene un
`Recordatorio` con `estado = omitido_sin_email`, se añade un pequeño
indicador visual (icono + texto corto) junto a la cita, en línea con el
resto de la UI (Tailwind + shadcn/ui, Principio VII). No se crea una
pantalla nueva.

**Rationale**: cumple FR-012 ("secretaría pueda revisarla") con el mínimo
cambio posible, reutilizando la superficie de UI que la secretaría ya usa
a diario, en vez de construir un panel de recordatorios dedicado
(alcance fantasma, Principio IV).

## 8. Zona horaria y formato de fecha/hora en el correo

**Decisión**: reutilizar `src/lib/tiempo/zona-horaria.ts`
(`formatearEnMadrid`) para toda fecha/hora que aparezca en el `.eml` y en
la página de cancelación, mostrando siempre día, fecha, hora y minuto en
`Europe/Madrid` de forma explícita (p. ej. "martes 25 de agosto de 2026,
10:00h").

**Rationale**: Principio II — ninguna fecha/hora en una comunicación al
cliente puede ser ambigua; el helper ya existe y ya se usa en la UI de
agenda, así que reutilizarlo mantiene consistencia entre ambas features.

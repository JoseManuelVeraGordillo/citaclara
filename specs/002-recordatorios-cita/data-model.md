# Data Model: Recordatorios de Cita por Email

**Feature**: 002-recordatorios-cita | **Date**: 2026-08-24

Extiende el modelo de `001-agenda-citas` (`Despacho`, `Profesional`,
`Servicio`, `Cliente`, `Cita`) con una entidad nueva. Ninguna entidad
existente cambia de forma (ver `research.md` §3 y §6 para el porqué).

## Recordatorio (nueva)

Registra cada intento de recordatorio generado para una cita en una
fecha/hora concreta; es la fuente de verdad para la deduplicación
(FR-004), el reenvío tras reprogramación (FR-009), la cancelación por
token (FR-006, FR-007, FR-007a) y los recordatorios omitidos por falta de
email (FR-012).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| citaId | UUID (FK → Cita) | |
| citaInicio | timestamp UTC | copia del `Cita.inicio` vigente cuando se generó este recordatorio (permite detectar reprogramaciones) |
| estado | enum | `enviado` \| `omitido_sin_email` |
| token | string, nullable, único | presente solo si `estado = enviado`; 32 bytes aleatorios en hex (Clarification, FR-007a) |
| generadoEn | timestamp UTC | momento en que el proceso diario creó esta fila |
| canceladoEn | timestamp UTC, nullable | se rellena cuando el cliente cancela con éxito desde el enlace (US3) |

**Restricciones**:

- `@@unique([citaId, citaInicio])` — MUST garantizar que, para una misma
  cita y un mismo `inicio`, exista como máximo una fila; esta es la
  garantía anti-duplicados de FR-004. Si `Cita.inicio` cambia
  (reprogramación) y vuelve a entrar en la ventana de 24-48h, se crea una
  fila nueva con el `citaInicio` nuevo (FR-009) — la fila anterior queda
  como histórico, sin modificarse.
- `token` único cuando no es null (índice único parcial), para que dos
  recordatorios nunca compartan enlace de cancelación (FR-007a).

**Relaciones**: pertenece a una `Cita` (una `Cita` puede tener varias
filas `Recordatorio` a lo largo del tiempo si se reprograma repetidamente
dentro de la ventana; ver `research.md` §3).

### Máquina de estados

```text
(proceso diario, cliente CON email) ──► enviado
(proceso diario, cliente SIN email) ──► omitido_sin_email   [estado final]

enviado ──(cliente confirma cancelación por token, antes del inicio de la cita)──► canceladoEn = ahora
enviado ──(no se cancela, o se intenta tras el inicio de la cita)──► sin cambios [estado final a efectos de reenvío]
```

- `omitido_sin_email` es terminal: no se reintenta automáticamente ese
  mismo `(citaId, citaInicio)`; si la cita se reprograma a un nuevo
  `inicio` que vuelve a entrar en ventana, se evalúa de nuevo con los
  datos de cliente en ese momento.
- La cancelación por token MUST verificar, en el momento de la
  confirmación: (a) que el token existe y pertenece a un `Recordatorio`
  con `estado = enviado`; (b) que `canceladoEn` sigue siendo `null`; (c)
  que `ahora < Cita.inicio` (FR-007, FR-008). Si (c) falla, se informa al
  cliente sin modificar nada (FR-008).
- Cancelar por token MUST cambiar también `Cita.estado` a `cancelada`
  (reutilizando la transición ya definida en `001-agenda-citas`,
  `data-model.md` §Cita — solo válida desde `reservada`), liberando el
  hueco de agenda.

## Cita (sin cambios de esquema, nueva relación)

Se añade la relación inversa `recordatorios: Recordatorio[]` a la entidad
`Cita` ya definida en `001-agenda-citas`. Ninguna columna de `Cita` se
modifica.

**Regla de selección (FR-001, ver `research.md` §1-2)**: una `Cita` es
candidata a recordatorio en el instante `ahora` si:

```text
Cita.estado = 'reservada'
Y (Cita.inicio - ahora) está en [24h, 48h]
Y NO existe Recordatorio con (citaId = Cita.id, citaInicio = Cita.inicio)
```

## Cliente (sin cambios de esquema)

`Cliente.email` sigue siendo el campo ya definido en
`001-agenda-citas`. El proceso de recordatorios trata como "sin email"
cualquier valor `null`, vacío o solo espacios en blanco (`research.md`
§6) — no se añade ninguna restricción nueva a nivel de base de datos.

## Diagrama de relaciones (incremento sobre 001-agenda-citas)

```text
Cita 1──* Recordatorio
```

# Data Model: Núcleo de Agenda de CitaClara

**Feature**: 001-agenda-citas | **Date**: 2026-08-21

Basado en las Key Entities de `spec.md` y en las decisiones de
`research.md` (PostgreSQL + Prisma, UTC en base de datos, importes en
céntimos enteros).

## Despacho

Bufete que opera CitaClara.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| nombre | string | p. ej. "Nuria Lagar Abogados" |
| claveSecretariaHash | string | hash de la clave de secretaría (FR-001) |
| clavePanelHash | string | hash de la clave de panel; campo presente, sin uso funcional en esta spec |
| creadoEn | timestamp UTC | |

**Reglas**: una única instancia activa en esta spec (Assumption), pero el
modelo no impide varios despachos en el futuro.

## Profesional

Persona del despacho que atiende citas.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| despachoId | UUID (FK → Despacho) | |
| nombre | string | |
| especialidad | string | p. ej. "abogado", "administración" |
| activo | boolean | permite desactivar sin borrar histórico |

**Relaciones**: pertenece a un Despacho; tiene muchas Citas.

## Servicio

Tipo de cita que un profesional puede ofrecer.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| despachoId | UUID (FK → Despacho) | |
| nombre | string | |
| duracionMinutos | integer | > 0 |
| precioCentimos | integer | precio en céntimos de euro, nunca float (Principio II) |
| activo | boolean | |

**Relaciones**: pertenece a un Despacho; tiene muchas Citas.

## Cliente

Ficha de la persona atendida por el despacho; sin acceso propio al sistema.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| despachoId | UUID (FK → Despacho) | |
| nombre | string | |
| apellidos | string | |
| telefono | string | dato de referencia visible en búsqueda (FR-013); sin unicidad forzada en BD (Clarification) |
| email | string | |
| creadoEn | timestamp UTC | |

**Reglas de validación**: nombre, apellidos y teléfono obligatorios al
crear ficha; email obligatorio (FR-013 los lista como parte de la ficha).
Sin restricción de unicidad de teléfono/email (permite duplicados
intencionadamente, ver Edge Case de búsqueda).

**Relaciones**: pertenece a un Despacho; tiene muchas Citas.

## Cita

Une un profesional, un servicio y un cliente en un intervalo de tiempo.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| profesionalId | UUID (FK → Profesional) | |
| servicioId | UUID (FK → Servicio) | |
| clienteId | UUID (FK → Cliente) | |
| inicio | timestamp UTC | minuto exacto de inicio, tiempo continuo (Clarification) |
| fin | timestamp UTC | calculado = inicio + Servicio.duracionMinutos |
| estado | enum | `reservada` \| `completada` \| `cancelada` \| `no_asistida` |
| creadaEn | timestamp UTC | |
| actualizadaEn | timestamp UTC | |

### Máquina de estados

```text
reservada ──(completar)──► completada   [estado final, inmutable]
reservada ──(cancelar)───► cancelada    [estado final, inmutable]
reservada ──(no asistir)─► no_asistida  [estado final, inmutable]
```

- Solo se puede transicionar **desde** `reservada`. Ningún estado final
  admite otra transición (FR-009).
- `no_asistida` únicamente alcanzable desde `reservada` (FR-010) — no desde
  `completada` ni `cancelada` (Edge Case).
- La reprogramación (FR-011) **no** cambia de estado; solo es válida sobre
  una cita en `reservada` (FR-012) y actualiza `profesionalId`,
  `servicioId`, `inicio` y `fin` (recalculado), re-aplicando RN1/RN2 y
  horario laboral como si fuera un alta nueva.

### Invariantes (RN1, RN2, horario laboral)

- **RN1 (Principio III, FR-004, FR-005)**: para un mismo `profesionalId`,
  el intervalo `[inicio, fin)` de una cita en estado `reservada` o
  `completada` MUST no solaparse con el de ninguna otra cita en esos mismos
  estados. Se implementa como restricción a nivel de base de datos
  (`EXCLUDE USING gist` sobre `tsrange(inicio, fin)` filtrado por
  `profesionalId` y `estado IN ('reservada','completada')`), no solo como
  validación en la capa de aplicación, para garantizar la propiedad incluso
  bajo condiciones de carrera (ver `research.md` §2).
- **RN2 (FR-006)**: `inicio` MUST ser ≥ instante actual en el momento de
  crear o reprogramar la cita.
- **Horario laboral (FR-007)**: `[inicio, fin)` MUST caer íntegramente
  dentro de 09:00–14:00 o 16:00–20:00, de lunes a viernes, en
  `Europe/Madrid`.
- `fin` MUST ser siempre `inicio + Servicio.duracionMinutos`; no es un
  campo editable independiente.

**Relaciones**: pertenece a un Profesional, a un Servicio y a un Cliente.

## Diagrama de relaciones

```text
Despacho 1──* Profesional 1──* Cita *──1 Servicio
                                  Cita *──1 Cliente
Despacho 1──* Servicio
Despacho 1──* Cliente
```

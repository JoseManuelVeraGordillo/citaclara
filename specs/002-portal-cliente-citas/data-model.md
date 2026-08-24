# Data Model: Portal del Cliente

**Feature**: 002-portal-cliente-citas | **Date**: 2026-08-24

Extiende el modelo de datos de `001-agenda-citas`
(`specs/001-agenda-citas/data-model.md`). Solo se documentan aquí la
entidad nueva y los campos añadidos por esta feature; `Despacho`,
`Profesional`, `Servicio` y el resto de `Cliente`/`Cita` no cambian.

## SolicitudAccesoCliente (entidad nueva)

Token de un solo uso emitido cuando un cliente solicita acceso a su
página personal con su teléfono.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID (PK) | |
| clienteId | UUID (FK → Cliente) | ficha a la que da acceso este token |
| tokenHash | string | hash SHA-256 del token opaco; el token en claro nunca se persiste (research.md §3) |
| expiraEn | timestamp UTC | `creadoEn + 15 minutos` |
| usadoEn | timestamp UTC, nulo | se fija atómicamente al canjear; un token con `usadoEn` no nulo ya no es válido |
| creadoEn | timestamp UTC | |

**Reglas de validación**:
- Un token es válido para canjear si y solo si `usadoEn IS NULL` y
  `expiraEn > ahora` (FR-001a).
- El canje MUST ser atómico (`UPDATE ... WHERE usadoEn IS NULL`) para que,
  ante dos intentos casi simultáneos de canjear el mismo token, como
  máximo uno tenga éxito (mismo patrón de FR-008 aplicado al canje).

**Relaciones**: pertenece a un Cliente. Un Cliente puede tener varias
solicitudes históricas (una por cada vez que pidió acceso); no hay límite
de negocio sobre cuántas puede solicitar.

## Cliente (sin cambios de esquema)

Reutiliza la ficha ya definida en 001-agenda-citas (`nombre`, `apellidos`,
`telefono`, `email`). Esta feature no añade campos a `Cliente`; el acceso
del cliente se modela enteramente a través de `SolicitudAccesoCliente` y
de la cookie de sesión de cliente (sin persistir en BD, ver
`contracts/portal-cliente.md`).

## Cita (campo añadido)

| Campo | Tipo | Notas |
|---|---|---|
| canceladaPor | enum `secretaria` \| `cliente`, nulo | nulo salvo cuando `estado = 'cancelada'`; fijado en el mismo `UPDATE` atómico que cancela la cita (FR-007a) |

### Máquina de estados (sin cambios respecto a 001-agenda-citas)

La transición `reservada → cancelada` ya existente ahora puede originarse
también desde el portal del cliente, además de desde la agenda de
secretaría, con las mismas reglas de inmutabilidad de estado final. La
única diferencia observable es que la cancelación desde el portal:

- solo se permite si `Cita.inicio` está a 24 horas o más del instante
  actual (FR-005/FR-006) — restricción adicional que no aplica a las
  cancelaciones de secretaría desde la agenda;
- fija `canceladaPor = 'cliente'` en vez de `'secretaria'`.

### Invariante nuevo

- **Cancelación con antelación mínima (FR-005, FR-006, solo origen
  cliente)**: al cancelar desde el portal, `Cita.inicio` MUST ser ≥
  instante actual + 24 horas. No aplica cuando la cancelación la realiza
  secretaría desde la agenda.

**Relaciones**: sin cambios; sigue perteneciendo a un Profesional, un
Servicio y un Cliente.

## Diagrama de relaciones (extensión sobre 001-agenda-citas)

```text
Cliente 1──* SolicitudAccesoCliente
Cliente 1──* Cita   (sin cambios)
Cita.canceladaPor ∈ { secretaria, cliente, NULL }
```

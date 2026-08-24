# Mapa de Specs de CitaClara

Registro de propiedad exigido por el Principio I de la constitución
("Spec First"): cada spec en `specs/` MUST tener exactamente un
propietario asignado en todo momento. Una spec sin propietario, o
comportamiento implementado que no figura en ninguna spec, bloquea el
merge.

| Spec | Propietario | Estado |
|---|---|---|
| [001-agenda-citas](001-agenda-citas/spec.md) | Jose Manuel Vera Gordillo | Implementada |
| [004-panel-analitica-despacho](004-panel-analitica-despacho/spec.md) | Jose Manuel Vera Gordillo | Planificada (tasks.md generado, pendiente de implementar) |

## Cómo mantener este mapa

- Al crear una spec nueva con `/speckit-specify`, añadir una fila aquí en el
  mismo cambio (o en el siguiente commit inmediato) con su propietario.
- Si una spec cambia de propietario, actualizar la fila; nunca dejarla sin
  propietario.
- El "Estado" es informativo (Draft / Planificada / Implementada); la
  fuente de verdad del estado detallado de cada feature es su propio
  `spec.md`/`tasks.md`.

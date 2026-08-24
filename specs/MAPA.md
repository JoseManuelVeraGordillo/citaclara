# Mapa de Specs de CitaClara

Registro de propiedad exigido por el Principio I de la constitución
("Spec First"): cada spec en `specs/` MUST tener exactamente un
propietario asignado en todo momento. Una spec sin propietario, o
comportamiento implementado que no figura en ninguna spec, bloquea el
merge.

| Spec | Título | Propietario | Estado |
|---|---|---|---|
| [001-agenda-citas](001-agenda-citas/spec.md) | Núcleo de Agenda de CitaClara | Jose Manuel Vera Gordillo | Implementada |
| [002-portal-cliente-citas](002-portal-cliente-citas/spec.md) | Portal del Cliente | Jose Manuel Vera Gordillo | Implementada |
| [002-recordatorios-cita](002-recordatorios-cita/spec.md) | Recordatorios de Cita por Email | Jose Manuel Vera Gordillo | Implementada |
| [004-panel-analitica-despacho](004-panel-analitica-despacho/spec.md) | Panel de Analítica del Despacho | Jose Manuel Vera Gordillo | Implementada |

## Cómo mantener este mapa

- Al crear una spec nueva con `/speckit-specify`, añadir una fila aquí en el
  mismo cambio (o en el siguiente commit inmediato) con su propietario.
- Si una spec cambia de propietario, actualizar la fila; nunca dejarla sin
  propietario.
- El "Estado" es informativo (Draft / Planificada / Implementada); la
  fuente de verdad del estado detallado de cada feature es su propio
  `spec.md`/`tasks.md`.
- La rama `003-recordatorios-cita` vive en la carpeta `specs/002-recordatorios-cita/`
  (colisión de numeración con `002-portal-cliente-citas`, pendiente de renombrar;
  ver `specs/000-revision-cruzada-agosto2026.md`).

# Data Model: Panel de Analítica del Despacho

**Feature**: 004-panel-analitica-despacho | **Date**: 2026-08-24

Esta feature es de solo lectura (FR-006): **no añade ni modifica ninguna
tabla, columna ni migración** del esquema definido en
`specs/001-agenda-citas/data-model.md`. Reutiliza sin cambios `Despacho`,
`Profesional`, `Servicio` y `Cita` (incluido `Despacho.clavePanelHash`, ya
presente pero sin uso funcional hasta ahora). Este documento describe
únicamente el **modelo de lectura**: las entidades de origen que consulta y
los DTOs calculados que expone a la UI.

## Entidades de origen (sin cambios)

| Entidad | Campos leídos por el panel |
|---|---|
| `Despacho` | `id`, `clavePanelHash` (FR-001) |
| `Profesional` | `id`, `nombre`, `activo` (Key Entities: historial de inactivos sigue siendo relevante) |
| `Servicio` | `id`, `nombre`, `precioCentimos` |
| `Cita` | `profesionalId`, `servicioId`, `inicio`, `fin`, `estado` |

Ninguna consulta de esta feature filtra, ordena ni expone datos de
`Cliente` — las métricas son agregadas por profesional/servicio/semana, no
por cliente individual (ninguna User Story lo requiere).

## DTOs calculados (modelo de lectura)

### `IngresoPorServicio` (US1, FR-004)

| Campo | Tipo | Notas |
|---|---|---|
| servicioId | UUID | |
| nombreServicio | string | |
| totalCentimos | integer | suma de `Servicio.precioCentimos` de citas `completada` dentro de la ventana de 8 semanas completas (§ver `semanas.ts`); 0 si no hay ninguna |

**Regla de cálculo**: `SUM(precioCentimos) WHERE estado = 'completada' AND fechaMadrid(inicio) ∈ [ventana.inicio, ventana.fin]`, agrupado por `servicioId`. Se incluyen todos los servicios activos e inactivos que tengan al menos una cita en el histórico (un servicio sin citas completadas en la ventana aparece con `totalCentimos = 0`, FR-009).

### `OcupacionSemanalProfesional` (US2, FR-002)

| Campo | Tipo | Notas |
|---|---|---|
| profesionalId | UUID | |
| nombreProfesional | string | |
| activo | boolean | para distinguir profesionales dados de baja (Edge Case) |
| semanas | `SemanaOcupacion[]` | una entrada por cada una de las 8 semanas completas |

`SemanaOcupacion`:

| Campo | Tipo | Notas |
|---|---|---|
| semanaInicio | string (YYYY-MM-DD) | lunes de la semana en Europe/Madrid |
| minutosOcupados | integer | suma de duración de citas `reservada` o `completada` de ese profesional cuyo `inicio` cae en esa semana |
| minutosDisponibles | integer | minutos totales de los tramos laborales (09:00–14:00, 16:00–20:00, lun–vie) de esa semana |
| porcentaje | number (0–100, 1 decimal) | `minutosOcupados / minutosDisponibles * 100`; `0` si `minutosDisponibles = 0` (semana sin días laborables, no debería ocurrir con el calendario actual pero se protege igualmente) |

### `TasaNoAsistenciaProfesional` (US3, FR-003)

| Campo | Tipo | Notas |
|---|---|---|
| profesionalId | UUID | |
| nombreProfesional | string | |
| activo | boolean | |
| totalHistoricas | integer | número de citas `completada` + `cancelada` + `no_asistida` (histórico completo, sin ventana) |
| totalNoAsistidas | integer | número de citas `no_asistida` |
| porcentaje | number (0–100, 2 decimales) \| null | `totalNoAsistidas / totalHistoricas * 100`; `null` (→ UI "sin datos", FR-009) si `totalHistoricas = 0` |

### `EvolucionSemanalProfesional` (US4, FR-005)

| Campo | Tipo | Notas |
|---|---|---|
| profesionalId | UUID | |
| nombreProfesional | string | |
| semanas | `SemanaEvolucion[]` | una entrada por cada una de las 8 semanas completas |

Este DTO no incluye `activo`: a diferencia de ocupación y no asistencia
(Key Entities de spec.md: "`Profesional`: sujeto de las métricas de
ocupación y no asistencia"), la evolución no tiene un Edge Case propio que
exija distinguir profesionales inactivos — es una decisión deliberada, no
un olvido.

`SemanaEvolucion`:

| Campo | Tipo | Notas |
|---|---|---|
| semanaInicio | string (YYYY-MM-DD) | lunes de la semana en Europe/Madrid |
| totalCitas | integer | número de citas de ese profesional (cualquier estado) cuyo `inicio` cae en esa semana |
| ingresosCentimos | integer | suma de `precioCentimos` de las citas `completada` de ese profesional en esa semana; 0 si no hay ninguna |

### `VentanaOchoSemanas` (compartida por US1, US2, US4)

| Campo | Tipo | Notas |
|---|---|---|
| inicio | string (YYYY-MM-DD) | lunes de la semana completa más antigua de las 8 |
| fin | string (YYYY-MM-DD) | domingo de la semana completa más reciente de las 8 (siempre anterior a la semana en curso) |
| semanas | string[] (YYYY-MM-DD) | los 8 lunes, ordenados cronológicamente ascendente |

Calculado una sola vez por carga de página y reutilizado por los tres DTOs que dependen de la ventana, para garantizar que las tres secciones muestren exactamente las mismas 8 semanas (consistencia visual del panel).

## Relación con el modelo de origen

```text
Despacho 1──* Profesional 1──* Cita *──1 Servicio
```

El panel no introduce relaciones nuevas; agrega `Cita` por `profesionalId`, `servicioId` y semana de `inicio` según cada DTO anterior.

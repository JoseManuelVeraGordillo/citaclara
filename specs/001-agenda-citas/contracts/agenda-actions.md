# Contrato: Acciones de la Agenda

**Feature**: 001-agenda-citas | **Date**: 2026-08-21

Interfaz expuesta por el backend (Next.js Server Actions / Route Handlers)
al frontend de la agenda. Todas las acciones de escritura requieren sesión
de secretaría válida (cookie firmada, ver `research.md` §4); en su ausencia
MUST devolver `401 no_autenticado`.

Todos los timestamps de entrada/salida son ISO 8601 en UTC; la conversión a
`Europe/Madrid` ocurre en la capa de presentación (cliente).

## `obtenerAgendaDia`

**Tipo**: lectura (Route Handler `GET /api/agenda?profesionalId&fecha`)

**Entrada**:
```ts
{ profesionalId: string; fecha: string /* YYYY-MM-DD en Europe/Madrid */ }
```

**Salida** (200):
```ts
{
  profesional: { id: string; nombre: string };
  fecha: string;
  huecos: Array<{
    inicio: string; // ISO UTC
    fin: string;    // ISO UTC
    estado: "libre" | "ocupado";
    cita?: {
      id: string;
      clienteNombre: string;
      servicioNombre: string;
      estado: "reservada" | "completada" | "cancelada" | "no_asistida";
    };
  }>;
}
```

**Referencia**: FR-002, US1-Escenario 1, SC-005.

## `darDeAltaCita`

**Tipo**: escritura (Server Action)

**Entrada**:
```ts
{
  profesionalId: string;
  servicioId: string;
  clienteId?: string;       // si se usa ficha existente
  clienteNuevo?: {          // si no existe ficha (mutuamente excluyente con clienteId)
    nombre: string; apellidos: string; telefono: string; email: string;
  };
  inicio: string; // ISO UTC
}
```

**Salida éxito** (201):
```ts
{ citaId: string; inicio: string; fin: string; estado: "reservada" }
```

**Salida error** (422), `codigo` uno de:
- `solape` — RN1 violada (FR-004, FR-005)
- `en_el_pasado` — RN2 violada (FR-006)
- `fuera_de_horario` — FR-007
- `cliente_invalido` — falta `clienteId` o `clienteNuevo`, o datos incompletos

**Referencia**: FR-003, FR-004, FR-005, FR-006, FR-007, FR-013, US1-Escenarios 2,3,4,5.

## `cambiarEstadoCita`

**Tipo**: escritura (Server Action)

**Entrada**:
```ts
{ citaId: string; nuevoEstado: "completada" | "cancelada" | "no_asistida" }
```

**Salida éxito** (200):
```ts
{ citaId: string; estado: "completada" | "cancelada" | "no_asistida" }
```

**Salida error** (422), `codigo`:
- `estado_final_inmutable` — la cita ya está en estado final (FR-009)
- `transicion_no_permitida` — p. ej. `no_asistida` pedido sobre cita no `reservada` (FR-010)

**Referencia**: FR-008, FR-009, FR-010, US2-Escenarios 1,2,3,4.

## `reprogramarCita`

**Tipo**: escritura (Server Action)

**Entrada**:
```ts
{
  citaId: string;
  profesionalId?: string; // si cambia de profesional
  servicioId?: string;    // si cambia de servicio
  inicio: string;         // ISO UTC, nuevo inicio
}
```

**Salida éxito** (200):
```ts
{ citaId: string; profesionalId: string; servicioId: string; inicio: string; fin: string }
```

**Salida error** (422), `codigo`:
- `solape` (FR-011 vía RN1)
- `en_el_pasado` (FR-011 vía RN2)
- `fuera_de_horario` (FR-011)
- `cita_no_reservada` — la cita no está en estado `reservada` (FR-012)

**Referencia**: FR-011, FR-012, US3-Escenarios 1,2,3,4.

## `buscarClientes`

**Tipo**: lectura (Route Handler `GET /api/clientes?q=`)

**Entrada**: `q` (texto libre, busca por nombre/apellidos/teléfono parcial)

**Salida** (200):
```ts
{
  resultados: Array<{
    id: string; nombre: string; apellidos: string; telefono: string;
  }>;
}
```

**Referencia**: FR-013, Edge Case de desambiguación por teléfono.

## Notas de concurrencia (RN1 bajo carga)

`darDeAltaCita` y `reprogramarCita` MUST delegar la comprobación final de
solape en la restricción `EXCLUDE` de PostgreSQL (ver `data-model.md`), de
forma que si dos peticiones casi simultáneas compiten por el mismo hueco,
la base de datos garantiza que como máximo una `INSERT`/`UPDATE` tenga
éxito; la petición perdedora MUST traducirse en la respuesta `422 solape`
en vez de un error 500 genérico. Esto es lo que exige el test de
concurrencia del Principio III.

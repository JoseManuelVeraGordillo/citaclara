# Contrato: Portal del Cliente

**Feature**: 002-portal-cliente-citas | **Date**: 2026-08-24

Interfaz expuesta por el backend (Next.js Server Actions / Route Handlers)
al frontend del portal del cliente. `verMisCitas` y `cancelarCita`
requieren sesión de cliente válida (cookie firmada distinta de la de
secretaría, ver `research.md` §3); en su ausencia MUST devolver `401
no_autenticado`.

Todos los timestamps de entrada/salida son ISO 8601 en UTC; la conversión
a `Europe/Madrid` ocurre en la capa de presentación (cliente).

## `solicitarAcceso`

**Tipo**: escritura (Server Action), sin sesión previa requerida

**Entrada**:
```ts
{ telefono: string }
```

**Salida** (200, siempre, para no filtrar si el teléfono existe):
```ts
{ mensaje: "Si el teléfono está registrado, revisa tu email en los próximos minutos." }
```

**Efecto**: por cada `Cliente` cuyo `telefono` coincida exactamente, crea
una `SolicitudAccesoCliente` (research.md §3) y envía el enlace de canje a
la `email` de esa ficha.

**Referencia**: FR-001, research.md §1, §2.

## `canjearAcceso`

**Tipo**: escritura (Route Handler `GET /portal/verificar/[token]`)

**Entrada**: `token` (parte de la URL del enlace recibido)

**Salida éxito** (200): abre cookie de sesión de cliente y redirige a
`/portal/mis-citas`.

**Salida error** (422), `codigo`:
- `token_invalido` — no existe ese token
- `token_expirado` — `expiraEn <= ahora` (FR-001a)
- `token_ya_usado` — `usadoEn` no nulo (FR-001a, FR-008 aplicado al canje)

**Referencia**: FR-001, FR-001a, research.md §3.

## `verMisCitas`

**Tipo**: lectura (Route Handler `GET /api/portal/mis-citas`)

**Entrada**: ninguna (el cliente se identifica por la cookie de sesión)

**Salida** (200):
```ts
{
  futuras: Array<{
    id: string;
    profesionalNombre: string;
    servicioNombre: string;
    inicio: string; // ISO UTC
    fin: string;    // ISO UTC
    cancelable: boolean; // inicio >= ahora + 24h
  }>;
  pasadas: Array<{
    id: string;
    profesionalNombre: string;
    servicioNombre: string;
    inicio: string;
    fin: string;
    estado: "completada" | "cancelada" | "no_asistida";
  }>;
}
```

**Referencia**: FR-002, FR-003, FR-004, US1-Escenarios 1,2,3.

## `cancelarCita`

**Tipo**: escritura (Server Action)

**Entrada**:
```ts
{ citaId: string }
```

**Salida éxito** (200):
```ts
{ citaId: string; estado: "cancelada" }
```

**Salida error** (422), `codigo`:
- `cita_no_es_del_cliente` — la cita no pertenece al cliente de la sesión (FR-002)
- `cita_no_reservada` — la cita ya no está en estado `reservada` (Edge Case de doble cancelación)
- `fuera_de_plazo` — `inicio < ahora + 24h` (FR-005, FR-006)

**Referencia**: FR-005, FR-006, FR-007, FR-007a, FR-008, US2-Escenarios 1,2,3,4.

## Notas de concurrencia (cancelación como máximo una vez)

`cancelarCita` MUST implementarse como la actualización SQL condicional
descrita en `research.md` §4 (`UPDATE ... WHERE estado = 'reservada'`),
tanto si la invoca el portal del cliente como si la invoca la agenda de
secretaría. Si dos peticiones casi simultáneas (p. ej. cliente y
secretaría a la vez) intentan cancelar la misma cita, como máximo una
MUST tener éxito; la perdedora MUST traducirse en `422
cita_no_reservada` en vez de un error 500 genérico o un doble efecto.

# Contrato: Recordatorios de Cita

**Feature**: 002-recordatorios-cita | **Date**: 2026-08-24

Dos superficies: (1) el proceso diario, expuesto como función pura +
script ejecutable (no HTTP); (2) la página pública de cancelación por
token, sin sesión de secretaría.

## `seleccionarCitasParaRecordar` (función pura)

**Tipo**: lectura/decisión, sin efectos secundarios —
`src/lib/recordatorios/seleccion.ts`.

**Entrada**:
```ts
{
  ahora: Date; // instante de referencia, ver research.md §2
  citas: Array<{
    id: string;
    inicio: string;   // ISO UTC
    estado: "reservada" | "completada" | "cancelada" | "no_asistida";
    clienteEmail: string;
    recordatoriosExistentes: Array<{ citaInicio: string }>; // ya generados para esa cita
  }>;
}
```

**Salida**:
```ts
{
  aGenerar: Array<{ citaId: string; conEmail: boolean }>; // conEmail=false → omitido_sin_email
}
```

**Referencia**: FR-001, FR-004, FR-005, FR-009, FR-012, US1, US2.

## `enviarRecordatoriosDelDia` (script)

**Tipo**: escritura — `scripts/enviar-recordatorios.ts` (`npm run recordatorios:enviar`).

**Entrada**: ninguna por stdin; acepta `--ahora=<ISO 8601>` opcional (por
defecto, hora real del sistema).

**Efecto**:
1. Consulta citas `reservada` con sus recordatorios existentes.
2. Llama a `seleccionarCitasParaRecordar`.
3. Para cada cita en `aGenerar` con `conEmail = true`: genera token,
   crea fila `Recordatorio(estado="enviado")`, escribe el `.eml`
   correspondiente en `datos/salida-correo/` (FR-002, FR-003, FR-010).
4. Para cada cita en `aGenerar` con `conEmail = false`: crea fila
   `Recordatorio(estado="omitido_sin_email")`, sin `.eml` (FR-012).
5. Imprime un resumen por stdout (nº enviados, nº omitidos).

**Salida** (stdout, formato libre para operación): resumen humano; no es
una API programática, no requiere contrato de formato estable.

**Referencia**: FR-001 a FR-005, FR-009, FR-010, FR-012, SC-001, SC-002, SC-004.

## `GET /cancelar-cita/[token]` (página pública)

**Tipo**: lectura — Server Component, sin sesión de secretaría.

**Comportamiento**:
- Token no encontrado, o `Recordatorio.estado != "enviado"`: página de
  error genérica ("este enlace no es válido"), sin revelar más detalle.
- Token válido, `canceladoEn = null`, `ahora < Cita.inicio`: muestra
  fecha, hora, profesional y área de la cita, y un botón de confirmación
  explícito ("Sí, cancelar mi cita").
- Token válido pero `ahora >= Cita.inicio` (o ya `canceladoEn != null`):
  muestra mensaje explicando que ya no se puede cancelar por este medio,
  sin botón de acción (FR-008).

**Referencia**: FR-006, FR-007, FR-007a, FR-008, US3-Escenario 1 y 2.

## `confirmarCancelacionRecordatorio` (Server Action)

**Tipo**: escritura, invocada desde el botón de confirmación de la página
anterior. Sin sesión de secretaría (acción pública ligada al token).

**Entrada**:
```ts
{ token: string }
```

**Salida éxito** (200):
```ts
{ citaId: string; estado: "cancelada" }
```

**Salida error** (422), `codigo` uno de:
- `token_invalido` — no existe, o el recordatorio no está en `enviado`
- `ya_cancelada` — `canceladoEn` ya tenía valor
- `plazo_agotado` — `ahora >= Cita.inicio` (FR-008)

**Efecto en éxito**: `Cita.estado = "cancelada"` (transición ya definida
en `001-agenda-citas`, solo válida desde `reservada`) y
`Recordatorio.canceladoEn = ahora`, liberando el hueco de agenda
(US3-Escenario 1, SC-003).

**Referencia**: FR-006, FR-007, FR-007a, FR-008, US3.

## Notas de seguridad

- El token MUST ser el único dato necesario para identificar el
  recordatorio a cancelar; ningún otro parámetro (id de cita, email) se
  acepta como alternativa de identificación (research.md §5).
- La página y la Server Action MUST devolver el mismo tipo de error
  genérico tanto si el token no existe como si ya no es válido por otras
  razones, para no filtrar información sobre citas de terceros.

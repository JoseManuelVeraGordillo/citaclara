# Contrato: Panel de Analítica

**Feature**: 004-panel-analitica-despacho | **Date**: 2026-08-24

Interfaz interna expuesta por `lib/analitica/metricas.ts` y
`lib/analitica/semanas.ts`, invocada directamente por el Server Component
de `/panel` (sin Route Handler ni Server Action pública, ver `research.md`
§1 y §3). No hay mutaciones: todas las funciones son de lectura pura.

El acceso a la página `/panel` en sí (no a estas funciones individuales)
requiere sesión de panel válida (cookie firmada distinta de la de
secretaría, ver `research.md` §2); en su ausencia MUST redirigir a
`/panel-login`.

Todas las fechas de entrada/salida de estas funciones son `YYYY-MM-DD` en
Europe/Madrid (semanas) o instantes UTC (`Date`) para timestamps de cita,
igual que en `contracts/agenda-actions.md` de 001-agenda-citas.

## `obtenerVentana8SemanasCompletas`

**Tipo**: lectura (función pura, `lib/analitica/semanas.ts`)

**Entrada**:
```ts
{ fechaReferenciaUtc: Date } // "ahora" del servidor
```

**Salida**:
```ts
{
  inicio: string;   // YYYY-MM-DD, lunes de la semana completa más antigua
  fin: string;      // YYYY-MM-DD, domingo de la semana completa más reciente
  semanas: string[]; // 8 lunes YYYY-MM-DD, orden cronológico ascendente
}
```

**Referencia**: US4-Escenario 2, Assumptions ("Últimas 8 semanas"), FR-005.

## `obtenerIngresosPorServicio`

**Tipo**: lectura (Server Component → Prisma, agregación `GROUP BY servicioId`)

**Entrada**:
```ts
{ despachoId: string; ventana: { inicio: string; fin: string } }
```

**Salida**:
```ts
Array<{
  servicioId: string;
  nombreServicio: string;
  totalCentimos: number; // entero, nunca float (Principio II)
}>
```

**Referencia**: US1, FR-004, SC-002. Ejemplo verificable con la semilla en `spec.md` (ventana 2026-06-22 a 2026-08-16, total 64.025,00 €).

## `obtenerOcupacionSemanal`

**Tipo**: lectura (Server Component → Prisma + `tramosLaboralesDelDia` de `lib/agenda/horario.ts`)

**Entrada**:
```ts
{ despachoId: string; ventana: { inicio: string; fin: string; semanas: string[] } }
```

**Salida**:
```ts
Array<{
  profesionalId: string;
  nombreProfesional: string;
  activo: boolean;
  semanas: Array<{
    semanaInicio: string;      // YYYY-MM-DD
    minutosOcupados: number;   // citas `reservada` + `completada`
    minutosDisponibles: number;
    porcentaje: number;        // 0-100, 1 decimal; 0 si minutosDisponibles = 0
  }>;
}>
```

**Referencia**: US2, FR-002. "Ocupado" = citas `reservada` + `completada` (misma definición que `calcularHuecos` en `lib/agenda/horario.ts`, ver Assumptions de `spec.md`). Ejemplo verificable: semana 2026-06-22, Nuria Lagar 62,8%.

## `obtenerTasaNoAsistencia`

**Tipo**: lectura (Server Component → Prisma, agregación `GROUP BY profesionalId, estado`)

**Entrada**:
```ts
{ despachoId: string }
```

**Salida**:
```ts
Array<{
  profesionalId: string;
  nombreProfesional: string;
  activo: boolean;
  totalHistoricas: number;   // completada + cancelada + no_asistida (sin ventana, histórico completo)
  totalNoAsistidas: number;
  porcentaje: number | null; // null si totalHistoricas = 0 → UI "sin datos" (FR-009)
}>
```

**Referencia**: US3, FR-003, FR-010. Denominador = todas las citas históricas resueltas (Assumptions de `spec.md`). Ejemplo verificable: Nuria Lagar 10,85% (42/387).

## `obtenerEvolucionSemanal`

**Tipo**: lectura (Server Component → Prisma, agregación `GROUP BY profesionalId, semana`)

**Entrada**:
```ts
{ despachoId: string; ventana: { inicio: string; fin: string; semanas: string[] } }
```

**Salida**:
```ts
Array<{
  profesionalId: string;
  nombreProfesional: string;
  semanas: Array<{
    semanaInicio: string; // YYYY-MM-DD
    totalCitas: number;   // cualquier estado
    ingresosCentimos: number; // solo citas `completada`
  }>;
}>
```

**Referencia**: US4, FR-005. Desglosado por profesional (Clarification 2026-08-24). Ejemplo verificable: semana 2026-06-22, Nuria Lagar 49 citas / 2.735,00 €, David Rayo 48 citas / 3.130,00 €, Jose Lagar 48 citas / 2.745,00 €.

## Autenticación del panel

**Tipo**: escritura de sesión (Server Action, `lib/auth/actions.ts`)

### `entrarComoPanel`

**Entrada**: `FormData` con `clave: string`

**Salida éxito**: cookie `citaclara_sesion_panel` firmada (HMAC), redirect a `/panel`.

**Salida error**: `{ error: string }` — clave vacía o incorrecta, mismo patrón que `entrarComoSecretaria`.

**Referencia**: FR-001, Edge Case "acceso sin clave correcta".

### `salirPanel`

Borra la cookie `citaclara_sesion_panel`, redirect a `/panel-login`.

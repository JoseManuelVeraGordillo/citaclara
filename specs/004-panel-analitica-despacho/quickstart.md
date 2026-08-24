# Quickstart: Panel de Analítica del Despacho

**Feature**: 004-panel-analitica-despacho | **Date**: 2026-08-24

Guía para levantar el entorno y validar de extremo a extremo que la feature
cumple los criterios de aceptación de `spec.md`. Asume que
001-agenda-citas ya está implementada y la base de datos migrada (esta
feature no añade migraciones).

## Prerrequisitos

- Node.js LTS (20+) y npm.
- PostgreSQL 16+ accesible localmente (o vía Docker), con el esquema de
  001-agenda-citas ya migrado.
- Variable de entorno `DATABASE_URL` apuntando a la base de datos de
  desarrollo, y `SESSION_SECRET` configurada (reutilizada del módulo de
  sesión existente).

## Puesta en marcha

```bash
npm install                   # incluye la nueva dependencia recharts
npm run seed:reset && npm run seed  # regenera la semilla determinista:
                               # Nuria Lagar Abogados, 3 profesionales,
                               # 4 servicios, ~40 clientes, 8 semanas de
                               # historia + 2 semanas futuras
npm run dev                   # arranca la app en http://localhost:3000
```

La clave de panel de la semilla es `panel2026` (`SEED_CLAVE_SECRETARIA` no
aplica aquí; la clave de panel está fija en `prisma/seed.ts`).

## Validación manual (recorre las 4 historias de usuario)

Entrar en `/panel-login` con la clave de panel de la semilla (`panel2026`)
→ debe redirigir a `/panel` mostrando las 4 secciones. Verificar también
que la clave de secretaría (`secretaria2026`) **no** da acceso al panel, y
que la clave de panel **no** da acceso a `/agenda` (FR-001).

1. **US1 — Ingresos por servicio** (contrato: `contracts/panel-analitica.md#obtenerIngresosPorServicio`)
   - Comprobar que el desglose por servicio, ventana 2026-06-22 a
     2026-08-16, muestra: "Redacción de contrato" 26.280,00 €, "Primera
     consulta" 15.600,00 €, "Gestión administrativa" 11.300,00 €,
     "Consulta de seguimiento" 10.845,00 €, total 64.025,00 € (FR-004,
     SC-002).

2. **US2 — Ocupación semanal por profesional** (contrato: `#obtenerOcupacionSemanal`)
   - Comprobar que la semana 2026-06-22 muestra: Nuria Lagar 62,8%, David
     Rayo 68,3%, Jose Lagar 65,6% (FR-002).

3. **US3 — Tasa de no asistencia por profesional** (contrato: `#obtenerTasaNoAsistencia`)
   - Comprobar: Nuria Lagar 10,85% (42/387), David Rayo 11,84% (47/397),
     Jose Lagar 8,14% (32/393) (FR-003).

4. **US4 — Evolución de las últimas 8 semanas, por profesional** (contrato: `#obtenerEvolucionSemanal`)
   - Comprobar que se ven 8 puntos por profesional (24 en total), y que la
     semana 2026-06-22 muestra: Nuria Lagar 49 citas / 2.735,00 €, David
     Rayo 48 citas / 3.130,00 €, Jose Lagar 48 citas / 2.745,00 € (FR-005).
   - Comprobar que la semana en curso (la que contiene la fecha de hoy del
     servidor) **no** aparece como una de las 8 (US4-Escenario 2).

## Validación de "solo lectura" (Principio III implícito + SC-003, gate obligatorio)

Ejecutar el test de integración dedicado (no manual): registra el
recuento de filas de `Cita`, `Cliente`, `Profesional` y `Servicio` antes de
cargar `/panel` y comprueba que es idéntico después de cargarlo y de
navegar por sus secciones (SC-003, FR-006). Ver detalles de implementación
en `tasks.md` una vez generado por `/speckit-tasks`.

```bash
npm run test:integration -- panel-solo-lectura
```

## Validación de reproducibilidad de la semilla (Principio V)

Igual que en 001-agenda-citas — esta feature no cambia el generador de
semilla, solo lee sus resultados:

```bash
npm run seed:reset && npm run seed  # primera generación
npm run seed:snapshot > /tmp/seed1.json
npm run seed:reset && npm run seed  # segunda generación
npm run seed:snapshot > /tmp/seed2.json
diff /tmp/seed1.json /tmp/seed2.json  # MUST no mostrar diferencias
```

Si las cifras de esta guía dejan de coincidir tras una regeneración de la
semilla, indica que la semilla ha cambiado (no que el panel esté mal): hay
que recalcularlas y actualizar `spec.md` y este documento.

## Suite completa

```bash
npm run test           # unit + integración (Vitest), incluye lib/analitica
npm run test:e2e        # incluye panel.spec.ts (Playwright)
npm run lint            # incluye comprobación de accesibilidad estática
```

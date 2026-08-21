# Quickstart: Núcleo de Agenda de CitaClara

**Feature**: 001-agenda-citas | **Date**: 2026-08-21

Guía para levantar el entorno y validar de extremo a extremo que la feature
cumple los criterios de aceptación de `spec.md`.

## Prerrequisitos

- Node.js LTS (20+) y npm.
- PostgreSQL 16+ accesible localmente (o vía Docker).
- Variable de entorno `DATABASE_URL` apuntando a la base de datos de
  desarrollo, y `DATABASE_URL_TEST` para la base de datos de test.

## Puesta en marcha

```bash
npm install
npx prisma migrate dev        # aplica el esquema de data-model.md, incluida
                               # la restricción EXCLUDE de RN1
npm run seed                  # genera la semilla determinista (FR-015):
                               # Nuria Lagar Abogados, 3 profesionales,
                               # 4 servicios, ~40 clientes, 8 semanas de
                               # historia + 2 semanas futuras
npm run dev                   # arranca la app en http://localhost:3000
```

## Validación manual (recorre las 3 historias de usuario)

1. **US1 — Ver agenda y dar de alta** (contrato: `contracts/agenda-actions.md#obtenerAgendaDia`, `#darDeAltaCita`)
   - Entrar en `/agenda` con la clave de secretaría de la semilla.
   - Elegir un profesional y la fecha de hoy → comprobar que se ven huecos
     libres/ocupados en 09:00–14:00 y 16:00–20:00 (FR-002).
   - Dar de alta una cita sobre un hueco libre con un cliente existente →
     comprobar que queda "reservada" y el fin es inicio + duración del
     servicio (FR-003).
   - Repetir el alta sobre el mismo hueco recién ocupado → comprobar
     rechazo con código `solape` (RN1, FR-004).
   - Intentar un alta con inicio anterior a la hora actual → comprobar
     rechazo con código `en_el_pasado` (RN2, FR-006).

2. **US2 — Cambiar estado** (contrato: `#cambiarEstadoCita`)
   - Tomar una cita `reservada` de la semilla y marcarla como `completada`
     → comprobar que el hueco permanece ocupado y el estado ya no admite
     cambios (FR-008, FR-009).
   - Tomar otra cita `reservada` y marcarla como `cancelada` → comprobar
     que el hueco vuelve a mostrarse libre (US2-Escenario 2).
   - Intentar marcar como `no_asistida` una cita ya `completada` o
     `cancelada` → comprobar rechazo con código `transicion_no_permitida`
     (FR-010).

3. **US3 — Reprogramar** (contrato: `#reprogramarCita`)
   - Tomar una cita `reservada` y moverla a otro hueco libre del mismo
     profesional → comprobar que el fin se recalcula (FR-011).
   - Intentar reprogramarla a un hueco solapado con otra cita
     `reservada`/`completada` → comprobar rechazo `solape` y que la cita
     original no cambió (US3-Escenario 2).
   - Intentar reprogramar una cita ya `completada` → comprobar rechazo
     `cita_no_reservada` (FR-012).

## Validación de concurrencia (Principio III, gate obligatorio)

Ejecutar el test de integración dedicado (no manual): dispara dos
peticiones `darDeAltaCita` en paralelo contra el mismo hueco del mismo
profesional y comprueba que exactamente una tiene éxito y la otra recibe
`422 solape` (FR-005, SC-002). Ver detalles de implementación en
`tasks.md` una vez generado por `/speckit-tasks`.

```bash
npm run test:integration -- concurrencia-rn1
```

## Validación de reproducibilidad de la semilla (Principio V)

```bash
npm run seed:reset && npm run seed  # primera generación
npm run seed:snapshot > /tmp/seed1.json
npm run seed:reset && npm run seed  # segunda generación
npm run seed:snapshot > /tmp/seed2.json
diff /tmp/seed1.json /tmp/seed2.json  # MUST no mostrar diferencias (SC-004)
```

## Suite completa

```bash
npm run test           # unit + integración (Vitest)
npm run test:e2e        # flujos de secretaría (Playwright)
npm run lint            # incluye comprobación de accesibilidad estática
```

# Quickstart: Recordatorios de Cita por Email

**Feature**: 002-recordatorios-cita | **Date**: 2026-08-24

Guía para levantar el entorno y validar de extremo a extremo que la
feature cumple los criterios de aceptación de `spec.md`. Asume que
`001-agenda-citas` ya está migrada y sembrada (mismo `DATABASE_URL`).

## Prerrequisitos

- Los de `specs/001-agenda-citas/quickstart.md` (Node 20+, PostgreSQL 16+,
  `DATABASE_URL`).
- Variable de entorno nueva `APP_URL` (por defecto
  `http://localhost:3000` en desarrollo) para construir el enlace de
  cancelación del `.eml`.

## Puesta en marcha

```bash
npm install
npx prisma migrate dev        # añade la tabla Recordatorio (data-model.md)
npm run seed                  # semilla determinista de 001-agenda-citas,
                               # incluye citas dentro de la ventana 24-48h
                               # respecto a FECHA_REFERENCIA (2026-08-17)
npm run dev                   # arranca la app en http://localhost:3000
```

## Validación manual (recorre las 3 historias de usuario)

1. **US1 — Recordatorio automático** (contrato:
   `contracts/recordatorios.md#enviarRecordatoriosDelDia`)
   - Ejecutar el proceso con la fecha de referencia de la semilla, para
     que caiga sobre datos deterministas:
     ```bash
     npm run recordatorios:enviar -- --ahora=2026-08-15T09:00:00Z
     ```
   - Comprobar en `datos/salida-correo/` que aparece un `.eml` por cada
     cita `reservada` de la semilla cuyo `inicio` cae entre 24 y 48 horas
     después de ese instante, con fecha, hora, profesional y área
     correctos (FR-002, SC-001, SC-004).
   - Comprobar que ninguna cita fuera de esa ventana, ni ninguna cita ya
     `cancelada`, generó `.eml` (US1-Escenario 2 y 3).

2. **US2 — Sin duplicados** (FR-004)
   - Repetir exactamente el mismo comando:
     ```bash
     npm run recordatorios:enviar -- --ahora=2026-08-15T09:00:00Z
     ```
   - Comprobar que no aparecen ficheros `.eml` nuevos en
     `datos/salida-correo/` (SC-002).
   - Repetir con un instante posterior que siga dentro de la ventana para
     alguna de esas mismas citas y comprobar que tampoco se duplica.

3. **US3 — Cancelación desde el email** (contrato:
   `contracts/recordatorios.md#confirmarcancelacionrecordatorio`)
   - Abrir uno de los `.eml` generados y copiar el enlace
     `/cancelar-cita/{token}`.
   - Visitarlo antes del inicio de la cita → comprobar que se ve la
     información de la cita y el botón de confirmación; confirmar y
     comprobar que la cita pasa a `cancelada` y el hueco vuelve a verse
     libre en `/agenda` (US3-Escenario 1, SC-003).
   - Repetir el proceso de recordatorios y comprobar que esa cita
     (ahora `cancelada`) no genera un nuevo `.eml` (FR-005).
   - Probar a visitar un enlace de cancelación después de la hora de
     inicio de una cita (o reutilizar uno ya cancelado) → comprobar el
     mensaje de "ya no se puede cancelar por este medio" y que la cita no
     cambia (US3-Escenario 2, FR-008).

## Validación de reprogramación (FR-009)

- Reprogramar (desde `/agenda`, `001-agenda-citas`) una cita que ya tenga
  un recordatorio enviado, moviéndola a un nuevo `inicio` que también
  caiga en la ventana de 24-48h respecto al mismo `--ahora` de prueba.
- Ejecutar de nuevo el proceso de recordatorios con ese `--ahora` →
  comprobar que se genera un `.eml` nuevo para la nueva fecha/hora, sin
  eliminar el histórico del recordatorio anterior (`data-model.md`).

## Validación de cliente sin email (FR-012)

- Editar en base de datos el `email` de un cliente de una cita dentro de
  la ventana a cadena vacía (solo para esta prueba manual).
- Ejecutar el proceso de recordatorios → comprobar que no se genera
  `.eml` para esa cita y que aparece el indicador correspondiente junto a
  la cita en `/agenda` (research.md §7).

## Validación de seguridad del token (FR-007a)

- Comprobar que dos `.eml` generados en la misma ejecución tienen enlaces
  de cancelación distintos y no correlativos (no son, por ejemplo, un
  contador secuencial).
- Visitar `/cancelar-cita/token-inventado` → comprobar el mensaje de
  enlace no válido, sin exponer datos de ninguna cita real.

## Suite completa

```bash
npm run test             # unit + integración (incluye seleccion.test.ts,
                          # dedupe, token, ventana 24-48h)
npm run test:integration # incluye deduplicación bajo doble ejecución
npm run test:e2e         # flujo de cancelación por token (Playwright)
npm run lint
```

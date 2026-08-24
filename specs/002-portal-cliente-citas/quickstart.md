# Quickstart: Portal del Cliente

**Feature**: 002-portal-cliente-citas | **Date**: 2026-08-24

Guía para levantar el entorno y validar de extremo a extremo que la
feature cumple los criterios de aceptación de `spec.md`. Asume que
`001-agenda-citas` ya está implementada y sembrada (mismo proyecto,
mismo esquema base).

## Prerrequisitos

- Node.js LTS (20+) y npm.
- PostgreSQL 16+ accesible localmente (o vía Docker).
- Variable de entorno `DATABASE_URL` apuntando a la base de datos de
  desarrollo.

## Puesta en marcha

```bash
npm install
npx prisma migrate dev        # aplica el esquema de data-model.md:
                               # tabla SolicitudAccesoCliente y campo
                               # Cita.canceladaPor
npm run seed                  # semilla determinista de 001-agenda-citas
                               # (Nuria Lagar Abogados, ~40 clientes, citas
                               # futuras y pasadas)
npm run dev                   # arranca la app en http://localhost:3000
```

`EmailSender` en desarrollo no envía correo real (research.md §1): escribe
el enlace de acceso en la consola donde corre `npm run dev`, con el
formato `[portal] enlace de acceso para <email>: http://localhost:3000/portal/verificar/<token>`.

## Validación manual (recorre las 2 historias de usuario)

Usa un cliente real de la semilla con citas futuras y pasadas — por
ejemplo, cualquier cliente que aparezca con una cita `reservada` dentro
de las 2 semanas futuras al consultar la base de datos de desarrollo
(`SELECT c.nombre, c.apellidos, c.telefono FROM clientes c JOIN citas ci
ON ci.cliente_id = c.id WHERE ci.estado = 'reservada' AND ci.inicio >
now() LIMIT 1;`).

1. **US1 — Ver mis citas futuras y pasadas** (contrato:
   `contracts/portal-cliente.md#solicitaracceso`, `#canjearacceso`,
   `#vermiscitas`)
   - Ir a `/portal/solicitar-acceso` e introducir el teléfono del cliente
     elegido → comprobar el mensaje genérico de confirmación (FR-001).
   - Copiar el enlace de acceso de la consola del servidor y abrirlo →
     comprobar que entra en `/portal/mis-citas` sin pedir contraseña.
   - Comprobar que la cita futura elegida aparece con profesional,
     servicio, fecha y hora (FR-003), y que el historial de citas pasadas
     de ese cliente muestra su estado final (completada/cancelada/no
     asistida) (FR-004).
   - Reabrir el mismo enlace de acceso una segunda vez → comprobar
     rechazo `token_ya_usado` (FR-001a).

2. **US2 — Cancelar una cita futura** (contrato: `#cancelarcita`)
   - Con una sesión de cliente activa (nueva solicitud de acceso) sobre
     una cita `reservada` cuyo inicio esté a 24 horas o más, pulsar
     cancelar → comprobar que pasa a `cancelada` y desaparece de las
     citas futuras activas (FR-005).
   - Repetir sobre una cita `reservada` cuyo inicio esté a menos de 24
     horas (o crear una de prueba) → comprobar rechazo `fuera_de_plazo`
     con mensaje explicando que hay que llamar al despacho (FR-006).
   - Entrar en `/agenda` con la clave de secretaría (001-agenda-citas) y
     comprobar que el hueco de la cita cancelada aparece libre de
     inmediato y que su historial muestra "Cancelada por el cliente"
     (FR-007, FR-007a).

## Validación de concurrencia (cancelación como máximo una vez)

Ejecutar el test de integración dedicado (no manual): dispara en paralelo
una cancelación desde el portal del cliente y otra desde la agenda de
secretaría sobre la misma cita `reservada`, y comprueba que exactamente
una tiene éxito y la otra recibe `422 cita_no_reservada` (FR-008).

```bash
npm run test:integration -- concurrencia-cancelacion
```

## Suite completa

```bash
npm run test           # unit + integración (Vitest)
npm run test:e2e        # flujos del portal del cliente (Playwright)
npm run lint            # incluye comprobación de accesibilidad estática
```

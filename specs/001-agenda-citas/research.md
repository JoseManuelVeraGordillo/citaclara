# Research: Núcleo de Agenda de CitaClara

**Feature**: 001-agenda-citas | **Date**: 2026-08-21

Este documento resuelve las decisiones técnicas necesarias para implementar
la spec, priorizando simplicidad (Principio IV), corrección monetaria y de
solape (Principios II y III), y una interfaz profesional adaptada a 2026
(Principio VII).

## 1. Framework de aplicación

**Decision**: Next.js 15 (App Router) con TypeScript, en un único proyecto
full-stack (UI + Server Actions/Route Handlers).

**Rationale**: Un solo proyecto (frontend y backend integrados) minimiza la
superficie de despliegue y coordinación entre agentes en paralelo, alineado
con el Principio IV. El App Router permite renderizado en servidor para la
agenda del día (carga rápida en portátil y móvil, FR-016), Server Actions
para mutaciones (alta, reprogramación, cambio de estado) que se ejecutan
directamente contra la base de datos sin necesidad de una capa API REST
separada, y soporte nativo de streaming/loading states que ayuda a cumplir
SC-001 (alta de cita en menos de 1 minuto) y SC-005 (identificar huecos en
menos de 5 segundos).

**Alternatives considered**:
- **SvelteKit**: runtime más ligero, pero el ecosistema de componentes UI
  accesibles (equivalentes a shadcn/ui) es menos maduro en 2026, lo que
  penaliza el cumplimiento ágil de WCAG 2.1 AA (FR-016).
- **Django + React separados**: separar backend y frontend en dos proyectos
  añade despliegue doble, contratos de API a mantener y más superficie de
  coordinación entre agentes, sin beneficio claro para el alcance de esta
  spec (chocaría con Principio IV).
- **Remix**: filosofía similar a Next.js pero con menor adopción y
  ecosistema de componentes de UI profesional en 2026.

## 2. Base de datos y ORM

**Decision**: PostgreSQL con Prisma ORM.

**Rationale**: RN1 (Principio III) exige que el solape sea imposible incluso
bajo condiciones de carrera entre varias sesiones de secretaría simultáneas
(FR-005). PostgreSQL permite modelar esto con una restricción a nivel de
base de datos usando `EXCLUDE USING gist` sobre un rango `tsrange` de
`[inicio, fin)` por profesional, de forma que el propio motor de base de
datos rechaza atómicamente cualquier inserción o actualización solapada,
sin depender de bloqueos aplicativos ni de lógica de reintento propensa a
fallos. Prisma aporta tipado end-to-end con TypeScript (coherente con
Next.js) y migraciones deterministas, necesarias para la semilla
reproducible (Principio V, FR-015). Los importes se modelan como enteros
(céntimos) o `Decimal`, nunca `float`, para cumplir el Principio II.

**Alternatives considered**:
- **Bloqueo optimista/aplicativo (verificar solape en la capa de servicio
  antes de escribir)**: insuficiente bajo carga concurrente real (dos
  peticiones casi simultáneas pueden pasar ambas la comprobación antes de
  que ninguna escriba); no garantiza RN1 al 100% (SC-002).
  El `EXCLUDE CONSTRAINT` de PostgreSQL sí lo garantiza porque la propia
  base de datos serializa la validación con la escritura.
- **SQLite**: simplicidad de despliegue, pero sin soporte nativo de rangos
  con exclusión (`EXCLUDE USING gist`) ni de tipos `tsrange`/`Decimal`
  robustos, obligando a reimplementar en aplicación la garantía que RN1
  exige al 100%.
- **MongoDB**: sin transacciones con restricciones declarativas de rango
  equivalentes; el patrón de solape encaja peor que en un modelo
  relacional con relaciones claras (profesional, servicio, cliente, cita).

## 3. UI y componentes

**Decision**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives) para
componentes accesibles, con una vista de calendario/agenda basada en
componentes propios sobre estos primitivos.

**Rationale**: shadcn/ui distribuye componentes accesibles por defecto
(navegación por teclado, roles ARIA, foco gestionado) construidos sobre
Radix UI, lo que facilita cumplir WCAG 2.1 AA (FR-016) sin construir estos
mecanismos desde cero. Tailwind permite un sistema de diseño consistente
(contraste, tamaños de texto redimensionables, diseño responsive
portátil/móvil) con una estética limpia y profesional propia de interfaces
de 2026 (tipografía variable, espaciado generoso, modo claro con alto
contraste), sin añadir un framework de componentes pesado de terceros.

**Alternatives considered**:
- **Material UI (MUI)**: accesible y maduro, pero su estética por defecto
  se percibe como "Google/Android" en lugar de una identidad propia de
  despacho profesional; personalizarlo a fondo añade más esfuerzo que
  partir de shadcn/ui.
- **Construir componentes desde cero**: máximo control visual, pero
  reimplementar accesibilidad (foco, roles ARIA, navegación por teclado)
  para cada componente interactivo (selector de hueco, formulario de alta)
  es esfuerzo no justificado por la spec (Principio IV).

## 4. Autenticación simplificada

**Decision**: Middleware de Next.js con cookie de sesión firmada, validada
contra la clave de secretaría (hash) almacenada en configuración/BD del
despacho. Sin usuarios individuales ni tabla de credenciales granular.

**Rationale**: FR-001 y la Asunción de "auth simplificada v1, deuda
consciente" piden explícitamente una clave compartida por rol, no un
sistema de usuarios. Una cookie de sesión firmada tras validar la clave es
la solución más simple que cumple el requisito sin construir infraestructura
de autenticación innecesaria (Principio IV), documentando la deuda técnica
tal como exige la spec.

**Alternatives considered**:
- **NextAuth/Auth.js con proveedor de credenciales**: añade una capa de
  abstracción (proveedores, adaptadores, tablas de usuario) no justificada
  para una única clave compartida por rol; alcance fantasma según
  Principio IV.

## 5. Zona horaria y formato

**Decision**: Todas las fechas/horas se almacenan en UTC en base de datos y
se convierten a `Europe/Madrid` únicamente en la capa de presentación,
usando la librería `date-fns` con `date-fns-tz` (o `Temporal`/`Intl` nativo
de forma equivalente si ya disponible en el runtime de Node usado).

**Rationale**: Almacenar en UTC evita ambigüedad de cambios de horario
(CET/CEST) al comparar solapes (RN1) o el instante actual (RN2); convertir
solo en la UI garantiza que lo mostrado a secretaría sea siempre
inequívoco en Europe/Madrid, cumpliendo el Principio II.

**Alternatives considered**:
- **Almacenar directamente en Europe/Madrid**: complica las comparaciones
  de rango en base de datos durante el cambio de horario (una hora de
  duración ambigua u repetida en el cambio de invierno), con riesgo de
  vulnerar RN1/RN2 en ese borde.

## 6. Testing

**Decision**: Vitest para tests unitarios y de integración (lógica de RN1,
RN2, cálculo de fin de cita, semilla determinista); Playwright para tests
end-to-end de los flujos de secretaría (alta, cambio de estado,
reprogramación) y para un test de concurrencia que dispara dos altas
simultáneas sobre el mismo hueco contra una base de datos real de pruebas.

**Rationale**: El Principio III exige explícitamente pruebas diseñadas para
provocar solape, incluyendo escenarios concurrentes; esto requiere golpear
una base de datos real (no mocks) con peticiones paralelas, lo que
Playwright/Vitest contra una base de datos PostgreSQL de test permiten de
forma directa. El Principio VI exige trazabilidad spec → test, por lo que
cada test debe referenciar su FR/escenario de aceptación en su descripción.

**Alternatives considered**:
- **Jest**: alternativa viable, pero Vitest tiene mejor integración nativa
  con el tooling de Next.js/TypeScript moderno (ESM, velocidad) sin
  configuración adicional.

## 7. Semilla de datos determinista

**Decision**: Script de seed de Prisma (`prisma/seed.ts`) con generador
pseudoaleatorio de semilla fija (p. ej. `seedrandom` con una constante de
proyecto) para elegir clientes, servicios y distribución de citas
(no_asistida ~10%, cancelada ~8%), de forma que dos ejecuciones sucesivas
produzcan exactamente los mismos registros e importes.

**Rationale**: FR-015 y el Principio V exigen reproducibilidad exacta entre
regeneraciones. Fijar la semilla del generador pseudoaleatorio y basar
todas las fechas relativas (8 semanas de historia, 2 semanas futuras) en una
fecha de referencia fija dentro del propio script (no en `Date.now()`)
garantiza determinismo real, verificable con SC-004.

**Alternatives considered**:
- **Datos fijos codificados a mano (sin generador aleatorio)**: totalmente
  determinista pero mucho más costoso de mantener para ~40 clientes y varias
  semanas de citas; un generador con semilla fija ofrece el mismo
  determinismo con mucho menos esfuerzo de escritura.

## Resumen de Technical Context resuelto

Todas las incógnitas quedan resueltas; no quedan `NEEDS CLARIFICATION`
pendientes para esta feature.

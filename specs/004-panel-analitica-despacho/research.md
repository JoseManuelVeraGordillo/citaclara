# Research: Panel de Analítica del Despacho

**Feature**: 004-panel-analitica-despacho | **Date**: 2026-08-24

Este documento resuelve las decisiones técnicas necesarias para implementar
la spec, priorizando reutilizar la infraestructura ya construida en
001-agenda-citas (Principio IV), exactitud monetaria (Principio II) y
gráficos claros sin jerga técnica (Principio VII).

## 1. Ubicación del panel en el proyecto existente

**Decision**: Añadir el panel como una página nueva (`/panel`) dentro del
mismo proyecto Next.js de 001-agenda-citas, sin crear un segundo proyecto
ni una API pública separada.

**Rationale**: El panel no tiene más consumidor que su propia UI (no hay
integración externa que consuma estos datos), por lo que separar
frontend/backend o exponer una API REST añadiría coordinación y
despliegue sin beneficio, violando el Principio IV. El mismo patrón que ya
usa `/agenda` (Server Component que consulta Prisma directamente) encaja
igual de bien aquí, con la ventaja de que esta feature es de solo lectura
(no necesita Server Actions de mutación).

**Alternatives considered**:
- **Servicio/proyecto de analítica separado**: permitiría escalar
  independientemente, pero es alcance especulativo para un despacho
  pequeño con un volumen de datos modesto (Principio IV); no hay ningún
  requisito de la spec que lo justifique.

## 2. Autenticación del panel

**Decision**: Reutilizar el patrón de sesión ya existente en
`lib/auth/sesion.ts` (cookie HMAC firmada con `SESSION_SECRET`), añadiendo
un segundo valor de sesión (`"panel"`) y una segunda cookie
(`citaclara_sesion_panel`) independiente de `citaclara_sesion`
(secretaría). Se valida contra `despacho.clavePanelHash` (ya existente en
el modelo de datos, sin uso funcional hasta esta feature) con `bcryptjs`,
igual que ya hace `entrarComoSecretaria` con `claveSecretariaHash`.

**Rationale**: FR-001 exige una clave de panel distinta de la de
secretaría; el campo `clavePanelHash` ya existe en `Despacho` precisamente
reservado para esto (`data-model.md` de 001-agenda-citas: "campo presente,
sin uso funcional en esta spec"). Añadir una segunda cookie con el mismo
mecanismo de firma HMAC ya probado es la solución más simple que aísla
completamente el acceso al panel del acceso a la agenda (si alguien solo
conoce la clave de secretaría, no puede entrar al panel, y viceversa),
sin construir un sistema de usuarios/roles nuevo (Principio IV).

**Alternatives considered**:
- **Reutilizar la misma cookie/clave que la agenda**: más simple, pero
  contradice el propio modelo de datos existente (que ya separa
  `claveSecretariaHash` de `clavePanelHash` explícitamente "para funciones
  administrativas futuras") y mezclaría el control de acceso de dos
  audiencias distintas (secretaría del día a día vs. Jose en reuniones de
  renovación).

## 3. Cálculo de métricas

**Decision**: Funciones puras en `lib/analitica/metricas.ts` que reciben
las citas ya cargadas (vía Prisma, agregadas por SQL cuando es una simple
suma/conteo, o cargadas y reducidas en memoria cuando el cálculo depende
de reglas de negocio como la definición de "ocupado") y devuelven los DTOs
de cada sección del panel (ver `data-model.md`). La página `/panel`
(Server Component, `export const dynamic = 'force-dynamic'` igual que
`/agenda`) invoca estas funciones en cada carga; no hay caché ni tablas de
agregación materializadas.

**Rationale**: El volumen de datos (miles de citas como máximo, para un
despacho pequeño) hace innecesaria una capa de agregación materializada o
un job de precálculo — consultar y reducir en cada carga es simple y
suficientemente rápido (Performance Goals: <2s), y evita el riesgo de
mostrar cifras desactualizadas en una reunión de renovación (la Assumption
de la spec descarta actualización en tiempo real, pero sí exige datos
frescos en cada carga de página). Aislar el cálculo en funciones puras
permite testear cada métrica unitariamente contra fixtures derivadas de la
semilla, sin levantar Next.js (Principio VI).

**Alternatives considered**:
- **Vista materializada / tabla de agregados en PostgreSQL**: útil si el
  volumen creciera mucho o el panel se consultara con muchísima
  frecuencia, pero es complejidad no justificada por el alcance actual
  (Principio IV); se puede reconsiderar en una spec futura si el
  rendimiento real lo exige.

## 4. Librería de gráficos

**Decision**: `recharts`, usado a través del wrapper de gráficos que
distribuye shadcn/ui (`components/ui/chart.tsx`, generado con el CLI de
shadcn ya usado en el proyecto).

**Rationale**: FR-008 exige "gráficos claros" con leyenda, sin jerga
técnica, legibles tanto en portátil como en móvil. El proyecto ya usa
shadcn/ui (Radix UI) para el resto de la interfaz; su wrapper de gráficos
sobre `recharts` es la integración oficial y mínima esfuerzo, hereda el
mismo sistema de temas/contraste que el resto de componentes, y cubre los
tres tipos de gráfico que necesita esta spec (barras para ingresos por
servicio y no asistencia por profesional, líneas multi-serie para
ocupación semanal y evolución por profesional) sin código de bajo nivel
adicional. Es la única dependencia nueva que añade esta feature.

**Alternatives considered**:
- **SVG dibujado a mano con Tailwind**: cero dependencias nuevas, pero
  reimplementar ejes, leyendas, tooltips y accesibilidad de teclado para
  cuatro gráficos distintos (uno de ellos multi-serie) es más código y más
  riesgo de regresión de accesibilidad que una librería madura ya
  integrada con el sistema de diseño existente — no está justificado por
  el Principio IV evitarla aquí, al contrario que evitar un framework de
  componentes completo (ya resuelto en 001-agenda-citas).
- **Chart.js**: librería madura, pero sin integración directa con
  shadcn/ui/Tailwind ya presente en el proyecto; añadiría un segundo
  sistema de temas de gráficos a mantener.

## 5. Ventana de "últimas 8 semanas completas"

**Decision**: Función `obtenerVentana8SemanasCompletas(fechaReferenciaUtc)`
en `lib/analitica/semanas.ts` que calcula el lunes de la semana de
`fechaReferenciaUtc` en Europe/Madrid (reutilizando `diaSemanaMadrid` de
`lib/tiempo/zona-horaria.ts`) y retrocede 8 semanas completas anteriores,
excluyendo siempre la semana en curso.

**Rationale**: La Clarification de la spec fija esta definición
exactamente y da un ejemplo verificable con la semilla (referencia
2026-08-17 → ventana 2026-06-22 a 2026-08-16). Reutilizar
`diaSemanaMadrid` evita reimplementar el cálculo de día de la semana en
huso horario correcto, que ya está resuelto y probado en 001-agenda-citas.

**Alternatives considered**:
- **Incluir la semana en curso con dato parcial señalizado**: la spec
  descarta explícitamente esta opción (Clarification/Assumptions) para
  evitar que una semana con solo 1 de 5 días de historia parezca una
  caída real de actividad.

## 6. Testing

**Decision**: Vitest para tests unitarios de `lib/analitica/metricas.ts`
y `lib/analitica/semanas.ts` (contra fixtures que reproducen los números
citados en `spec.md`, derivados de la semilla determinista) y para un test
de integración que carga el panel contra la base de datos de test y
verifica que el recuento de filas de `Cita`, `Cliente`, `Profesional` y
`Servicio` no cambia (SC-003, FR-006). Playwright para un test e2e que
entra con la clave de panel y comprueba que las 4 secciones renderizan
contenido no vacío.

**Rationale**: El Principio VI exige que cada FR/criterio de aceptación
tenga un test que lo referencie. El Principio V exige que toda cifra citada
en la spec sea reproducible; los tests unitarios de métricas son la forma
directa de demostrarlo (mismos datos que produce `npm run seed`, mismos
resultados). El test de integración de "0 escrituras" es la única forma
objetiva de verificar SC-003 más allá de una revisión de código.

**Alternatives considered**:
- **Verificar "0 escrituras" solo por revisión de código (sin test)**: más
  rápido de escribir, pero no es una prueba objetiva y se puede romper en
  silencio si una futura tarea añade sin querer una escritura (Principio
  VI exige el test, no solo la revisión).

## Resumen de Technical Context resuelto

Todas las incógnitas quedan resueltas; no quedan `NEEDS CLARIFICATION`
pendientes para esta feature.

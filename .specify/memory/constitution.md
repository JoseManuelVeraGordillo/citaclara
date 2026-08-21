<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections:
  - Core Principles (8): Spec First; Los Números No Admiten Creatividad;
    El Solape Es El Fallo Capital; Simplicidad y Cero Alcance Fantasma;
    Demostrable con Datos Reproducibles; Los Tests Acompañan a la Spec;
    Interfaz Clara y Moderna; Español de España
  - Alcance de Producto y Operación (SECTION_2)
  - Flujo de Trabajo y Puertas de Calidad (SECTION_3)
  - Governance
- Removed sections: none (initial ratification from template)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (generic Constitution Check gate remains compatible; no edit needed)
  - ✅ .specify/templates/spec-template.md (generic structure compatible; no edit needed)
  - ✅ .specify/templates/tasks-template.md (generic structure compatible; no edit needed)
  - ✅ .claude/skills/speckit-constitution/SKILL.md (this command; no outdated references found)
- Follow-up TODOs: none
-->

# CitaClara Constitution

## Core Principles

### I. Spec First

Todo comportamiento observable del sistema MUST nacer de una spec aprobada
en `specs/`. Ningún cambio de comportamiento visible para el despacho o
sus clientes se implementa sin que exista primero (o se corrija) su spec
correspondiente. La propiedad de cada spec MUST estar registrada en
`specs/MAPA.md`, con exactamente un propietario asignado por spec en todo
momento. Una spec sin propietario, o con comportamiento implementado que
no figura en ninguna spec, se considera una violación de esta constitución
y bloquea el merge.

**Rationale**: CitaClara nace greenfield con SDD y aspira a operar con
varias features y varios agentes en paralelo desde el primer mes. Sin una
fuente de verdad única y trazable por spec, el trabajo paralelo de varios
agentes deriva en comportamiento contradictorio, duplicado o huérfano.

### II. Los Números No Admiten Creatividad

Todos los importes MUST cuadrar al céntimo, siempre: sumas, descuentos,
totales y cualquier cálculo monetario que se muestre o se persista deben
ser exactos, sin redondeos silenciosos ni discrepancias toleradas. Toda
fecha u hora mostrada en la interfaz o en comunicaciones MUST eliminar
cualquier ambigüedad para un despacho de abogados español: zona horaria,
formato de fecha y franja horaria deben quedar siempre claros e
inequívocos para quien lee, sin exigir interpretación.

**Rationale**: Un despacho de abogados factura y cita con consecuencias
legales y económicas reales. Un céntimo descuadrado o una hora ambigua
(¿10:00 o 22:00?, ¿huso horario de qué región?) erosiona la confianza del
cliente y puede causar perjuicios profesionales graves.

### III. El Solape Es El Fallo Capital

Un profesional del despacho NUNCA MUST tener dos citas simultáneas, bajo
ninguna circunstancia, ni siquiera cuando dos reservas del mismo hueco
llegan en el mismo instante (condición de carrera). Toda feature que
escriba en la agenda MUST incluir pruebas diseñadas específicamente para
intentar provocar un solape, incluyendo escenarios concurrentes. Ninguna
feature que toque la agenda se considera completa sin esas pruebas en
verde.

**Rationale**: El solape es, por definición del negocio, el fallo más
grave posible del sistema: significa que un abogado no puede atender a un
cliente que confió en la cita. Es la única garantía que el producto no
puede permitirse romper ni una sola vez, y las condiciones de carrera son
precisamente el escenario donde este tipo de fallos se cuela sin que las
pruebas ingenuas lo detecten.

### IV. Simplicidad y Cero Alcance Fantasma

Ante dos soluciones que cumplen la spec, MUST elegirse la más simple.
Ninguna funcionalidad, dependencia, capa de abstracción o pieza de
infraestructura se añade sin estar justificada explícitamente en una
spec aprobada. Alcance especulativo ("por si acaso lo necesitamos
luego") MUST rechazarse.

**Rationale**: Con varios agentes trabajando en paralelo desde el primer
mes, la complejidad no justificada se multiplica rápido y se vuelve
imposible de auditar. Cada pieza de más es superficie de fallo, deuda de
mantenimiento y una spec fantasma que nadie posee.

### V. Demostrable con Datos Reproducibles

El producto MUST mantener datos de demostración deterministas: misma
semilla, misma historia, mismos resultados cada vez que se regeneran.
Toda spec, ejemplo o pieza de analítica que cite una cifra MUST poder
referenciar esos datos de forma que cualquier persona (o agente) pueda
reproducir exactamente el mismo número siguiendo los mismos pasos.

**Rationale**: Sin reproducibilidad, cada demo, cada ejemplo en una spec
y cada afirmación de analítica es un acto de fe. La reproducibilidad es
lo que permite que varios agentes y personas verifiquen resultados de
forma independiente y confíen en ellos.

### VI. Los Tests Acompañan a la Spec

Cada regla de negocio y cada criterio de aceptación relevante de una spec
MUST tener un test que la referencie explícitamente. La suite de tests en
verde MUST ser condición necesaria para el merge de cualquier cambio.
Ningún criterio de aceptación se considera cumplido si no existe un test
que lo demuestre.

**Rationale**: La trazabilidad spec → test es lo que permite que el
trabajo de varios agentes en paralelo se pueda verificar sin depender de
la memoria o el criterio subjetivo de quien revisa; el test es la prueba
objetiva de que la spec se cumple.

### VII. Interfaz Clara y Moderna

La interfaz MUST poder usarla secretaría sin formación previa y sin
manual. MUST evitarse jerga técnica en pantalla; MUST mantenerse
contraste y tamaños de texto accesibles; la interfaz MUST funcionar tanto
en el portátil de secretaría como en el móvil de un cliente. Esta es una
exigencia de calidad de producto, no una decisión técnica: la tecnología
concreta usada para construir la UI se decide en el plan de cada feature,
nunca en esta constitución.

**Rationale**: El personal de un despacho pequeño no tiene tiempo ni
perfil técnico para aprender herramientas complejas, y los clientes
acceden habitualmente desde el móvil. La usabilidad sin fricción es un
requisito de negocio, no un extra estético.

### VIII. Español de España

Todo texto visible para usuarios (interfaz, mensajes, comunicaciones,
documentación de cara al despacho o sus clientes) MUST redactarse en
español de España, con su terminología, ortografía y convenciones
propias (incluidas las de fecha, hora e importes descritas en el
Principio II).

**Rationale**: CitaClara sirve a un despacho de abogados español; usar
variantes distintas del español (o mezclar con inglés innecesario)
introduce fricción y una sensación de producto no adaptado al contexto
del cliente.

## Alcance de Producto y Operación

CitaClara es un producto greenfield para un despacho de abogados pequeño
que atiende áreas como Civil, Penal, Administrativo, Extranjería y
Social. Esta constitución fija principios de negocio y de calidad;
deliberadamente NO fija stack tecnológico, formatos de datos ni
estructuras de proyecto — esas decisiones son propiedad exclusiva del
plan (`plan.md`) de cada feature, elaborado con `/speckit-plan`.

El producto aspira a operar con varias features y varios agentes
trabajando en paralelo desde el primer mes. Esto exige que:

- Toda spec tenga un propietario único y localizable en `specs/MAPA.md`
  (Principio I), de modo que dos agentes no compitan por la misma pieza
  de comportamiento sin coordinación.
- Los límites entre specs sean explícitos, de forma que el trabajo
  paralelo no produzca comportamiento contradictorio.

## Flujo de Trabajo y Puertas de Calidad

- Ningún cambio de comportamiento observable se fusiona sin una spec
  aprobada que lo respalde y sin los tests que la Principio VI exige.
- Toda feature que lea o escriba en la agenda de citas MUST superar,
  como puerta de calidad explícita, pruebas de concurrencia orientadas a
  provocar solapes (Principio III) antes de considerarse lista para
  revisión.
- Toda cifra monetaria o fecha/hora que aparezca en una spec, un ejemplo
  o una pantalla MUST poder verificarse contra los datos de demostración
  deterministas (Principio V).
- Las revisiones de código y de spec MUST comprobar el cumplimiento de
  los ocho Principios anteriores; cualquier desviación MUST justificarse
  por escrito (por ejemplo, en la sección de Complejidad del plan) o
  corregirse antes del merge.

## Governance

Esta constitución prevalece sobre cualquier otra práctica, convención o
preferencia individual dentro del proyecto CitaClara. Ante conflicto
entre esta constitución y cualquier plan, spec o guía de ejecución, la
constitución prevalece.

**Procedimiento de enmienda**: cualquier cambio a esta constitución
MUST proponerse explícitamente, documentar su motivación de negocio o
calidad, y actualizar el número de versión conforme a la política de
versionado semántico siguiente:

- **MAJOR**: eliminación o redefinición incompatible de un principio
  existente.
- **MINOR**: adición de un nuevo principio o expansión material de una
  guía existente.
- **PATCH**: aclaraciones, correcciones de redacción o refinamientos no
  semánticos.

Toda enmienda MUST propagarse, en la misma revisión, a los artefactos
dependientes (plantillas de plan, spec y tareas, y guías de ejecución)
que queden desalineados como consecuencia del cambio.

**Revisión de cumplimiento**: toda spec, plan y tarea generados dentro
del proyecto MUST poder justificar su alineamiento con los ocho
Principios de esta constitución. La complejidad no justificada
(Principio IV) MUST documentarse y justificarse explícitamente o
eliminarse antes de avanzar de fase.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21

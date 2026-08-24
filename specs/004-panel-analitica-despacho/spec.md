# Feature Specification: Panel de Analítica del Despacho

**Feature Branch**: `004-panel-analitica-despacho`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Panel de analítica para el despacho. Jose lo necesita para las renovaciones: 'enseñar al despacho lo que CitaClara le ahorra'. Alcance: una página del panel (misma clave que la agenda), con interfaz moderna y gráficos claros: ocupación semanal por profesional, tasa de no asistencia por profesional, ingresos por servicio (citas completadas; importes exactos, al céntimo), y evolución de las últimas 8 semanas. Solo lectura: esta feature no escribe NADA. Construye los ejemplos de la spec con los números reales de la semilla (p. ej., la tasa de no asistencia real de cada profesional). Preguntas cerradas para Jose: ¿cómo se define exactamente 'tasa de no asistencia' y 'ocupación'?"

## Clarifications

### Session 2026-08-24

- Q: ¿El desglose de "ingresos por servicio" (User Story 1 / FR-004) debe mostrar el total histórico de todas las citas completadas desde siempre, o limitarse a las mismas últimas 8 semanas completas que usa la evolución? → A: Limitado a las últimas 8 semanas completas, igual que la evolución.
- Q: ¿Qué debe representar exactamente el gráfico de "evolución de las últimas 8 semanas" (User Story 4 / FR-005): solo el total del despacho, o una serie por profesional? → A: Una serie por profesional (3 líneas de citas/ingresos, una por profesional).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver los ingresos que genera cada servicio (Priority: P1)

Jose abre el panel de analítica y ve, de un vistazo, cuánto ha facturado el
despacho por cada tipo de servicio (solo citas completadas) durante las
últimas 8 semanas completas, con importes exactos al céntimo. Es el
argumento económico central para una conversación de renovación: "esto es
lo que ha generado el despacho gestionando citas con CitaClara".

**Why this priority**: Es el dato con más peso comercial para justificar la
renovación ante el despacho: una cifra de facturación concreta, verificable
y exacta.

**Independent Test**: Puede probarse abriendo el panel y comprobando que el
desglose de ingresos por servicio coincide, céntimo a céntimo, con la suma
de `precioCentimos` de las citas `completada` cuya fecha cae dentro de las
últimas 8 semanas completas (la misma ventana que usa la evolución de la
User Story 4).

**Acceptance Scenarios**:

1. **Given** el despacho tiene citas en estado `completada` para varios
   servicios dentro de las últimas 8 semanas completas, **When** Jose abre
   el panel, **Then** ve un importe en euros con céntimos por cada
   servicio y el total, exacto respecto a la suma de esas citas (p. ej.,
   con los datos de la semilla, ventana 2026-06-22 a 2026-08-16:
   "Redacción de contrato" → 26.280,00 €, "Primera consulta" →
   15.600,00 €, "Gestión administrativa" → 11.300,00 €, "Consulta de
   seguimiento" → 10.845,00 €; total 64.025,00 €).
2. **Given** un servicio no tiene ninguna cita `completada` en la ventana
   de las últimas 8 semanas completas, **When** Jose consulta el
   desglose, **Then** el servicio aparece con importe 0,00 € en lugar de
   desaparecer de la lista.
3. **Given** existen citas `reservada`, `cancelada` o `no_asistida` para un
   servicio, o citas `completada` fuera de la ventana de 8 semanas,
   **When** se calcula el ingreso de ese servicio, **Then** esas citas NO
   se incluyen en el importe.

---

### User Story 2 - Ver la ocupación semanal de cada profesional (Priority: P1)

Jose abre el panel y ve, por cada profesional del despacho, qué porcentaje
de su horario laboral semanal ha estado ocupado con citas, para demostrar
que CitaClara ayuda a aprovechar el tiempo de trabajo del despacho.

**Why this priority**: Junto con los ingresos, es el otro argumento de
"ahorro/eficiencia" central para la renovación: demuestra uso real del
tiempo disponible.

**Independent Test**: Puede probarse abriendo el panel y comprobando que el
porcentaje de ocupación de cada profesional en una semana concreta coincide
con los minutos en estado `reservada` o `completada` (misma definición de
"ocupado" que ya usa la agenda), divididos entre los minutos laborales
disponibles esa semana (p. ej., semana del 2026-06-22, con los datos de la
semilla: Nuria Lagar 62,8%, David Rayo 68,3%, Jose Lagar 65,6%).

**Acceptance Scenarios**:

1. **Given** un profesional tiene citas repartidas en una semana concreta,
   **When** Jose consulta su ocupación, **Then** ve un porcentaje entre 0%
   y 100% para esa semana, calculado sobre las horas laborales reales de
   esa semana (franjas 09:00–14:00 y 16:00–20:00, lunes a viernes).
2. **Given** un profesional no tiene ninguna cita en una semana, **When**
   Jose consulta su ocupación, **Then** el panel muestra 0% para esa
   semana (sin error ni división por cero visible).
3. **Given** una semana es festiva o de fin de semana según el calendario
   laboral del despacho, **When** se calcula la capacidad de esa semana,
   **Then** esos días no cuentan como minutos disponibles.

---

### User Story 3 - Ver la tasa de no asistencia de cada profesional (Priority: P2)

Jose abre el panel y ve, por cada profesional, qué porcentaje de sus citas
terminan en "no asistida", para poder hablar con el despacho sobre
fiabilidad de la agenda y el valor de los recordatorios.

**Why this priority**: Refuerza el argumento de renovación pero es un dato
secundario frente a ingresos y ocupación: aporta contexto de fiabilidad,
no una cifra económica directa.

**Independent Test**: Puede probarse abriendo el panel y comprobando que el
porcentaje de no asistencia de cada profesional coincide con el recuento de
citas `no_asistida` sobre el denominador acordado con Jose (p. ej., con los
datos de la semilla, sobre el total de citas históricas de cada
profesional: Nuria Lagar 10,85% (42/387), David Rayo 11,84% (47/397), Jose
Lagar 8,14% (32/393) — ver sección Assumptions para la definición exacta
acordada).

**Acceptance Scenarios**:

1. **Given** un profesional tiene citas históricas con distintos estados,
   **When** Jose consulta su tasa de no asistencia, **Then** ve un
   porcentaje calculado únicamente sobre citas ya resueltas (pasadas), sin
   incluir citas futuras `reservada`.
2. **Given** un profesional no tiene ninguna cita histórica, **When** Jose
   consulta su tasa, **Then** el panel muestra un estado claro (p. ej.,
   "sin datos") en lugar de un porcentaje engañoso o un error.

---

### User Story 4 - Ver la evolución de las últimas 8 semanas (Priority: P2)

Jose abre el panel y ve cómo ha evolucionado, semana a semana y por
profesional, el número de citas y los ingresos del despacho a lo largo de
las últimas 8 semanas completas, para mostrar una tendencia (no solo una
foto fija) y poder comparar cómo progresa cada profesional durante la
conversación de renovación.

**Why this priority**: Es el argumento de "tendencia sostenida en el
tiempo" que refuerza los otros tres, pero depende conceptualmente de que
ingresos y ocupación ya existan como métricas — por eso se prioriza después.

**Independent Test**: Puede probarse abriendo el panel y comprobando que el
gráfico de evolución muestra 8 puntos por profesional (uno por semana
completa, una serie por cada uno de los tres profesionales), y que el
valor de cada punto coincide con el recuento/suma de esa semana y ese
profesional en los datos de demostración (p. ej., con los datos de la
semilla, semana 2026-06-22: Nuria Lagar 49 citas / 2.735,00 € en
completadas, David Rayo 48 citas / 3.130,00 € en completadas, Jose Lagar
48 citas / 2.745,00 € en completadas).

**Acceptance Scenarios**:

1. **Given** el despacho tiene 8 semanas completas de historia o más,
   **When** Jose consulta la evolución, **Then** ve exactamente 8 semanas
   por cada profesional, ordenadas cronológicamente, con la semana más
   reciente completa al final, y puede distinguir visualmente la serie de
   cada profesional.
2. **Given** la semana actual está en curso (aún no ha terminado), **When**
   se calculan las "últimas 8 semanas", **Then** la semana en curso NO se
   cuenta como una de las 8 (se muestran las 8 semanas completas
   anteriores).
3. **Given** el despacho tiene menos de 8 semanas de historia, **When** Jose
   consulta la evolución, **Then** el panel muestra únicamente las semanas
   completas disponibles para cada profesional, indicando claramente que
   el histórico es más corto (sin rellenar con datos inventados).
4. **Given** un profesional no tiene ninguna cita en una semana concreta de
   la ventana, **When** Jose consulta su serie de evolución, **Then** esa
   semana se muestra con 0 citas / 0,00 € para ese profesional, sin
   romper la serie ni el gráfico.

---

### Edge Cases

- ¿Qué ve Jose si el despacho aún no tiene ninguna cita en el sistema
  (despacho recién creado)? El panel MUST mostrar un estado vacío claro en
  cada sección, no un error ni un gráfico en blanco sin explicación.
- ¿Qué pasa si un profesional se da de baja (`activo = false`) pero tiene
  historial de citas? Sus métricas históricas MUST seguir apareciendo en
  el panel (el ahorro que demostró sigue siendo real), pero debe quedar
  claro que ya no está activo.
- ¿Qué ocurre si alguien intenta acceder al panel sin la clave correcta?
  El sistema MUST rechazar el acceso sin revelar ningún dato del panel.
- ¿Qué pasa con las citas `cancelada` en las distintas métricas? MUST
  quedar excluidas de "ingresos" (no son `completada`) y su tratamiento en
  "ocupación" y "tasa de no asistencia" queda fijado por las definiciones
  acordadas con Jose (ver Assumptions).
- Todos los importes mostrados MUST coincidir exactamente (al céntimo) con
  los datos subyacentes: no se admite redondeo visual que oculte
  descuadres (Principio "Los Números No Admiten Creatividad").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar el panel de analítica como una única
  página, protegida por la clave de panel del despacho (`clavePanelHash`,
  ya existente en el modelo de datos y reservada precisamente para este
  tipo de función administrativa), distinta de la clave de secretaría de
  la agenda.
- **FR-002**: El sistema MUST mostrar, para cada profesional activo o
  inactivo con historial, su porcentaje de ocupación semanal, calculado
  como los minutos en citas `reservada` o `completada` (misma definición
  de "ocupado" que ya usa `calcularHuecos` en la agenda; una cita
  `cancelada` o `no_asistida` libera el hueco) entre los minutos laborales
  disponibles, para cada una de las últimas 8 semanas completas.
- **FR-003**: El sistema MUST mostrar, para cada profesional, su tasa de
  no asistencia, calculada como el número de citas `no_asistida` entre el
  total de sus citas históricas resueltas (`completada` + `cancelada` +
  `no_asistida`).
- **FR-004**: El sistema MUST mostrar, para cada servicio, la suma de
  importes de sus citas en estado `completada` dentro de las últimas 8
  semanas completas (misma ventana que FR-005), expresada en euros con
  céntimos exactos (sin redondeos que introduzcan descuadre), junto con el
  total general.
- **FR-005**: El sistema MUST mostrar una evolución temporal (citas e
  ingresos) de las últimas 8 semanas completas desglosada por profesional
  (una serie por cada profesional, no solo un total agregado del
  despacho), excluyendo la semana en curso si está incompleta.
- **FR-006**: El sistema MUST ser de solo lectura: ninguna interacción del
  panel MUST crear, modificar ni eliminar citas, clientes, profesionales,
  servicios ni ningún otro dato del despacho.
- **FR-007**: El sistema MUST presentar toda fecha, hora y semana con zona
  horaria y rango sin ambigüedad para quien lee (Europe/Madrid), conforme
  al principio de claridad temporal del despacho.
- **FR-008**: El sistema MUST presentar el panel con una interfaz que
  secretaría y el propio Jose puedan interpretar sin formación previa
  (gráficos con leyenda clara, sin jerga técnica), en español de España,
  y MUST funcionar correctamente tanto en portátil como en móvil.
- **FR-009**: El sistema MUST mostrar un estado vacío explícito (no un
  error ni un gráfico vacío sin explicación) en cualquier sección donde no
  existan datos suficientes para el cálculo (p. ej., profesional sin
  citas en una semana concreta, servicio sin citas completadas, despacho
  sin historial).
- **FR-010**: El sistema MUST calcular todas las métricas exclusivamente a
  partir de citas ya sucedidas o resueltas cuando corresponda (p. ej., la
  tasa de no asistencia MUST excluir citas futuras `reservada`).

### Key Entities *(include if feature involves data)*

- **Cita**: unidad base de cálculo de todas las métricas del panel. Aporta
  profesional, servicio, franja horaria (inicio/fin), estado
  (`reservada`/`completada`/`cancelada`/`no_asistida`) e importe del
  servicio asociado en el momento de completarse. Esta feature solo lee
  citas ya existentes (creadas por la feature de agenda); no las modifica.
- **Profesional**: sujeto de las métricas de ocupación y no asistencia.
  Puede estar activo o inactivo; el historial de un profesional inactivo
  sigue siendo relevante para el panel.
- **Servicio**: sujeto de la métrica de ingresos; aporta el precio exacto
  (en céntimos) usado para sumar ingresos de citas `completada`.
- **Despacho**: contexto de todo el panel (todas las métricas son por
  despacho) y propietario de la clave de panel usada para proteger el
  acceso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jose puede abrir el panel con la clave de panel y ver las
  cuatro métricas (ocupación semanal, no asistencia, ingresos por
  servicio, evolución de 8 semanas) sin necesitar explicación ni ayuda de
  un técnico.
- **SC-002**: El 100% de los importes mostrados en el panel cuadran al
  céntimo con los datos de demostración deterministas, verificable
  reproduciendo la semilla (Principio "Demostrable con Datos
  Reproducibles").
- **SC-003**: Ninguna acción realizada en el panel (clics, filtros,
  navegación dentro de la página) produce cambios verificables en los
  datos del despacho: 0 escrituras, comprobable inspeccionando que la
  feature no invoca ninguna operación de creación, actualización o
  borrado.
- **SC-004**: El panel se usa con éxito en una reunión de renovación real
  con el despacho sin que Jose necesite recurrir a hojas de cálculo u
  otra fuente de datos para explicar el ahorro/valor de CitaClara.
- **SC-005**: El panel es legible y utilizable tanto en pantalla de
  portátil como en pantalla de móvil, sin que ninguna métrica quede
  cortada, solapada o ilegible.

## Assumptions

- **Definición de "tasa de no asistencia"** (acordada con Jose): se
  calcula sobre TODAS las citas históricas resueltas del profesional
  (`completada` + `cancelada` + `no_asistida`); una cita futura
  `reservada` nunca cuenta. Con los datos de la semilla: Nuria Lagar
  10,85% (42/387), David Rayo 11,84% (47/397), Jose Lagar 8,14% (32/393).
  Esta definición penaliza al profesional por cualquier cita perdida,
  incluidas las que el cliente canceló con antelación, no solo las
  ausencias sin aviso.
- **Definición de "ocupación semanal"** (acordada con Jose): un hueco
  cuenta como ocupado cuando la cita está en estado `reservada` o
  `completada` — la misma definición que ya usa `calcularHuecos` en la
  agenda. Una cita `cancelada` o `no_asistida` libera el hueco (se trata
  como disponible), igual que hoy hace la vista de agenda. Con los datos
  de la semilla, semana 2026-06-22: Nuria Lagar 62,8%, David Rayo 68,3%,
  Jose Lagar 65,6%.
- El panel se protege con la clave de panel del despacho (`clavePanelHash`)
  ya presente en el modelo de datos desde la feature de agenda, reservada
  explícitamente para "funciones administrativas futuras" — se asume que
  esta es esa función. No se reutiliza la clave de secretaría.
- "Últimas 8 semanas" significa las 8 semanas naturales (lunes a domingo,
  Europe/Madrid) completas más recientes, excluyendo la semana en curso si
  todavía no ha terminado. Con la semilla de referencia (hoy =
  2026-08-17), esas 8 semanas van del 2026-06-22 al 2026-08-16.
- Los datos de demostración usados como ejemplo en esta spec proceden de la
  semilla determinista del proyecto (`prisma/seed.ts`,
  `SEMILLA_PRNG="citaclara-001-agenda-citas-v1"`, fecha de referencia
  2026-08-17), reproducibles ejecutando `npm run seed` seguido de
  `npm run seed:snapshot` (Principio "Demostrable con Datos
  Reproducibles").
- El panel no incluye filtros por rango de fechas personalizado ni
  exportación de datos en esta primera versión: el alcance se limita a las
  cuatro visualizaciones descritas, todas de solo lectura.
- El panel no requiere actualización en tiempo real: se asume que Jose lo
  consulta puntualmente antes o durante una reunión, por lo que basta con
  que los datos reflejen el estado de la base de datos en el momento de
  cargar la página.

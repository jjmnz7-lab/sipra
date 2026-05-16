**ESPECIFICACIÓN DE PANTALLA: \"Grupos\" (SIPRA V1)**

**1. Objetivo Principal y Filosofía**

- **Rol del sistema:** Actuar como un contenedor operativo flexible
  (agnóstico a la disciplina) para organizar personas y ejecutar
  acciones masivas.

- **Objetivo del usuario:** Gestionar colectivos (categorías, horarios,
  niveles) y delegar la incomodidad del cobro a la presión social sana
  de los grupos de WhatsApp.

- **Filosofía UX:** **\"SIPRA no reemplaza a WhatsApp, lo organiza\"**.
  Prioriza la coordinación ligera sobre la administración académica.

**2. Anatomía de la Interfaz: Listado General**

**A. Header Superior**

- **Título:** \"Grupos\".

- **Acciones:** \* Icono 🔍 (Búsqueda por nombre de grupo o categoría).

  - Icono ＋ (Crear grupo: Solo requiere Nombre y Tipo opcional).

**B. Tarjeta de Grupo (List Item)**

Diseño compacto para visualización de \"salud\" del grupo.

- **Línea 1:** Nombre del Grupo (Ej. Categoría 2015).

- **Línea 2:** Conteo de alumnos (Ej. 18 alumnos).

- **Indicadores (Semáforo suave):** Badges circulares con 🟢 {n}, 🟡
  {n}, 🔴 {n} indicando el estado financiero de los miembros.

- **Micro-Contexto:** Texto sutil con el próximo evento (Ej. 📅 Juego
  semifinal · viernes).

**3. Anatomía de la Interfaz: Vista Interna del Grupo**

**A. Snapshot Operativo (Header Interno)**

Ubicado en la parte superior tras hacer *Tap* en un grupo.

- **KPIs Humanos:** 🔴 5 pendientes \| 🟢 14 al corriente.

- **KPI Financiero (Secundario):** 💰 Pendiente grupo: \${monto} (Fuente
  pequeña para evitar ansiedad).

- **Eventos Operativos:** Carrusel horizontal de *pills* (pastillas) con
  avisos próximos (Ej. 📅 Juego viernes, 🎭 Ensayo).

**B. Herramientas de Acción Masiva (CTAs Principales)**

Botones destacados que ejecutan lógica sobre todo el grupo:

1.  **💰 Nuevo cargo:** Genera un cargo financiero para el grupo.

2.  **📋 Generar resumen:** Motor de reporte para WhatsApp.

3.  **📅 Nuevo aviso:** Crea un evento operativo no financiero.

**C. Lista de Miembros (Vista de Navegación)**

Lista ultra-compacta diseñada para identificar casos y navegar al
detalle individual.

- **Visual:** Punto de color + Nombre + Concepto de adeudo corto.

- **Acción:** *Tap* redirige a la pantalla de **Seguimiento**
  (Expediente Vivo). *Nota: No hay botones de acción individual en esta
  vista para evitar redundancia con la pantalla de Pendientes.*

**4. Lógica de Funcionalidades Core**

**A. El Resumen Compartible (WhatsApp Optimizer)**

- **Formato:** Texto plano (Editable en un modal preview antes de
  enviar).

- **Estructura del Mensaje:** \* **Lista Verde (Dopamina):** \"Al
  corriente: {Nombres}\".

  - **Lista Roja (Suave):** \"Pendientes por confirmar: {Nombres}\"
    (Evitar palabras como \"morosos\").

  - **Cierre Protector:** \"Si ya pagaste, favor de ignorar este mensaje
    🙌\".

**B. Creación de Cargos con Exclusión**

Al crear un cargo grupal (Ej. Uniformes), el sistema debe presentar la
lista de alumnos con *checkboxes*.

- **Default:** Todos seleccionados (☑).

- **Acción:** El usuario desmarca (☐) a quienes no debe aplicarse el
  cobro (becados, quienes ya tienen la prenda, etc.).

**C. Avisos Operativos (Inyección de Timeline)**

Cualquier aviso creado en el grupo debe:

1.  Crear un registro en el Timeline de cada alumno del grupo en la
    categoría 📅 Operativo.

2.  Si el \"Modo Asistido\" está activo, generar una sugerencia de
    mensaje grupal.

**5. Reglas de Negocio para el Analista**

1.  **Filtros Dinámicos:** Al filtrar por grupo en cualquier pantalla,
    los KPIs deben recalcularse en tiempo real para ese contexto.

2.  **Arquitectura de Datos:** El objeto Grupo es un contenedor
    relacional. No debe tener lógica académica (calificaciones,
    asistencias).

3.  **Integración WhatsApp:** El sistema no envía el mensaje
    directamente (API de Business); abre la interfaz de WhatsApp del
    usuario con el texto pre-cargado para mantener el control humano y
    la calidez relacional.

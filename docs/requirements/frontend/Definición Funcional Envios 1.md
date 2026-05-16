**ESPECIFICACIÓN DE PANTALLA: \"Envíos\" (Outbox)**

**1. Objetivo Principal y Filosofía**

- **Rol del sistema**: Actuar como una **\"Zona de Staging\"** para la
  revisión y validación de comunicaciones automáticas generadas por el
  sistema.

- **Objetivo del usuario**: Validar y despachar mensajes masivos (meta:
  20 mensajes en 10 segundos) manteniendo el control humano absoluto.

- **Principio Rector**: **\"Validación rápida, no administración\"**. La
  pantalla no es para escribir, es para aprobar.

**2. Navegabilidad y Acceso**

Esta es una **pantalla contextual** y no forma parte del menú de
navegación principal (Tab Bar).

- **Trigger Principal**: Botón \[ Revisar \] en el banner del Asistente
  de la pantalla de **Pendientes** o **Grupos**.

- **Flujo de Salida**: Al finalizar los envíos o descartar la lista, el
  sistema debe realizar una transición automática de regreso a la
  pantalla de origen.

**3. Anatomía de la Interfaz (Top to Bottom)**

**A. Header de Control**

- **Título**: \"Envíos\".

- **Contador de Estado**: Etiqueta dinámica (ej. \"5 mensajes listos
  para enviar\").

- **Acción Masiva**: Botón \[ Enviar seleccionados \]. En V1, este es el
  CTA principal para fomentar la revisión antes del envío.

**B. Lista de Sugerencias (Tarjetas de Alta Densidad)**

Cada tarjeta representa un mensaje pre-generado por el motor de
automatización.

- **Identidad**: Nombre del alumno o tutor.

- **Contexto Operativo**: Concepto del cargo y monto (ej. *Mensualidad
  mayo · \$800*).

- **Preview de Mensaje**: Una sola línea de texto (ej. *\"Hola Ana, te
  recordamos\...\"*).

- **Acciones por Tarjeta**:

  - \[ Enviar \]: Ejecución inmediata del envío individual.

  - \[ Editar \]: Abre un editor rápido para personalizar el texto,
    preservando el \"toque humano\".

  - \[ Ahora no / Descartar \]: Elimina la sugerencia de la cola actual.

**4. Lógica de \"Confianza Operacional\" (Reglas de Negocio)**

**A. El Filtro de Confianza (Soft Conflicts)**

Antes de renderizar una tarjeta en esta pantalla, el sistema debe
validar la integridad del dato en tiempo real:

- **Regla**: Si se registró un pago o una promesa de pago *después* de
  que el sistema generó la sugerencia, la tarjeta debe mostrar un aviso
  de advertencia: ⚠️ Pago/Promesa detectada. ¿Descartar?.

**B. Registro Automático en Timeline**

- **Regla**: Todo mensaje despachado (individual o masivamente) desde
  esta pantalla debe generar automáticamente un evento de tipo 📩
  Comunicación en el **Seguimiento** del alumno.

**C. Modos de Automatización**

La pantalla adapta su comportamiento según la configuración del usuario:

- **Asistido (Default)**: Los mensajes se acumulan aquí y requieren
  aprobación uno a uno o en bloque.

- **Semi-automático**: El sistema agrupa los mensajes y pide una
  confirmación única para el envío de lotes.

- **Automático**: Esta pantalla se convierte en un **Historial de
  Actividad Reciente**, permitiendo supervisar lo que el sistema ya
  envió.

**5. Micro-UX y Estados de Éxito**

- **Feedback de Envío**: Tras la acción masiva, mostrar un check sutil:
  ✅ {n} mensajes enviados.

- **Tono**: Profesional y sobrio. Evitar elementos de gamificación o
  celebraciones (confetti), manteniendo el enfoque en la eficiencia
  operativa.

**6. Lo que NO es esta pantalla (Non-Goals)**

- **NO es un Chat**: No permite recibir respuestas ni ver hilos de
  conversación.

- **NO es Marketing**: No incluye herramientas de segmentación, campañas
  de ventas o boletines.

- **NO es un CRM de Ventas**: No gestiona prospectos; solo supervisa la
  cobranza y coordinación de alumnos activos.

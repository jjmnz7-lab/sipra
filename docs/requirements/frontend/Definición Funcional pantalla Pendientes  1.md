**ESPECIFICACIÓN DE PANTALLA: \"Pendientes\" (SIPRA V1)**

**1. Objetivo Principal y Filosofía**

- **Rol del sistema:** Es el \"Inbox Operativo\" y el núcleo absoluto de
  la aplicación.

- **Objetivo del usuario:** Responder en menos de 3 segundos: *\"¿Quién
  me falta y qué tengo que hacer?\"*.

- **Filosofía UX:** Mobile-first, alta densidad de información
  accionable, contención de carga cognitiva (sin métricas complejas) y
  enfoque en la resolución rápida (Quick Actions).

**2. Anatomía de la Interfaz (Top to Bottom)**

**A. Header Superior**

Fijo en la parte superior. Minimalista para ahorrar espacio vertical.

- **Alineación Izquierda:** Texto \"Pendientes\" (o el nombre corto de
  la academia).

- **Alineación Derecha:** \* Icono 🔍 (Búsqueda rápida por nombre).

  - Icono ⚙️ o Avatar (Abre menú secundario: Configuración, Templates,
    Cuenta).

**B. Termómetro Operativo (KPIs)**

Franja de indicadores estáticos (sin gráficas). Prioriza \"personas\"
sobre \"dinero\" para reducir la ansiedad financiera.

- 🔴 {X} pendientes (KPI Principal).

- 🟢 \${X} hoy (Total recaudado en el día actual).

- ⚠️ {X} vencidos (Casos críticos).

**C. Asistente Condicional (Sugerencias Automáticas)**

Módulo inteligente que notifica acciones pre-procesadas por el sistema.

- **Regla de Renderizado:** Solo es visible si el conteo de sugerencias
  es \> 0. Si es 0, el contenedor colapsa (display: none).

- **Contenido:** \* ✨ {X} recordatorios listos

  - ⚠️ {X} promesas vencen hoy

- **Acción:** Botón \[ Revisar \] (Redirige a la vista \"Outbox/Envíos\"
  para aprobar en bloque).

**D. Filtros Rápidos (Chips)**

Fila de botones tipo *pills* con scroll horizontal.

- **Valores por defecto:** \[ Todos \] \[ Vencidos \] \[ Parciales \] \[
  {Grupo 1} \] \[ {Grupo 2} \].

- **Comportamiento Dinámico:** Al seleccionar un chip (ej. Categoría
  2015), los KPIs del \"Termómetro Operativo\" y la Lista Principal se
  recalculan instantáneamente para reflejar solo la realidad de ese
  filtro.

**E. Lista Operativa (Tarjetas de Deudor)**

El núcleo de la pantalla. Tarjetas ultra compactas (Máximo 3 líneas de
texto).

- **Estructura de la Tarjeta:**

  - **Línea 1:** Indicador de color (Punto circular) + Nombre del
    Alumno.

  - **Línea 2:** Concepto · Monto (Ej. *Mensualidad mayo · \$800*).

  - **Línea 3 (Contextual):** Estado relacional (Ej. *Prometió pagar
    hoy*).

  - *Regla Dinámica (Densidad Dinámica):* Si NO hay filtro de grupo
    activo, mostrar el grupo en esta línea. Si el filtro de grupo SÍ
    está activo, ocultar el nombre del grupo para ahorrar espacio.

- **Acciones Visibles (Alineadas a la derecha):**

  - Icono 💬: Lanza flujo de comunicación (WhatsApp / Recordatorio).

  - Icono 💵: Lanza Bottom Sheet de \"Registro Rápido de Pago\".

**F. Estado Vacío (Empty State)**

Se muestra cuando la lista de pendientes es cero. Su objetivo es generar
un refuerzo psicológico positivo.

- **UI:** Icono o ilustración minimalista.

- **Texto Principal:** ✅ Todo al corriente hoy.

- **Texto Secundario:** 📅 Próximo cargo: {Día de la semana}.

**G. Botón Flotante (FAB)**

Herramienta de entrada rápida para operaciones de campo.

- **UI:** Botón circular con icono + en la esquina inferior derecha.

- **Comportamiento:** Se oculta suavemente al hacer *scroll down* (para
  no tapar las tarjetas) y reaparece al hacer *scroll up*.

- **Acciones desplegables:** Registrar pago, Crear cargo, Crear aviso.

**3. Interacciones y Gestos (Micro-UX)**

La pantalla utiliza interacciones táctiles nativas móviles para acelerar
el flujo:

- **Tap en la Tarjeta (Zona central/texto):** Redirige a la pantalla
  **Seguimiento** (Expediente Vivo / Timeline) de ese alumno.

- **Tap en Icono 💵:** Abre Bottom Sheet de pago.

- **Tap en Icono 💬:** Prepara y sugiere el mensaje de cobranza.

- **Swipe Derecho (sobre la tarjeta):** Atajo avanzado (Acción rápida de
  cobro).

- **Swipe Izquierdo (sobre la tarjeta):** Atajo avanzado para menú
  secundario (Pausar, Promesa, Notas).

**4. Especificación del \"Bottom Sheet\" (Pago Rápido)**

Modal que emerge desde abajo sin sacar al usuario de la pantalla de
Pendientes. Diseñado para fricción cero.

- **Input \"Monto\":** Pre-llenado automáticamente con el total del
  saldo deudor (\$800).

- **Botón Primario (Gigante):** \[ Confirmar pago completo \]. (Action:
  Liquida el cargo, cambia estado a verde, cierra bottom sheet).

- **Acción Secundaria (Texto pequeño interactivo):** ¿Fue parcial? \[
  Registrar abono \]. (Action: Permite editar el monto del input y
  actualiza el saldo).

**5. Manejo de Errores y Estados (Control de Daños)**

- **Feedback Temporal:** Cuando un pago se registra con éxito (desde el
  FAB o el Bottom Sheet), la tarjeta en la lista NO desaparece
  instantáneamente (para evitar ansiedad de \"pérdida de datos\"). La
  tarjeta cambia su indicador a 🟢 Verde, muestra un overlay sutil de ✅
  Pago registrado, hace un *fade-out* suave de 1.5 segundos, y luego
  desaparece de la lista de \"Pendientes\".

**6. Semántica de Color**

La interfaz debe usar tonos pastel o mate, evitando colores
neón/agresivos que generen fatiga visual. Los colores definen la
gravedad del cargo en el indicador de la tarjeta:

- 🔴 Rojo (Vencido): Fecha límite expirada. Acción crítica requerida.

- 🟡 Amarillo (Parcial/Promesa): Deuda existente, pero con avance
  financiero (abono) o relacional (promesa pactada).

- 🟢 Verde (Liquidado): Saldo en cero. Uso limitado a feedback de éxito
  o historial.

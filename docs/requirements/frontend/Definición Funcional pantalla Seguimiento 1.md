**ESPECIFICACIÓN DE PANTALLA: \"Seguimiento\" (SIPRA V1)**

**1. Objetivo Principal y Filosofía**

- **Rol del sistema:** Es el \"Expediente Vivo\" y la memoria
  relacional-operativa del alumno.

- **Objetivo del usuario:** Entender en 3 segundos \"qué ha pasado con
  esta persona y cómo debo tratar este caso\" antes de realizar un cobro
  o enviar un mensaje.

- **Filosofía UX:** Relevancia sobre exhaustividad. Debe sentirse como
  la historia conversacional y financiera unificada, no como un archivo
  muerto o un panel de control escolar.

**2. Anatomía de la Interfaz (Top to Bottom)**

**A. Header Contextual (Ultra Compacto)**

Fijo en la parte superior. Diseñado para no robar espacio vertical.

- **Alineación Izquierda:** Botón ← (Regresar a pantalla anterior) +
  Nombre (Sofía Martínez).

- **Debajo del Nombre:** Grupo activo (Jazz Infantil). *Nota: Sin
  teléfonos, direcciones ni metadata excesiva.*

- **Alineación Derecha:** \* Icono 💬: Abre directamente WhatsApp con el
  contacto.

  - Icono ⋮ (Más): Despliega menú secundario (Editar datos básicos,
    Eliminar alumno).

**B. Snapshot (Resumen Rápido)**

Bloque de lectura inmediata para evitar que el usuario tenga que
\"escanear\" todo el timeline para saber cuánto se debe hoy.

- **KPI Principal:** 🔴 Pendiente: \$1,300 (Texto destacado).

- **Desglose Minimalista:** Lista corta de los conceptos que suman ese
  total (Ej. *Mensualidad mayo --- \$800*, *Vestuario --- \$500*).

- **Banner de Promesa (Condicional):** Si existe una promesa activa, se
  muestra una franja o texto destacado: 🤝 Promesa activa: {Día}.

- **Acción:** Botón \[ Compartir resumen \] (Genera texto plano
  optimizado para WhatsApp con el saldo y conceptos pendientes; NO se
  llama \"Estado de Cuenta\").

**C. Timeline Operativo (El Core)**

Lista con orden cronológico inverso (lo más reciente arriba). El diseño
exige **densidad contenida**: máxima información en el menor espacio
posible.

- **Tipos de Evento y Semántica Visual (El ícono carga la semántica, el
  color es tenue):**

  1.  **💰 Dinero (Verde/Rojo tenue):** Cargos generados, pagos totales
      y abonos.

  2.  **📩 Comunicación (Azul/Gris tenue):** Recordatorios enviados por
      el sistema o avisos grupales.

  3.  **🤝 Acuerdos (Amarillo/Naranja tenue):** Promesas de pago y
      pausas.

  4.  **📝 Contexto (Amarillo tenue):** Notas informales (\"Papá
      viajó\", \"Caso sensible\").

  5.  **📅 Operativo (Morado/Gris tenue):** Eventos relacionados
      (Ensayos, juegos). *Estrictamente eventos operativos, NO registros
      de asistencia.*

- **Manejo del \"Cargo Vivo\" (Minimalismo dinámico):** Los eventos
  financieros de origen (Ej. un cargo de Vestuario por \$1,500) que
  reciben abonos posteriores no deben mutar en widgets complejos.
  Simplemente añaden un pequeño *badge* de texto en su tarjeta histórica
  original: 🟡 Pendiente: \$1000.

- **Expansión de Mensajes:** Los eventos tipo 📩 Recordatorio muestran
  solo un *preview* de 1 línea (\"Hola Ana\...\"). Requieren un *Tap*
  para expandirse y leer el mensaje completo, protegiendo la legibilidad
  del timeline.

**D. Footer Persistente (Acciones Rápidas)**

Barra fija en la parte inferior de la pantalla para garantizar que la
\"intervención\" esté siempre a un toque de distancia,
independientemente del *scroll*.

- **Orden estricto de botones horizontales:** \[ 💵 Pago \] \[ 💬
  Recordar \] \[ 🤝 Promesa \] \[ 📝 Nota \]

**3. Comportamiento de Modales (Micro-UX)**

Todas las acciones del Footer Persistente deben abrir **Bottom Sheets**
(modales inferiores) ligeros, sin sacar al usuario de la pantalla de
Seguimiento.

1.  **💵 Pago:** Abre el mismo modal de \"Registro Rápido de Pago\"
    definido en la pantalla *Pendientes* (Monto prellenado, botón de
    liquidar completo, opción de abono parcial).

2.  **💬 Recordar:** Muestra un *preview* del mensaje sugerido a enviar.
    Botón: \[ Enviar WhatsApp \].

3.  **🤝 Promesa:** Pregunta: \"¿Para cuándo promete pagar?\". Input
    selector de fecha rápida (Hoy, Mañana, Viernes, Personalizado).

4.  **📝 Nota:** Input de texto libre de máximo 140 caracteres. Botón \[
    Guardar \].

**4. Reglas de Negocio y Arquitectura Backend (El Cerebro)**

El Timeline no es un simple *log* de base de datos; tiene reglas
estrictas para evitar el \"Feature Creep\":

**A. La Promesa como \"Interruptor\" (Crucial)**

Un evento de 🤝 Promesa no es solo visual. Cuando se registra, el
backend modifica el comportamiento del motor de automatización:

- **Regla:** Si Estado Relacional == Promesa_Activa, el sistema
  **detiene/pausa** la generación automática de 📩 Recordatorios para
  los cargos asociados hasta que la fecha de la promesa expire.
  Disminuye la urgencia visual en la UI.

**B. Hechos vs. Suposiciones**

El sistema registra **hechos operativos**, no inferencias conductuales.

- **Regla:** Se registra 📩 Recordatorio enviado con su timestamp
  exacto. El sistema NO debe intentar inferir ni etiquetar mensajes como
  \"Leído\" o \"Ignorado\".

**C. Filtro Antirruido (Relevancia)**

- **Regla de Inserción UI:** Solo se renderizan en el timeline eventos
  que un humano usaría para tomar una decisión. Los *logs* técnicos (ej.
  \"Sistema evaluó envío a las 3:00 AM y lo canceló\") se quedan en la
  base de datos para auditoría, pero **jamás** se envían al cliente
  (Frontend) para no ensuciar el Expediente Vivo.

**D. Multiusuario Oculto (Future-proofing)**

- **Regla de Auditoría:** Toda escritura (Crear pago, agregar nota,
  generar promesa) debe guardar silenciosamente en el backend el campo
  created_by: {user_id} o actor. En la V1, esta información **no se
  muestra en la Interfaz de Usuario (UI)** para mantener la pantalla
  limpia, pero la arquitectura ya queda preparada para cuando se lancen
  cuentas para múltiples profesores o cajeras.

**5. Flujo de Navegación Esperado (User Journey)**

1.  El usuario presiona una tarjeta de alumno en la pantalla
    **Pendientes**.

2.  Aterriza en **Seguimiento**. El Snapshot le dice inmediatamente
    \"Cuánto debe\".

3.  Hace un *scroll* rápido de 2 segundos en el Timeline y nota un 🤝
    (Promesa) de la semana pasada y un 📝 (Nota) indicando \"Problemas
    económicos\".

4.  Decide NO usar el botón 💬 Recordar y en su lugar usa 📝 Nota para
    registrar \"Le daremos 5 días más de gracia\".

5.  Toca la flecha ← y regresa a **Pendientes** con su pantalla
    actualizada.

**ESPECIFICACIÓN DE PANTALLA: \"Configuración\" (SIPRA V1)**

**1. Objetivo Principal y Filosofía**

- **Rol del sistema:** Definir la identidad de la academia y las reglas
  del \"Asistente\" para automatizar el ciclo de cobranza con criterio
  humano.

- **Filosofía UX:** **\"Configurar para soltar\"**. El sistema debe
  traducir lenguaje natural (ej. \"¿Cuándo suelen pagar?\") en lógica de
  estados (Pendiente vs. Vencido). Es un software **opinionado** que
  llega con una receta de éxito predefinida.

- **No-Goals:** NO es un panel de vinculación técnica (no QR/Linked
  Device), NO es un gestor de facturación fiscal y NO es un centro de
  marketing.

**2. Anatomía de la Interfaz (Estructura de Scroll Único)**

**A. Mi Academia (Identidad)**

Datos básicos para personalizar la comunicación.

- **Nombre de la Academia:** (Input texto).

- **Nombre del Responsable:** (Input texto) Usado para la firma
  automática de mensajes.

- **Número para recordatorios:** (Input tel) El número de WhatsApp del
  administrador. *Nota: Aclarar en la UI que SIPRA usará este número
  para abrir la app de WhatsApp nativa, no para sincronizar sesiones.*

**B. El Asistente (Cerebro de Automatización)**

Define el nivel de autonomía y las reglas del calendario.

- **Nivel de Automatización (Radio Select):**

  1.  Asistido (Recomendado): Todo se valida en la pantalla de
      \"Envíos\".

  2.  Semi-automático: Aprobación por bloques/lotes.

  3.  Automático (Próximamente): Estado deshabilitado o con badge \"Beta
      cerrada\".

- **Ventana de Cobro:** *\"¿Qué días suelen pagar tus alumnos?\"*
  (Selector de rango, ej. del 1 al 10).

**C. Mensajería (Tono y Estilo)**

- **Editor de Plantilla:** Campo de texto único para el recordatorio
  estándar.

- **Variables Soportadas (Chips insertables):** {nombre}, {monto},
  {concepto}, {fecha}.

- **Preview Dinámico:** Una burbuja de chat tipo WhatsApp debajo del
  editor que muestra el mensaje final con datos de ejemplo en tiempo
  real.

**D. Gestión de Datos y Soporte**

- **\[ 📥 Exportar movimientos \]**: Botón que genera un archivo **CSV**
  universal.

- **\[ 💬 Contactar Soporte \]**: Enlace directo al WhatsApp del
  desarrollador.

- **\[ 🚪 Cerrar Sesión \]**: Acción de salida segura.

- *Nota: NO existe botón de \"Eliminar cuenta\" en esta versión.*

**3. Lógica de Negocio y Reglas para el Backend**

**A. Interpretación de la \"Ventana de Cobro\"**

El sistema debe traducir el rango elegido (ej. 1 al 10) en
comportamientos automáticos:

- **Día 1:** Se activan las sugerencias de cobro en la pantalla de
  \"Pendientes\".

- **Día 5 (Mitad de ventana):** Se eleva la prioridad de la sugerencia
  en el Asistente.

- **Día 11 (Post-ventana):** El estado del cargo cambia automáticamente
  a 🔴 Vencido.

**B. Inteligencia Silenciosa (Default ON)**

- **Pausa por Promesa:** Esta lógica está siempre activa. Si un alumno
  tiene una Promesa de Pago vigente en su expediente, el asistente
  **suprime** automáticamente cualquier sugerencia de recordatorio para
  evitar fricción social.

**C. Validación Suave de Templates**

- **Regla:** Si el usuario intenta guardar un mensaje sin la variable
  {monto} o {fecha}, el sistema muestra un aviso: ⚠️ Tu mensaje no
  incluye el monto. ¿Deseas continuar?. **No bloquea el guardado**,
  prioriza la libertad del usuario.

**D. Formato de Exportación (CSV)**

El archivo generado debe incluir las siguientes columnas: ID_Alumno \|
Nombre \| Grupo \| Concepto \| Monto_Original \| Saldo_Pendiente \|
Estado \| Último_Movimiento

**4. Micro-UX y Persistencia**

- **Auto-save Silencioso:** No hay botón de \"Guardar\". Los cambios se
  persisten automáticamente cuando el input pierde el foco (onBlur) o
  tras 2 segundos de inactividad.

- **Feedback de Guardado:** Un indicador visual discreto (ej. un pequeño
  check ✅ Guardado) aparece en la esquina superior derecha
  momentáneamente tras cada cambio exitoso.

- **Navegación:** Esta pantalla se abre como un modal o vista secundaria
  desde el Avatar/Engrane. La salida es vía el botón ← en el header,
  regresando siempre a la pantalla de origen.

**Resumen de la \"Trinidad de Estados\" SIPRA V1**

Para el analista, esta pantalla configura los tres estados que rigen
toda la app:

1.  **Pendiente (Amarillo):** Dentro de la ventana de cobro.

2.  **Vencido (Rojo):** Fuera de la ventana de cobro.

3.  **Promesa (Naranja):** Pausa operativa de recordatorios.

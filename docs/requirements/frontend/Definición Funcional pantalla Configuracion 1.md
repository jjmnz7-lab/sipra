**Definición Funcional Completa --- Pantalla "Configuración"**

**Sistema: SIPRA**

**Versión objetivo: V1**

**Estado: definición consolidada previa a wireframe visual detallado**

**1. Propósito de la Pantalla**

La pantalla "Configuración" existe para ajustar el comportamiento básico
de SIPRA sin volverlo complejo.

NO es:

- un panel administrativo pesado,

- un módulo técnico,

- un centro de parámetros infinitos,

- ni una consola empresarial.

Su objetivo es:

**permitir que el usuario defina cómo quiere que SIPRA le ayude a
cobrar, recordar y comunicarse.**

Debe responder:

**"¿Cómo quiero que SIPRA actúe conmigo y con mi academia?"**

**2. Filosofía de Producto**

La filosofía de esta pantalla es:

**"Configurar para soltar".**

El usuario define pocas cosas importantes una sola vez, y después SIPRA
opera con ese marco.

La pantalla debe sentirse:

- simple,

- clara,

- humana,

- segura,

- de baja frecuencia de uso,

- pero de alto impacto en el comportamiento del sistema.

**3. Filosofía UX**

La pantalla debe transmitir:

- control,

- tranquilidad,

- confianza,

- comprensión.

NO debe transmitir:

- complejidad técnica,

- burocracia,

- sensación de "si toco algo rompo todo",

- ni interfaz tipo ERP.

**4. Navegación y Acceso**

**Acceso**

La pantalla se abre desde el icono de engrane/avatar en la parte
superior derecha de las pantallas principales, especialmente:

- Pendientes

- Grupos

**Salida**

Debe existir un botón de regreso o regreso implícito que lleve al
usuario a la pantalla de origen.

**5. Estructura General de la Pantalla**

La pantalla se divide en estas secciones:

1.  Mi Academia

2.  Cobranza

3.  Automatización

4.  Mensajes

5.  Respaldo

6.  Soporte

7.  Sesión

**6. Sección: Mi Academia**

**Objetivo**

Identidad básica y contexto operativo de la academia.

**Componentes**

**Nombre de la academia**

Ejemplo:\
"Escuela de Futbol Mazatlán"

Propósito:

- identificar visualmente la cuenta,

- personalizar encabezados y resúmenes,

- contextualizar mensajes.

**Número para recordatorios**

Número telefónico principal desde donde operará la academia o donde el
usuario desea recibir/gestionar mensajes.

Propósito:

- contacto operativo,

- referencia para WhatsApp,

- base para comunicación.

**Moneda**

Ejemplo:\
MXN \$

Propósito:

- mostrar montos de forma consistente,

- preparar flexibilidad para futuras variaciones.

**7. Sección: Cobranza**

**Objetivo**

Definir reglas simples sobre cuándo SIPRA debe comenzar a considerar un
cargo como pendiente, vencido o listo para insistencia.

**Componentes**

**Ventana de cobranza**

Ejemplo:\
"Del día 1 al 10"

Propósito:

- indicar el periodo normal de cobro,

- activar intensificación de recordatorios,

- modificar estados visuales en Pendientes.

**Día o límite de vencimiento**

Si se maneja separado de la ventana, debe ser muy claro y humano.

Propósito:

- definir cuándo algo deja de ser "normal" y pasa a urgencia.

**Conceptos frecuentes**

Lista editable de etiquetas rápidas para crear cargos sin escribir todo
desde cero.

Ejemplos:

- Mensualidad

- Uniforme

- Torneo

- Inscripción

- Vestuario

Propósito:

- agilizar captura,

- evitar errores de escritura,

- estandarizar cargos recurrentes.

**Reglas de comportamiento**

- Los conceptos frecuentes se usan en nuevos cargos.

- Editarlos NO debe alterar el historial de cargos ya creados.

- La ventana de cobro influye en el estado visual de Pendientes y en la
  lógica de sugerencias.

**8. Sección: Automatización**

**Objetivo**

Definir el nivel de intervención humana que SIPRA debe mantener antes de
enviar recordatorios o mensajes.

**Filosofía**

La automatización debe ser gradual y confiable.

**Niveles oficiales V1**

**Asistido**

Default recomendado.

El sistema:

- prepara mensajes,

- sugiere acciones,

- pero el usuario revisa y aprueba.

**Semi automático**

El sistema agrupa sugerencias o lotes y pide una confirmación más
amplia.

**Automático**

El sistema ejecuta envíos bajo reglas definidas.

En V1 puede existir como opción visible, pero debe manejarse con mucho
cuidado y lenguaje prudente.

**Reglas de comportamiento**

- El modo seleccionado afecta directamente la pantalla Envíos.

- El modo Asistido debe ser el predeterminado.

- Si hay una promesa activa, el sistema debe reducir o pausar
  sugerencias automáticas según la lógica definida.

- La automatización debe sentirse como ayuda, no como pérdida de
  control.

**9. Sección: Mensajes**

**Objetivo**

Definir el tono, estructura y plantilla base de los mensajes que SIPRA
usará para recordatorios.

**Componentes**

**Plantilla base de recordatorio**

Un solo editor simple de texto con variables permitidas.

Ejemplo:\
"Hola {nombre}, te recordamos que tu pago de {concepto} por {monto}
vence el {fecha}."

**Variables soportadas**

Las variables mínimas recomendadas son:

- {nombre}

- {monto}

- {concepto}

- {fecha}

Si se desea, posteriormente puede expandirse, pero en V1 conviene
limitar la complejidad.

**Firma**

Campo corto opcional para agregar una firma amable al final del mensaje.

Ejemplo:\
"Profe Juan 🙌"

Propósito:

- humanizar el mensaje,

- reforzar identidad,

- evitar tono robótico.

**Reglas de validación**

- El sistema debe impedir guardar una plantilla rota o vacía.

- Si una variable crítica no aparece, el sistema puede advertir, pero no
  debe volver la experiencia agresiva.

- La edición debe ser simple.

**Preview en tiempo real**

Mientras el usuario escribe, debe ver un ejemplo real del mensaje con
datos de muestra.

Propósito:

- entender cómo quedará el texto,

- evitar errores,

- ganar confianza.

**10. Sección: Respaldo**

**Objetivo**

Dar salida y tranquilidad al usuario.

**Funcionalidades**

**Exportar movimientos / datos**

Genera un archivo CSV compatible con Excel y Google Sheets.

Contenido mínimo recomendado:

- Alumno

- Grupo

- Concepto

- Monto

- Estado

- Fecha

Opcional:

- Tipo de cargo

- Estado relacional

- Notas breves

**Comportamiento**

- El archivo se genera y el sistema abre la hoja de compartir del
  dispositivo/navegador.

- Debe ser un proceso simple, no un asistente complejo.

- El exportado debe ser legible y útil para revisión o respaldo.

**Principio**

La exportación es una válvula de confianza.

El usuario debe sentir:

**"mis datos son míos".**

**11. Sección: Soporte**

**Objetivo**

Reducir ansiedad tecnológica y facilitar ayuda humana.

**Componentes**

**Contactar soporte**

Preferentemente mediante WhatsApp o canal directo definido por ti.

Propósito:

- resolver dudas,

- dar acompañamiento,

- evitar abandono.

**Ayuda rápida**

Opcionalmente puede incluir accesos a:

- cómo usar recordatorios,

- cómo crear cargos,

- cómo exportar datos,

- preguntas frecuentes.

**12. Sección: Sesión**

**Objetivo**

Permitir salida segura de la cuenta.

**Funcionalidad**

**Cerrar sesión**

Acción permitida en V1.

Propósito:

- cerrar la sesión local de forma segura,

- evitar que otro usuario use la cuenta si toma el dispositivo.

**No incluir en V1**

**Eliminar cuenta**

No debe estar visible para el usuario en V1.

Motivo:

- acción irreversible,

- riesgo de error por curiosidad,

- riesgo operativo y de soporte,

- puede generar pérdida o conflicto innecesario.

**13. Navegación Interna y Prioridad Visual**

**Orden recomendado de secciones**

1.  Mi Academia

2.  Cobranza

3.  Automatización

4.  Mensajes

5.  Respaldo

6.  Soporte

7.  Sesión

**Jerarquía funcional**

La parte más importante de Configuración es:

1.  Automatización

2.  Cobranza

3.  Mensajes

Porque eso es lo que más afecta:

- Pendientes

- Envíos

- Seguimiento

**14. Comportamiento Persistente / Propagación de Cambios**

**A. Automatización**

Cualquier cambio en el nivel de automatización debe afectar
inmediatamente el comportamiento de Envíos.

**B. Conceptos frecuentes**

Cambiar un concepto frecuente debe afectar:

- selectores futuros de creación de cargos,

- no el histórico ya creado.

**C. Plantillas**

Cambiar una plantilla debe afectar:

- mensajes nuevos,

- no mensajes ya enviados.

**D. Ventana de cobranza**

Cambiarla debe modificar:

- cómo se priorizan pendientes,

- cuándo se sugieren recordatorios,

- cuándo un cargo se marca como urgencia visual.

**15. Micro-UX y Usabilidad**

**Guardado**

En lugar de un botón de "guardar" muy pesado, la experiencia ideal es:

- autosave silencioso,

- confirmación visual breve,

- o un botón de guardado solo si realmente se necesita.

La pantalla no debe sentirse como un formulario de gestión complejo.

**Lenguaje**

Debe ser humano y claro.

Ejemplos buenos:

- "¿Cuándo suelen pagar tus alumnos?"

- "Revisar antes de enviar"

- "Exportar movimientos"

Ejemplos malos:

- triggers

- workflows

- scheduler

- batch

- pipeline

**Baja frecuencia, alto impacto**

La pantalla puede ser poco visitada, pero cuando se usa, cambia el
comportamiento del sistema.

Por eso debe ser muy fácil de entender.

**16. Modelo de Datos Mínimo Requerido**

La pantalla Configuración debe persistir al menos estos campos:

**Identidad**

- nombre_academia

- numero_contacto

- moneda

**Cobranza**

- ventana_cobro_inicio

- ventana_cobro_fin

- conceptos_frecuentes\[\]

**Automatización**

- nivel_automatizacion

**Mensajes**

- template_recordatorio

- firma_mensaje

**Preferencias operativas**

- pausa_por_promesa = true/false

- confirmar_antes_de_enviar = true/false si aplica en el modo asistido

**Sesión**

- estado_sesion_local

**17. Reglas de Validación**

- No permitir guardar plantillas vacías.

- No permitir ventanas de cobranza inválidas.

- No permitir conceptos frecuentes duplicados de forma confusa.

- No mostrar opciones destructivas irreversibles en V1.

- No permitir configuraciones que rompan la lógica básica del sistema.

**18. Lo que NO Debe Existir en Configuración**

❌ linked device / conexión WhatsApp por QR en V1\
❌ eliminar cuenta\
❌ webhooks\
❌ APIs visibles al usuario\
❌ automatización avanzada tipo empresa\
❌ reglas complejas por horario/día/minuto\
❌ permisos multirol complejos\
❌ facturación SAT\
❌ logs técnicos\
❌ dashboards de métricas\
❌ configuración de campañas\
❌ personalización excesiva

**19. Relación con Otras Pantallas**

**Pendientes**

Usa:

- ventana de cobranza,

- conceptos frecuentes,

- nivel de automatización,

- firma/tono.

**Envíos**

Usa:

- nivel de automatización,

- plantilla base,

- firma,

- estado de promesas.

**Grupos**

Usa:

- conceptos frecuentes,

- reglas de cargo grupal.

**20. Flujo Esperado del Usuario**

El usuario entra a Configuración solo cuando quiere:

- ajustar identidad,

- cambiar reglas de cobranza,

- modificar mensaje base,

- exportar datos,

- o contactar soporte.

Idealmente, después de configurarla bien:

**casi no necesita volver.**

**21. Filosofía Final de la Pantalla**

Configuración debe sentirse como:

**ajustar el comportamiento de un asistente confiable.**

NO:

**administrar una plataforma tecnológica compleja.**

Si Configuración está bien hecha, SIPRA se siente simple.\
Si Configuración se vuelve pesada, SIPRA se vuelve ERP.

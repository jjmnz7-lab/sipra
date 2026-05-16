**Definición Funcional Completa --- Pantalla "Pendientes"**

**Sistema: SIPRA**

**Versión objetivo: V1**

**Estado: Definición consolidada previa a wireframe visual detallado**

**1. Propósito de la Pantalla**

La pantalla "Pendientes" es el núcleo operativo principal de SIPRA.

NO es:

- un dashboard financiero,

- una tabla administrativa,

- ni un reporte tradicional.

Su objetivo es:

**permitir que el usuario identifique rápidamente quién debe, cuál es el
contexto y qué acción debe tomar.**

La pantalla debe minimizar:

- carga mental,

- navegación innecesaria,

- y tiempo operativo.

**2. Filosofía UX**

La pantalla debe sentirse:

- rápida,

- ligera,

- accionable,

- móvil,

- operativa.

Debe parecer más:

- una bandeja operativa tipo inbox/Trello/WhatsApp

y menos:

- un ERP,

- una hoja Excel,

- o una consola administrativa.

**3. Contexto Real de Uso**

El usuario objetivo:

- utiliza principalmente celular,

- puede estar en cancha, salón o recepción,

- tiene poco tiempo,

- no necesariamente es tecnológico,

- y alterna constantemente entre cobranza y operación diaria.

La interfaz debe optimizar:

- rapidez visual,

- accesibilidad,

- y acciones de pocos toques.

**4. Objetivo Psicológico**

La pantalla debe transmitir:

- control,

- claridad,

- progreso,

- tranquilidad operativa.

NO debe transmitir:

- caos,

- presión excesiva,

- saturación,

- estrés visual.

**5. Navegación**

"Pendientes" es la pantalla inicial/home principal del sistema.

Desde aquí:

- el usuario opera la mayor parte del flujo diario.

**6. Estructura General de la Pantalla**

La pantalla se divide en:

1.  Header superior

2.  KPIs rápidos ("Termómetro")

3.  Bloque de sugerencias operativas ("Asistente")

4.  Filtros rápidos

5.  Lista principal de pendientes

6.  FAB (Floating Action Button)

**7. Header Superior**

**Objetivo**

Mostrar contexto y accesos secundarios sin consumir espacio excesivo.

**Elementos**

**Izquierda**

Texto:

**"Pendientes"**

**Derecha**

**Icono búsqueda**

Acción:

- búsqueda rápida de persona/alumno.

**Icono avatar/configuración**

Abre menú secundario:

- configuración,

- automatización,

- templates,

- cuenta.

**8. KPIs Rápidos ("Termómetro")**

**Objetivo**

Mostrar estado operativo inmediato sin usar gráficas complejas.

**Características**

- compactos,

- visibles,

- accionables,

- no financieros complejos.

**KPIs definidos**

**🔴 Pendientes**

Cantidad de pendientes activos.

Ejemplo:\
"12 pendientes"

IMPORTANTE:\
Priorizar cantidad sobre monto total.

**🟢 Cobrado hoy**

Monto registrado hoy.

Ejemplo:\
"\$1,500 hoy"

Objetivo psicológico:\
sensación de avance/logro.

**⚠️ Vencidos**

Cantidad de pendientes vencidos críticos.

Ejemplo:\
"4 vencidos"

**Consideraciones UX**

- NO usar gráficos.

- NO usar dashboards complejos.

- Mantener altura mínima.

**9. Bloque de Sugerencias Operativas ("Asistente")**

**Objetivo**

Presentar acciones sugeridas automáticamente por el sistema.

**Características**

- condicional,

- contextual,

- no intrusivo.

**Comportamiento**

Si no existen sugerencias:

**NO mostrar el bloque.**

**Ejemplos**

- "3 recordatorios listos"

- "2 promesas vencen hoy"

**Acción principal**

Botón:

**"Revisar"**

Abre:

- Outbox / vista de recordatorios pendientes.

**Objetivo psicológico**

Debe sentirse como:

**"el sistema me ayuda"**

NO:

- notificación invasiva,

- alerta agresiva.

**10. Filtros Rápidos**

**Objetivo**

Reducir la lista rápidamente sin abrir modales complejos.

**UI**

Formato:

- chips horizontales deslizable.

**Filtros soportados**

**Estado financiero**

- Todos

- Pendientes

- Parciales

- Vencidos

**Grupo**

Ejemplos:

- Categoría 2015

- Ballet

- Jazz

**Estado relacional**

- Promesas

- Pausados

**Comportamiento**

Al aplicar filtro:

- lista principal se actualiza inmediatamente,

- KPIs superiores se recalculan según el filtro.

**Consideraciones UX**

- mostrar pocos chips visibles,

- evitar saturación horizontal,

- filtros secundarios pueden ir en "Más filtros".

**11. Lista Principal de Pendientes**

**(Core real de la pantalla)**

**Objetivo**

Permitir:

- identificar rápidamente quién debe,

- entender contexto mínimo,

- ejecutar acción inmediata.

**Formato de tarjeta**

**Altura**

Compacta.

Máximo:

**3 líneas visibles.**

**Contenido**

**Línea 1**

Nombre persona/alumno.

Ejemplo:\
"Sofía Martínez"

**Línea 2**

Concepto + saldo.

Ejemplo:\
"Mensualidad mayo · \$800"

**Línea 3 (contextual/opcional)**

Estado relacional o contexto operativo.

Ejemplos:

- "Prometió pagar hoy"

- "Pago parcial registrado"

- "Caso sensible"

**Información explícitamente NO visible aquí**

NO mostrar:

- direcciones,

- fechas nacimiento,

- historiales largos,

- demasiados badges,

- metadata excesiva.

**12. Estados Visuales**

**Objetivo**

Permitir lectura instantánea de prioridad.

**Método visual**

Usar:

- borde lateral,

- punto indicador,

- o acento de color suave.

**Estados**

**🔴 Rojo suave**

Pendiente vencido/crítico.

**🟡 Amarillo**

Parcial o promesa.

**🟢 Verde**

Liquidado.

Generalmente desaparece después de actualizar lista.

**Consideraciones**

Evitar:

- colores neón,

- saturación agresiva,

- sensación constante de alarma.

Usar tonos suaves/mate.

**13. Interacciones Principales**

**Tap sobre tarjeta**

**Acción**

Abrir pantalla:

**Seguimiento**

**Motivo**

La tarjeta completa funciona como acceso contextual.

NO existe botón explícito "Ver".

**Icono 💬 (WhatsApp / Cobro)**

**Acción principal visible**

**Comportamiento**

Depende del modo automatización:

**Asistido**

Abre preview/mensaje sugerido.

**Semi automático**

Permite confirmar rápidamente.

**Automático**

Puede ejecutar flujo automático según reglas.

**Icono 💵 (Registrar pago)**

**Acción**

Abrir Bottom Sheet de pago rápido.

**14. Bottom Sheet --- Registro de Pago**

**Objetivo**

Registrar pagos en pocos toques sin abandonar contexto.

**UI**

Bottom Sheet/modal inferior.

NO pantalla completa.

**Componentes**

**Campo monto**

Prellenado automáticamente con saldo total.

Ejemplo:\
"\$800"

**Acción principal**

Botón grande:

**"Confirmar pago completo"**

**Acción secundaria**

Texto/botón:

**"Registrar solo una parte"**

**Flujo esperado**

Idealmente:

**máximo 2 taps.**

**Consideraciones**

NO solicitar:

- demasiados campos,

- comprobantes,

- formularios largos.

**15. Gestos (Swipes)**

**Objetivo**

Acelerar flujo para usuarios avanzados.

**IMPORTANTE**

Los swipes:

**NO son obligatorios.**

Toda funcionalidad principal debe poder usarse con botones visibles.

**Swipe derecha**

Shortcut:

- cobrar / enviar recordatorio.

**Swipe izquierda**

Shortcut:

- más acciones,

- promesa,

- pausa,

- nota.

**Consideraciones**

Muchos usuarios no tecnológicos pueden no descubrir los gestos.

Por eso:

- son aceleradores opcionales,

- NO mecánica principal.

**16. FAB (Floating Action Button)**

**Objetivo**

Acceso global rápido a acciones frecuentes.

**Posición**

Inferior derecha.

**Acciones iniciales V1**

- Registrar pago

- Crear cargo

- Crear aviso/evento operativo

**Consideraciones**

NO saturar con demasiadas opciones.

**17. Estado Vacío**

**Objetivo psicológico**

Generar sensación de logro/control.

**UI**

Ejemplo:

✅ Todo al corriente hoy

📅 Próximo cargo: viernes

**Importante**

NO usar:

- mensajes técnicos,

- "sin registros",

- tablas vacías.

**18. Relación con Automatización**

La pantalla "Pendientes" es la principal entrada al sistema de
automatización gradual.

**Modos soportados**

**Asistido (default)**

Sistema sugiere → usuario confirma.

**Semi automático**

Sistema agrupa/programa.

**Automático**

Sistema envía bajo reglas definidas.

**Importante**

La automatización debe sentirse:

**confiable y humana.**

NO:

- agresiva,

- fría,

- impredecible.

**19. Rendimiento UX Esperado**

La pantalla debe:

- cargar rápido,

- permitir operación con una mano,

- minimizar scroll innecesario,

- minimizar navegación profunda.

**20. Principios Fundamentales de Diseño**

**Priorizar:**

- acción,

- claridad,

- rapidez,

- contexto mínimo.

**Evitar:**

- densidad excesiva,

- ruido visual,

- sobreautomatización,

- exceso de colores,

- exceso de datos.

**21. Qué NO Debe Estar en "Pendientes"**

❌ dashboards complejos\
❌ gráficas\
❌ timeline completo\
❌ configuración\
❌ historial extenso\
❌ tablas administrativas\
❌ formularios largos\
❌ calendarios completos\
❌ analytics avanzados\
❌ exceso de badges/estados

**22. Flujo Operativo Principal Esperado**

Usuario entra:\
↓\
ve quién falta\
↓\
cobra o registra pago\
↓\
estado cambia\
↓\
continúa con siguiente pendiente

**23. Filosofía Final de la Pantalla**

"Pendientes" debe sentirse como:

**una bandeja ligera de resolución rápida.**

NO:

**un sistema administrativo complejo.**

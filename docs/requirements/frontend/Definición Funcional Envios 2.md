**Definición Funcional Completa --- Pantalla "Envíos"**

**Sistema: SIPRA**

**Versión objetivo: V1**

**Estado: Definición consolidada previa a wireframe visual detallado**

**1. Propósito de la Pantalla**

La pantalla "Envíos" es la bandeja ligera de revisión y validación de
automatizaciones del sistema.

NO es:

- un CRM,

- un gestor de campañas,

- un inbox tipo correo,

- un panel de marketing,

- ni una plataforma de automatización compleja.

Su objetivo es:

**permitir que el usuario valide rápidamente los recordatorios y
mensajes sugeridos por SIPRA antes de enviarlos.**

Debe responder:

**"¿Qué mensajes están listos y todo está correcto para enviarlos?"**

**2. Filosofía Estratégica**

La pantalla existe para habilitar:

**Automatización Gradual.**

Es el puente entre:

- automatización,

- confianza humana,

- y control operativo.

**Principio oficial**

La automatización:

**ayuda.**

NO reemplaza criterio humano.

**Filosofía UX oficial**

**"Validación rápida, no administración".**

La pantalla debe permitir:

**revisar y despachar muchos mensajes en pocos segundos.**

**3. Objetivo Psicológico**

La pantalla debe reducir:

- ansiedad,

- miedo al error social,

- desconfianza hacia automatización.

Debe transmitir:

- tranquilidad,

- control,

- confianza,

- supervisión ligera.

**4. Contexto Real de Uso**

El usuario normalmente llegará aquí:

- desde Pendientes,

- desde banners del Asistente,

- desde grupos,

- después de generar recordatorios automáticos.

NO es navegación principal persistente.

Es:

**una pantalla contextual y secundaria.**

**5. Navegación y Acceso**

**Trigger principal**

Desde Pendientes:

✨ "3 recordatorios listos"

↓

Botón:

**\[ Revisar \]**

↓

Abrir "Envíos".

**Trigger secundario**

Desde Grupos:

- revisar sugerencias grupales,

- revisar avisos listos.

**6. Estructura General**

La pantalla se divide en:

1.  Header

2.  Estado automatización

3.  Lista "Listos para enviar"

4.  Alertas suaves

5.  Historial reciente

**7. Header**

**Objetivo**

Ubicar rápidamente al usuario y transmitir estado general.

**Componentes**

**Título**

**"Envíos"**

**Estado automatización**

Ejemplos:\
🟢 Revisión asistida activa

o:\
🟡 3 mensajes requieren revisión

**Consideraciones UX**

El estado debe sentirse:

- humano,

- claro,

- tranquilo.

**NO usar lenguaje técnico**

❌ queues\
❌ workflows\
❌ schedulers\
❌ batch processing

**8. Lista "Listos para Enviar"**

**(Core real de la pantalla)**

**Objetivo**

Permitir:

- revisar,

- editar,

- aprobar,

- descartar

mensajes sugeridos automáticamente.

**Filosofía UX**

El usuario NO debe redactar mensajes desde cero.

El sistema ya preparó el trabajo.

El usuario solo:

**valida rápidamente.**

**Formato recomendado**

Tarjetas compactas y ligeras.

**Contenido requerido**

**Destinatario**

Ejemplo:\
"Sofía Martínez"

**Contexto financiero/operativo**

Ejemplo:\
"Mensualidad mayo · \$800"

**Preview mensaje**

Máximo:\
1 línea visible inicialmente.

Ejemplo:\
"Hola Ana, te recordamos..."

**Acciones visibles**

**\[ Editar \]**

Permite personalizar mensaje antes de enviar.

**\[ Enviar \]**

Ejecuta envío individual.

**Acciones secundarias**

**"Ahora no"**

o:

**"Descartar"**

Permite omitir sugerencia.

**IMPORTANTE**

NO usar:

- "Omitir",

- "Ignorar",

- lenguaje técnico frío.

**9. Edición Humana**

**Objetivo**

Mantener sensación de control y cercanía humana.

**Filosofía**

Aunque muchos usuarios no editen mensajes:

**el simple hecho de poder hacerlo genera confianza.**

**UX recomendada**

Tap:\
\[ Editar \]

↓

Bottom Sheet o modal ligero.

**Características**

- edición rápida,

- texto simple,

- sin editores complejos.

**IMPORTANTE**

NO convertir esto en:

- constructor de campañas,

- editor enriquecido,

- diseñador mensajes.

**10. Envío Masivo Ligero**

**Filosofía**

El usuario puede aprobar múltiples mensajes rápidamente.

**IMPORTANTE**

En V1:\
NO priorizar automatización ciega agresiva.

**CTA recomendado**

**\[ Revisar y enviar \]**

o:

**\[ Enviar seleccionados \]**

**Evitar inicialmente**

❌ "Enviar todos" extremadamente dominante.

Porque:\
usuarios nuevos aún construyen confianza.

**11. Agrupación Ligera (Opcional V1 / recomendable)**

**Objetivo**

Reducir sensación de saturación cuando existen muchos mensajes.

**Ejemplo**

📂 Mensualidad mayo\
5 mensajes listos

↓

expandir:

- Sofía

- Carlos

- Mariana

**IMPORTANTE**

Mantener agrupación:

- ligera,

- simple,

- no tipo campañas.

**12. Alertas Suaves**

**Objetivo**

Prevenir errores sociales sin bloquear flujo.

**Filosofía**

Las alertas:

**ayudan.**

NO castigan.

**UI recomendada**

Banners amarillos suaves.

**Ejemplos**

⚠️ Pago registrado recientemente

⚠️ Promesa activa detectada

⚠️ Este contacto ya recibió recordatorio hoy

⚠️ Número sin WhatsApp

**IMPORTANTE**

Las alertas:

- NO deben bloquear,

- NO deben sentirse como errores críticos.

Solo:

- advertir,

- contextualizar,

- proteger confianza.

**13. Historial Reciente**

**Objetivo**

Dar tranquilidad y confirmación rápida.

**Filosofía**

El usuario necesita saber:

**"Sí se mandó".**

**Formato recomendado**

Ultra compacto.

**Ejemplos**

✅ Recordatorio enviado · Hace 1h

✅ Aviso grupal enviado · Hoy 4:32pm

**IMPORTANTE**

El historial aquí:

**NO reemplaza Seguimiento.**

**Diferencia oficial**

**Envíos**

→ confirmación rápida reciente.

**Seguimiento**

→ memoria completa/contextual.

**14. Relación con Seguimiento**

Cada envío ejecutado debe:

**registrar automáticamente un evento en el Timeline ("Seguimiento")
correspondiente.**

**Ejemplo Timeline generado**

📩 Recordatorio enviado\
"Hola Ana..."

**IMPORTANTE**

Toda comunicación relevante:

**debe dejar trazabilidad contextual.**

**15. Modos de Automatización**

La pantalla soporta:

**Asistido (default V1)**

Todo requiere validación humana.

**Semi automático**

Sugerencias agrupadas/lotes ligeros.

**Automático**

Supervisión e historial.

**IMPORTANTE**

El sistema debe:

**escalar confianza gradualmente.**

**16. Estados de Éxito**

**Objetivo**

Generar sensación de avance y tranquilidad.

**Ejemplo recomendado**

✅ 5 mensajes enviados

↓

Actualizar Pendientes automáticamente.

↓

Opcional:\
regresar automáticamente a Pendientes.

**IMPORTANTE**

Evitar:

- gamificación,

- celebraciones exageradas,

- confetti,

- efectos invasivos.

**17. Microinteracciones**

**Recomendaciones**

- swipe opcional para descartar,

- expandir preview mediante tap,

- acciones rápidas sin navegación pesada.

**IMPORTANTE**

Toda interacción debe:

- reducir fricción,

- mantener velocidad,

- y minimizar carga cognitiva.

**18. Qué NO Debe Existir en "Envíos"**

❌ campañas marketing\
❌ newsletters\
❌ funnels\
❌ analytics avanzados\
❌ inbox tipo email\
❌ conversaciones completas\
❌ CRM ventas\
❌ segmentación compleja\
❌ diseñador campañas\
❌ métricas comerciales

**19. Relación con Otras Pantallas**

**Pendientes**

Genera necesidad de comunicación.

**Envíos**

Valida y ejecuta comunicación sugerida.

**Seguimiento**

Registra contexto e historial de comunicación.

**Grupos**

Puede generar sugerencias grupales.

**20. Flujo Esperado**

Pendientes\
↓\
Sistema detecta recordatorios listos\
↓\
Usuario entra a Envíos\
↓\
Revisa rápidamente\
↓\
Edita opcionalmente\
↓\
Envía\
↓\
Timeline se actualiza\
↓\
Pendientes se refresca

**21. Filosofía Final de la Pantalla**

"Envíos" debe sentirse como:

**una bandeja ligera donde el usuario confirma rápidamente que SIPRA
está ayudando correctamente.**

NO:

**un sistema complejo de automatización o campañas.**

**Definición Funcional Completa --- Pantalla "Seguimiento"**

**Sistema: SIPRA**

**Versión objetivo: V1**

**Estado: Definición consolidada previa a wireframe visual detallado**

**1. Propósito de la Pantalla**

La pantalla "Seguimiento" es la memoria operativa y relacional del
sistema.

NO es:

- expediente académico,

- ficha administrativa tradicional,

- CRM empresarial,

- historial contable complejo.

Su objetivo es:

**centralizar el contexto financiero, operativo y humano de una persona
para ayudar al usuario a tomar decisiones correctas de cobranza y
seguimiento.**

Debe responder:

**"¿Qué ha pasado con esta persona y cómo debo manejar este caso?"**

**2. Filosofía UX**

La pantalla debe sentirse:

- contextual,

- humana,

- cronológica,

- ligera,

- operativa.

Debe parecer:

**una línea de tiempo viva y útil.**

NO:

- un archivo muerto,

- una tabla administrativa,

- ni un feed caótico.

**3. Contexto Real de Uso**

El usuario normalmente llegará a "Seguimiento":

- desde Pendientes,

- después de una conversación,

- cuando tenga dudas,

- antes de cobrar,

- o cuando necesite recordar contexto.

Es una pantalla:

**contextual, no principal.**

**4. Objetivo Psicológico**

La pantalla debe transmitir:

- claridad,

- continuidad,

- memoria,

- profesionalismo,

- empatía,

- control.

Debe ayudar al usuario a sentir:

**"ya recuerdo qué pasó aquí".**

**5. Función Principal**

Centralizar:

- cargos,

- pagos,

- mensajes,

- acuerdos,

- notas,

- y contexto operativo

en una sola vista cronológica.

**6. Estructura General**

La pantalla se divide en:

1.  Header contextual

2.  Snapshot / resumen rápido

3.  Acciones rápidas

4.  Timeline operativo

5.  Bottom sheets/contextual actions

**7. Header Contextual**

**Objetivo**

Ubicar rápidamente a la persona y dar acceso inmediato a acciones
esenciales.

**Componentes**

**Izquierda**

**Botón regresar**

"←"

**Nombre principal**

Ejemplo:\
"Sofía Martínez"

**Información secundaria**

Ejemplo:\
"Jazz Infantil"

o:\
"Categoría 2015"

**Derecha**

**Icono WhatsApp**

Acción:

- abrir conversación externa.

**Menú contextual (⋮)**

Opciones secundarias:

- editar datos básicos,

- pausar seguimiento,

- otras acciones futuras.

**Consideraciones UX**

NO mostrar:

- demasiados datos,

- dirección,

- información académica,

- metadata extensa.

El header debe ser:

**compacto y rápido de leer.**

**8. Snapshot / Resumen Rápido**

**Objetivo**

Permitir entender la situación actual antes de leer el timeline.

**Componentes**

**Saldo total pendiente**

Elemento visual principal.

Ejemplo:

**"Pendiente: \$1,300"**

**Desglose rápido de cargos activos**

Ejemplo:

- Mensualidad mayo --- \$800

- Vestuario --- \$500

**Estado relacional destacado**

Si existe promesa activa o situación especial, mostrarla aquí.

Ejemplo:\
🤝 Promesa activa: viernes

o:\
⏸ Seguimiento pausado

**Acción secundaria**

Botón:

**"Compartir resumen"**

Objetivo:

- generar texto simple o resumen compartible por WhatsApp.

NO generar estados de cuenta complejos tipo bancario/SAT.

**Consideraciones UX**

El Snapshot debe ser:

- compacto,

- visual,

- de lectura inmediata.

NO debe desplazar demasiado el timeline.

**9. Acciones Rápidas**

**Objetivo**

Permitir intervención inmediata sin navegar.

**Acciones visibles**

**💵 Pago**

Registrar pago o abono.

**💬 Recordar**

Enviar recordatorio/manual o sugerido.

**🤝 Promesa**

Registrar acuerdo de pago futuro.

**📝 Nota**

Registrar contexto humano/operativo.

**UI recomendada**

Fila horizontal compacta.

NO botones gigantes.

**Orden recomendado**

1.  Pago

2.  Recordar

3.  Promesa

4.  Nota

Basado en:

- frecuencia,

- prioridad,

- flujo mental real.

**10. Timeline Operativo**

**(Core real de la pantalla)**

**Objetivo**

Mostrar:

- qué ocurrió,

- cuándo ocurrió,

- y qué contexto existe.

**Orden**

Cronológico inverso:

**eventos más recientes arriba.**

**Filosofía**

El timeline NO es únicamente financiero.

Debe mezclar:

- dinero,

- mensajes,

- acuerdos,

- eventos operativos,

- contexto humano.

**11. Categorías de Eventos**

El timeline soporta únicamente las siguientes categorías oficiales V1:

**A. 💰 Dinero**

Eventos financieros.

Ejemplos:

- cargo generado,

- pago completo,

- abono parcial.

**B. 📩 Mensajes**

Eventos de comunicación.

Ejemplos:

- recordatorio enviado,

- mensaje manual,

- aviso grupal relacionado.

**C. 📅 Operativo**

Eventos ligeros relacionados a coordinación.

Ejemplos:

- ensayo,

- juego,

- junta,

- festival.

**IMPORTANTE**

NO registrar:

- asistencia,

- faltas,

- control académico.

**D. 🤝 Acuerdos**

Eventos que modifican comportamiento operativo.

Ejemplos:

- promesa de pago,

- pausa de seguimiento.

**E. 📝 Contexto**

Notas humanas/contextuales.

Ejemplos:

- "Papá viajó"

- "Caso sensible"

- "Esperar después del torneo"

**12. Semántica Visual**

**Objetivo**

Permitir entender el tipo de evento con lectura mínima.

**Método visual recomendado**

Combinar:

- iconos,

- badges ligeros,

- colores suaves.

**Colores recomendados**

**💰 Dinero**

Verde suave / rojo tenue.

**📩 Mensajes**

Azul/gris suave.

**📅 Operativo**

Morado/gris suave.

**🤝 Acuerdos**

Amarillo tenue.

**📝 Contexto**

Gris neutro.

**Consideraciones UX**

El timeline NO debe parecer:

- árbol navideño,

- dashboard financiero,

- feed saturado.

Los colores son secundarios.\
La semántica principal debe venir del:

**icono + texto.**

**13. Eventos Financieros ("Cargo Vivo")**

**Objetivo**

Mostrar estado financiero contextual sin obligar al usuario a hacer
cálculos mentales.

**Comportamiento**

Un cargo financiero puede actualizar visualmente su saldo restante.

**Ejemplo**

💰 Vestuario generado\
\$1500

Badge ligero:\
🟡 Pendiente: \$1000

**IMPORTANTE**

NO convertir el evento financiero en:

- widget complejo,

- tarjeta financiera pesada,

- mini dashboard.

Debe seguir sintiéndose:

**parte del timeline.**

**14. Eventos de Comunicación**

**Objetivo**

Registrar historial de interacción.

**Comportamiento**

Los mensajes largos:

- aparecen colapsados inicialmente,

- se expanden mediante tap.

**Ejemplo**

📩 Recordatorio enviado\
"Hola Ana..."

\[tap para expandir\]

**IMPORTANTE**

NO mostrar:

- logs técnicos,

- metadata innecesaria,

- tracking complejo.

**15. Promesas**

**(Core lógico del sistema)**

**Objetivo**

Las promesas NO son simples notas visuales.

Son:

**modificadores operativos reales.**

**Datos mínimos requeridos**

- fecha promesa,

- nota opcional.

**Ejemplo**

🤝 Promesa registrada\
"Pagar viernes"

**Impacto en automatización**

Mientras exista promesa activa:

- reducir o pausar recordatorios automáticos,

- bajar prioridad de insistencia,

- reagendar seguimiento posterior.

**Consideraciones UX**

Registrar promesa debe tomar:

**pocos segundos.**

**UX recomendada**

Bottom Sheet simple:

Título:\
"¿Cuándo prometió pagar?"

Selector fecha:\
\[ Viernes \]

Guardar.

Y listo.

**16. Notas**

**Objetivo**

Capturar contexto humano breve.

**Características**

- rápidas,

- cortas,

- operativas.

**Ejemplos válidos**

- "Papá viajó"

- "Caso sensible"

- "Dar prórroga 10 días"

**IMPORTANTE**

NO usar:

- notas extensas,

- documentos largos,

- comentarios infinitos.

**17. Acciones Contextuales desde Timeline**

**Objetivo**

Permitir intervención directa desde eventos relevantes.

**Ejemplo**

Un cargo financiero puede mostrar:\
\[ Pagar \]

para registrar abono directamente asociado a ese concepto.

**IMPORTANTE**

Mantener:

- pocas acciones,

- contexto claro,

- mínima saturación visual.

**18. Bottom Sheets / Microinteracciones**

**Filosofía**

La mayoría de acciones NO deben sacar al usuario de contexto.

**Recomendado**

Usar:

- bottom sheets,

- overlays ligeros,

- microformularios.

**Evitar**

❌ pantallas completas innecesarias\
❌ formularios largos\
❌ múltiples pasos

**19. Modelo de Datos Requerido para Eventos Timeline**

Cada evento debe contener como mínimo:

**Timestamp**

Fecha y hora exacta.

**Categoría**

- dinero

- mensajes

- operativo

- acuerdos

- contexto

**Título**

Descripción corta.

Ejemplo:\
"Pago registrado"

**Metadata**

Opcional según categoría.

Ejemplos:

- monto,

- saldo restante,

- texto mensaje,

- fecha promesa.

**Relación opcional**

Asociación a:

- cargo,

- grupo,

- recordatorio,

- evento operativo.

**Actor (backend)**

Guardar silenciosamente:

- usuario creador,

- usuario modificador.

**IMPORTANTE**

Aunque el actor exista en backend:

**NO convertir V1 en sistema multiusuario complejo.**

**20. Relación con Automatización**

Seguimiento modifica comportamiento automático del sistema.

**Ejemplos**

**Promesa activa**

→ pausar insistencia.

**Pausa manual**

→ detener recordatorios.

**Último contacto reciente**

→ evitar spam innecesario.

**IMPORTANTE**

El sistema debe sentirse:

**humano y confiable.**

NO:

- agresivo,

- robotizado,

- invasivo.

**21. Estado Vacío**

Caso raro pero posible.

**Ejemplo UI**

"No hay actividad todavía"

CTA:

- Registrar cargo

- Agregar nota

**22. Qué NO Debe Existir en Seguimiento**

❌ expediente académico\
❌ historial escolar\
❌ asistencias\
❌ calificaciones\
❌ control disciplinario\
❌ CRM complejo\
❌ timeline técnico/logs internos\
❌ tracking invasivo\
❌ dashboards financieros complejos\
❌ documentos pesados

**23. Relación con Pendientes**

Pendientes:

**acción rápida.**

Seguimiento:

**contexto y memoria operativa.**

**Flujo esperado principal**

Pendientes\
↓\
Tap persona\
↓\
Seguimiento\
↓\
Consultar contexto\
↓\
Tomar decisión\
↓\
Ejecutar acción\
↓\
Volver

**24. Filosofía Final de la Pantalla**

"Seguimiento" debe sentirse como:

**la memoria profesional confiable que el usuario normalmente intenta
llevar:**

- en WhatsApp,

- en notas improvisadas,

- y en su cabeza.

Pero:

- organizada,

- contextual,

- rápida,

- y conectada al dinero y la relación humana.

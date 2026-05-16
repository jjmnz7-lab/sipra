**Definición Funcional Completa --- Pantalla "Grupos"**

**Sistema: SIPRA**

**Versión objetivo: V1**

**Estado: Definición consolidada previa a wireframe visual detallado**

**1. Propósito de la Pantalla**

La pantalla "Grupos" es el organizador táctico y operativo colectivo del
sistema.

NO es:

- un módulo académico,

- un árbol institucional,

- un administrador escolar,

- ni un dashboard complejo.

Su objetivo es:

**organizar personas operativamente para facilitar cobranza,
comunicación y coordinación grupal.**

Debe responder:

**"¿Cómo está este grupo y qué necesito hacer aquí?"**

**2. Filosofía UX**

La pantalla debe sentirse:

- colectiva,

- ligera,

- rápida,

- organizada,

- accionable.

Debe parecer:

**una consola ligera de coordinación grupal.**

NO:

- un ERP escolar,

- una tabla administrativa pesada,

- ni un calendario complejo.

**3. Filosofía Estratégica**

**Principio oficial:**

**SIPRA NO reemplaza WhatsApp.**

**SIPRA organiza la operación alrededor de WhatsApp.**

El sistema:

- genera contexto,

- resúmenes,

- avisos,

- cargos,

- recordatorios

que luego el usuario comparte o ejecuta mediante WhatsApp.

**4. Contexto Real de Uso**

Los usuarios piensan naturalmente en:

- categorías,

- horarios,

- niveles,

- equipos,

- clases,

- grupos de WhatsApp.

Por ello:

**"Grupo" es deliberadamente un contenedor flexible y agnóstico a la
disciplina.**

Debe funcionar igual para:

- fútbol,

- danza,

- música,

- talleres,

- academias híbridas.

**5. Objetivo Psicológico**

La pantalla debe transmitir:

- organización,

- control colectivo,

- claridad,

- progreso grupal,

- reducción de estrés operativo.

Debe ayudar al usuario a sentir:

**"Tengo organizada la operación de este grupo".**

**6. Rol Dentro del Sistema**

**Pendientes**

→ urgencia individual.

**Seguimiento**

→ contexto individual y memoria relacional.

**Grupos**

→ operación y coordinación colectiva.

**7. Estructura General**

La pantalla se divide en:

1.  Header principal

2.  Lista general de grupos

3.  Vista interna de grupo

4.  Snapshot grupal

5.  Herramientas masivas

6.  Lista de miembros

7.  Eventos operativos ligeros

8.  Generación de resúmenes compartibles

**8. Header Principal**

**Objetivo**

Dar acceso rápido a navegación y creación de grupos.

**Componentes**

**Izquierda**

Título:

**"Grupos"**

**Derecha**

**🔍 Búsqueda**

Buscar:

- grupos,

- categorías,

- horarios,

- niveles.

**＋ Crear grupo**

Acción rápida para nuevo grupo.

**Consideraciones UX**

NO incluir:

- filtros complejos,

- configuraciones avanzadas,

- estructuras jerárquicas.

**9. Lista General de Grupos**

**Objetivo**

Mostrar estado operativo general de cada grupo.

**Filosofía**

Debe sentirse:

**viva y operativa.**

NO:

- catálogo escolar,

- estructura administrativa,

- árbol institucional.

**Formato recomendado**

Tarjetas compactas.

**Contenido de tarjeta**

**Nombre grupo**

Ejemplos:

- Categoría 2015

- Ballet Inicial

- Jazz Intermedio

**Resumen visual rápido**

Formato recomendado:\
🟢 14　🟡 2　🔴 5

Representa:

- al corriente,

- parciales/promesas,

- pendientes críticos.

**Evento operativo próximo (opcional)**

Ejemplo:\
📅 Juego semifinal · viernes

o:\
🎭 Ensayo general · mañana

**Consideraciones UX**

NO saturar tarjetas con:

- demasiadas métricas,

- montos grandes,

- analytics,

- horarios detallados.

**Interacción principal**

**Tap tarjeta**

Abre:

**Vista Interna del Grupo.**

**10. Vista Interna del Grupo**

**(Core real de la pantalla)**

**Objetivo**

Permitir:

- entender situación colectiva,

- ejecutar acciones masivas,

- navegar rápidamente personas del grupo.

**Estructura interna**

1.  Header grupo

2.  Snapshot grupal

3.  Eventos operativos ligeros

4.  Herramientas masivas

5.  Lista de miembros

**11. Header Grupo**

**Componentes**

**← regresar**

**Nombre grupo**

Ejemplo:\
"Categoría 2015"

**Menú contextual (⋮)**

Opciones futuras:

- editar grupo,

- archivar,

- configuraciones básicas.

**Consideraciones UX**

Mantener:

- compacto,

- simple,

- sin exceso de metadata.

**12. Snapshot Grupal**

**Objetivo**

Mostrar estado general del grupo antes de actuar.

**Información requerida**

**Pendientes críticos**

Ejemplo:\
🔴 5 pendientes

**Al corriente**

Ejemplo:\
🟢 14 al corriente

**Monto pendiente grupal**

Ejemplo:\
💰 Pendiente grupo: \$4,500

**Prioridad visual**

IMPORTANTE:\
Las personas pendientes tienen prioridad visual sobre el monto.

**Consideraciones UX**

NO usar:

- gráficas,

- porcentajes,

- donuts,

- dashboards financieros complejos.

**13. Eventos Operativos Ligeros**

**Objetivo**

Mostrar coordinación inmediata relevante del grupo.

**Ejemplos**

📅 Juego viernes\
🎭 Ensayo general\
📌 Junta padres

**UI recomendada**

Pills/carrusel horizontal ligero.

**IMPORTANTE**

Los eventos:

- sí aportan contexto,

- pero NO deben desplazar la prioridad principal (personas/pagos).

**NO convertir esto en:**

- calendario complejo,

- agenda empresarial,

- sistema logístico.

**14. Herramientas Masivas**

**Objetivo**

Resolver acciones colectivas rápidamente.

**Acciones oficiales V1**

**💰 Nuevo Cargo Grupal**

Crear cargos masivos para miembros del grupo.

**Casos de uso**

- mensualidad,

- uniforme,

- vestuario,

- torneo,

- recital,

- inscripción.

**Funcionalidad requerida**

Permitir:

**exclusión manual de miembros.**

**Ejemplo UX**

☑ Sofía\
☑ Carlos\
☐ Mariana

**IMPORTANTE**

NO crear:

- segmentaciones complejas,

- automatizaciones avanzadas,

- reglas masivas sofisticadas.

**📋 Generar Resumen**

Generar resumen compartible optimizado para WhatsApp.

**Filosofía**

El sistema:

- prepara,

- organiza,

- y facilita comunicación.

NO envía automáticamente sin supervisión.

**Flujo UX oficial**

Tap:\
📋 Generar resumen

↓

Modal preview editable

↓

Botón:

**"Copiar y abrir WhatsApp"**

**Prioridad V1**

**Texto compartible**

(prioridad alta)

**Imagen generada**

(posible V1.1)

**Estructura sugerida del resumen**

Título:\
"Estado grupo --- Categoría 2015"

**Al corriente**

- Sofía

- Carlos

**Pendientes por confirmar**

- Mariana

- Luis

Cierre:\
"Si ya realizaste tu pago favor de ignorar este mensaje 🙌"

**IMPORTANTE**

NO usar lenguaje:

- agresivo,

- humillante,

- explícitamente ofensivo.

**📅 Nuevo Aviso**

Crear evento operativo grupal.

**Ejemplos**

- ensayo,

- juego,

- junta,

- festival.

**Comportamiento esperado**

El evento:

- aparece en el contexto grupal,

- se inyecta en el Timeline ("Seguimiento") de los miembros
  relacionados.

**Automatización relacionada**

Si existe modo asistido:

- generar sugerencia de mensaje grupal.

**IMPORTANTE**

NO convertir:

- avisos,

- eventos,

- coordinación

en:

- calendario avanzado,

- módulo agenda,

- sistema de eventos complejo.

**15. Lista de Miembros**

**Objetivo**

Permitir navegación rápida dentro del grupo.

**Filosofía UX**

La lista:

**NO reemplaza "Pendientes".**

Debe priorizar:

- visión colectiva,

- navegación,

- contexto rápido.

NO:

- cobranza individual intensiva.

**Formato recomendado**

Ultra compacto.

**Ejemplos**

🔴 Sofía Martínez\
Adeuda mensualidad

🟢 Carlos López

🟡 Mariana Gómez\
Promesa viernes

**Interacción principal**

**Tap miembro**

Abre:

**Seguimiento individual.**

**IMPORTANTE**

NO incluir aquí:

- demasiados botones,

- microacciones,

- tarjetas complejas tipo Pendientes.

**16. Estados Visuales**

**Objetivo**

Permitir entender rápidamente estado financiero/relacional.

**Estados recomendados**

🔴 Pendiente crítico\
🟡 Parcial/promesa\
🟢 Al corriente

**Consideraciones UX**

Usar:

- puntos,

- badges,

- acentos ligeros.

Evitar:

- saturación cromática,

- exceso de alertas,

- colores agresivos.

**17. Crear Grupo**

**Filosofía**

Ultra simple.

**Campos mínimos oficiales V1**

**Nombre grupo**

(obligatorio)

**Tipo opcional**

Ejemplos:

- categoría,

- horario,

- nivel.

**Descripción corta opcional**

**IMPORTANTE**

NO implementar:

- jerarquías complejas,

- sedes avanzadas,

- estructuras académicas,

- permisos complejos.

**18. Relación con Automatización**

Los grupos interactúan con:

- cargos recurrentes,

- avisos,

- recordatorios,

- resúmenes,

- comunicación colectiva.

**Ejemplo operativo**

Grupo:\
"Categoría 2015"

↓

Crear cargo:\
"Mensualidad junio"

↓

Sistema:

- genera cargos individuales,

- actualiza pendientes,

- prepara recordatorios sugeridos.

**19. Navegación Esperada**

**Flujo principal**

Grupos\
↓\
Seleccionar grupo\
↓\
Entender estado colectivo\
↓\
Ejecutar acción grupal\
o\
Entrar a Seguimiento individual\
↓\
Volver

**20. Qué NO Debe Existir en "Grupos"**

❌ control académico\
❌ asistencias\
❌ calificaciones\
❌ planeación escolar\
❌ dashboards complejos\
❌ analytics avanzados\
❌ calendario completo\
❌ árbol institucional\
❌ permisos multirol complejos\
❌ CRM grupal\
❌ marketing masivo

**21. Filosofía Final de la Pantalla**

"Grupos" debe sentirse como:

**una mesa ligera de coordinación colectiva.**

Debe ayudar al usuario a:

- organizar,

- cobrar,

- coordinar,

- y comunicar

sin convertir SIPRA en:

**un sistema escolar complejo o un ERP administrativo.**

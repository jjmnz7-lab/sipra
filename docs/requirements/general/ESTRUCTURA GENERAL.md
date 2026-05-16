**ESTRUCTURA GENERAL**

El sistema queda dividido en:

**I. Interfaz Principal (UX)**

Las pantallas y navegación visibles para el usuario.

**II. Núcleo Operativo (Dominio)**

La lógica real del sistema.

**III. Capacidades Transversales**

Funciones reutilizables en distintas partes del sistema.

**IV. Configuración**

Reglas básicas y comportamiento del sistema.

**I. INTERFAZ PRINCIPAL (UX)**

**1. Pendientes**

**(Pantalla principal / Core absoluto)**

La pantalla que el usuario abrirá todos los días.

Su objetivo es responder:

**"¿Quién me falta y qué tengo que hacer?"**

**Componentes principales**

**KPIs rápidos**

(NO dashboard complejo)

- total pendiente

- pagos hoy

- vencidos

- parciales

**Lista de pendientes**

Cada registro muestra:

- persona/alumno

- grupo

- concepto

- saldo pendiente

- estado visual

- última acción

- fecha relevante

**Estados visuales**

🟢 liquidado\
🟡 parcial/promesa\
🔴 pendiente/vencido

**Acciones rápidas**

Sin salir de la lista:

- registrar pago

- registrar abono

- enviar recordatorio

- marcar promesa

- pausar seguimiento

- abrir seguimiento

**Filtros**

- grupo

- estado financiero

- estado relacional

- concepto

- vencidos

- parciales

**Sugerencias automáticas**

Ejemplos:

- "3 recordatorios listos"

- "2 promesas vencen mañana"

**2. Seguimiento**

**(Pantalla contextual / Timeline operativo)**

NO es ficha administrativa tradicional.

Es el historial operativo y financiero de la persona.

**Objetivo**

Centralizar:

- pagos,

- mensajes,

- acuerdos,

- notas,

- contexto.

**Componentes**

**Timeline cronológico**

Eventos como:

- cargos generados

- pagos

- abonos

- recordatorios enviados

- promesas

- notas

- pausas

- eventos operativos

**Estado financiero**

- cargos activos

- saldo pendiente

- parcialidades

- historial de pagos

**Contexto relacional**

Notas rápidas:

- "me paga viernes"

- "caso sensible"

- "mamá pidió esperar"

**Acciones rápidas**

- registrar pago

- registrar abono

- enviar recordatorio

- crear nota

- marcar promesa

- pausar seguimiento

**3. Grupos**

**(Organización operativa)**

Debe soportar:

- categorías (fútbol)

- horarios (danza)

- niveles

- grupos generales

**Componentes**

**Lista de grupos**

Ejemplos:

- Categoría 2015

- Ballet Infantil

- Jazz Intermedio

**Vista de grupo**

**Estado grupal**

- al corriente

- pendientes

- parciales

**Herramientas grupales**

- generar resumen compartible

- enviar recordatorio grupal

- crear cargos grupales

- crear evento operativo

**Próximos avisos/eventos**

Ejemplos:\
📅 Ensayo general\
📅 Juego semifinal\
📅 Último día vestuario

**4. Recordatorios**

**(Vista operativa de automatización y envíos)**

NO es módulo de marketing.

Es una vista ligera para:

- revisar,

- aprobar,

- programar,

- y monitorear recordatorios.

**Modos de automatización**

**Asistido (default)**

Sistema sugiere → usuario confirma.

**Semi automático**

Sistema agrupa/programa.

**Automático**

Sistema envía solo.

**Funcionalidades**

- mensajes pendientes por enviar

- historial reciente

- templates

- reglas simples

- ventana de cobro

**5. Configuración**

**Ventana de cobro**

Ejemplo:\
1--7 del mes.

**Nivel de automatización**

- asistido

- semi automático

- automático

**Templates de mensajes**

**Conceptos frecuentes**

**Reglas básicas**

Ejemplos:

- cuándo marcar vencido

- cuándo recordar

**II. NÚCLEO OPERATIVO (DOMINIO)**

**Entidades principales**

**Persona**

Alumno/tutor/contacto.

**Grupo**

Categoría, horario, nivel o agrupación.

**Cargo**

Lo que se espera cobrar.

**Tipos:**

- mensualidad

- vestuario

- torneo

- inscripción

- uniforme

- viaje

- etc.

**Pago/Abono**

Movimiento que reduce saldo.

Debe soportar:

- pagos parciales

- múltiples abonos

**Evento Operativo**

Aviso ligero NO financiero.

Ejemplos:

- ensayo

- juego

- junta

- festival

**Evento Timeline**

Registro histórico.

Ejemplos:

- pago registrado

- mensaje enviado

- promesa creada

**Seguimiento**

Estado contextual/relacional.

**ESTADOS DEL SISTEMA**

**Estados financieros (Cargo)**

- pendiente

- parcial

- liquidado

- vencido

**Estados relacionales (Seguimiento)**

- normal

- promesa

- pausa

- seguimiento manual

**III. CAPACIDADES TRANSVERSALES**

**1. Sistema de Recordatorios (WhatsApp)**

Capacidad reutilizable en:

- pendientes

- seguimiento

- grupos

**Debe soportar:**

**Recordatorios individuales**

**Resúmenes grupales**

**Templates dinámicos**

Variables:

- nombre

- saldo

- concepto

- grupo

- fecha

**Ventanas de cobro**

**Automatización gradual**

**2. Entrada Rápida**

**(Quick Actions)**

Pensado para:

- cancha,

- clases,

- celular,

- rapidez.

**Acciones rápidas globales**

- registrar pago

- registrar abono

- crear cargo

- crear nota

- crear evento operativo

**3. Resumen Compartible**

Texto o imagen ligera para:

- WhatsApp

- screenshots

- grupos

**IV. CONFIGURACIÓN**

**Ventanas de cobro**

**Templates**

**Conceptos frecuentes**

**Nivel de automatización**

**Reglas básicas**

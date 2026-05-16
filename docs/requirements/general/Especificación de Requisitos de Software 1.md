**Especificación de Requisitos de Software (ERS)**

**SIPRA**

**Sistema Integral de Pagos, Relaciones y Administración**

**Versión:** 1.0\
**Estado:** Base funcional para MVP comercial SaaS multi-tenant\
**Arquitectura objetivo:** Web SaaS multi-tenant\
**Stack objetivo:** Next.js + Supabase + PostgreSQL + Edge Functions +
Storage\
**Fecha:** Mayo 2026

**1. Introducción**

**1.1 Propósito del documento**

Este documento define los requisitos funcionales, no funcionales, reglas
de negocio, arquitectura lógica y alcance operativo del sistema SIPRA.

El objetivo es servir como:

- Contrato técnico base del producto.

- Guía de desarrollo.

- Base para arquitectura backend/frontend.

- Referencia para QA.

- Referencia para escalabilidad futura.

- Documento de onboarding para nuevos desarrolladores.

**2. Visión General del Sistema**

SIPRA es un SaaS multi-tenant orientado inicialmente a:

- Academias

- Escuelas

- Centros deportivos

- Estudios de danza

- Talleres

- Negocios con cobranza recurrente simple

El sistema permite:

- Gestionar alumnos/personas.

- Administrar grupos.

- Generar cargos.

- Registrar pagos.

- Llevar trazabilidad financiera.

- Gestionar recordatorios operativos vía WhatsApp.

- Mantener historial narrativo operativo (timeline).

- Operar múltiples academias aisladas.

**3. Objetivos del Sistema**

**3.1 Objetivos Operativos**

- Reducir morosidad.

- Reducir tiempo administrativo.

- Centralizar operación.

- Facilitar seguimiento de pagos.

- Facilitar comunicación operativa.

**3.2 Objetivos Técnicos**

- Arquitectura multi-tenant segura.

- Escalabilidad horizontal.

- Atomicidad financiera.

- Auditabilidad completa.

- Alta trazabilidad.

- Baja complejidad operativa.

**4. Alcance del MVP**

**Incluido**

- Gestión de personas.

- Gestión de grupos.

- Inscripciones.

- Generación de cargos.

- Registro de pagos.

- Aplicación de pagos.

- Timeline operativo.

- Sugerencias de WhatsApp.

- Gestión básica de archivos.

- Multi-tenant.

- RLS.

- Suscripciones SaaS.

- Workers y automatización.

**No incluido en MVP**

- Inventario complejo.

- Facturación CFDI.

- Nómina.

- CRM avanzado.

- Firma digital.

- Contabilidad SAT.

- IA avanzada.

- WhatsApp oficial automatizado completo.

- App móvil nativa.

- Layouts avanzados.

- Automatización fiscal.

**5. Arquitectura General**

**5.1 Arquitectura Lógica**

Frontend → Edge Functions / RPC → PostgreSQL

**Frontend**

- Next.js

- React

- Tailwind

- Supabase Client

**Backend**

- PostgreSQL

- RPC PL/pgSQL

- Edge Functions

- Workers

- Cron Jobs

**Storage**

- Supabase Storage

**6. Arquitectura Multi-tenant**

**Modelo**

Tenant por academia.

Todas las tablas operativas contienen:

academia_id UUID NOT NULL

**Aislamiento**

Implementado mediante:

- JWT Claims

- Row Level Security

- Helpers de seguridad

- Storage path isolation

**7. Modelo Operativo**

**7.1 Usuario**

Representa staff interno.

Roles:

- owner

- admin

- staff

**7.2 Persona**

Representa:

- alumno

- tutor

- cliente

Es el núcleo narrativo y financiero.

**7.3 Grupo**

Representa agrupaciones operativas:

- grupos

- clases

- equipos

- categorías

**7.4 Persona_Grupo**

Representa membresías activas e históricas.

**7.5 Cargo**

Representa deuda.

Ejemplos:

- mensualidad

- inscripción

- recargo

- uniforme

- evento

**7.6 Movimiento**

Representa dinero recibido o revertido.

**7.7 Aplicacion_Movimiento**

Representa cómo se distribuye un movimiento hacia cargos.

**7.8 Evento Timeline**

Representa narrativa operativa/auditable.

**7.9 Envío Sugerido**

Representa recomendaciones operativas de WhatsApp.

**7.10 Archivo Adjunto**

Representa metadata de archivos físicos en storage.

**7.11 Suscripción Academia**

Representa la relación comercial SaaS.

**7.12 Job Execution**

Representa observabilidad interna.

**8. Requisitos Funcionales**

**RF-001 Gestión de Academias**

El sistema debe permitir:

- Crear academias.

- Configurar timezone.

- Configurar plantillas.

- Configurar parámetros de cobranza.

**RF-002 Gestión de Usuarios**

El sistema debe permitir:

- Invitar usuarios.

- Cambiar roles.

- Suspender usuarios.

- Registrar auditoría.

**RF-003 Gestión de Personas**

El sistema debe permitir:

- Crear personas.

- Editar personas.

- Archivar personas.

- Buscar personas.

- Asociar teléfonos WhatsApp.

**RF-004 Gestión de Grupos**

El sistema debe permitir:

- Crear grupos.

- Editar grupos.

- Archivar grupos.

- Asignar personas.

**RF-005 Inscripciones**

El sistema debe permitir:

- Inscribir personas.

- Dar de baja.

- Reactivar membresías.

**RF-006 Gestión de Cargos**

El sistema debe permitir:

- Crear cargos manuales.

- Crear cargos masivos.

- Gestionar vencimientos.

- Marcar estados financieros.

**RF-007 Registro de Pagos**

El sistema debe permitir:

- Registrar pagos.

- Aplicar pagos.

- Registrar pagos parciales.

- Revertir pagos.

**RF-008 Ledger Financiero**

El sistema debe:

- Mantener integridad matemática.

- Permitir auditoría.

- Evitar mutaciones destructivas.

**RF-009 Timeline**

El sistema debe registrar:

- pagos

- cambios

- notas

- movimientos

- envíos

- adjuntos

- automatizaciones

**RF-010 WhatsApp Operativo**

El sistema debe:

- Generar sugerencias.

- Consolidar mensajes.

- Generar wa_links.

- Expirar sugerencias.

**RF-011 Archivos Adjuntos**

El sistema debe permitir:

- Subir archivos.

- Asociar archivos.

- Descargar archivos.

- Eliminar archivos lógicamente.

**RF-012 Dashboard Operativo**

El sistema debe mostrar:

- cartera vencida

- ingresos

- pagos recientes

- actividad

- KPIs

**RF-013 Analytics**

El sistema debe soportar:

- materialized views

- snapshots

- dashboards rápidos

**RF-014 Automatización**

El sistema debe ejecutar:

- cron nocturno

- generación masiva

- conciliación

- limpieza storage

- expiración sugerencias

**RF-015 Suscripciones SaaS**

El sistema debe:

- controlar límites

- suspender tenants

- manejar trial

- manejar grace periods

**9. Requisitos No Funcionales**

**RNF-001 Seguridad**

- RLS obligatorio.

- JWT Claims.

- Storage privado.

- RPCs críticas SECURITY DEFINER.

**RNF-002 Escalabilidad**

Debe soportar:

- miles de tenants

- millones de movimientos

- workers paralelos

**RNF-003 Atomicidad**

Toda operación financiera debe ser transaccional.

**RNF-004 Auditabilidad**

No se permiten deletes físicos financieros.

**RNF-005 Disponibilidad**

Workers resilientes y reintentables.

**RNF-006 Rendimiento**

Objetivos:

- Dashboard \< 2s

- RPC financiera \< 500ms

- Queries operativas indexadas

**RNF-007 Observabilidad**

Todos los procesos críticos deben registrarse.

**RNF-008 Timezones**

Toda lógica operativa debe ser timezone-aware.

**10. Reglas de Negocio**

**RN-001**

Una academia nunca puede quedarse sin owner activo.

**RN-002**

Un movimiento nunca puede quedar parcialmente aplicado sin consistencia.

**RN-003**

Toda reversión financiera genera contra-transacción.

**RN-004**

No existen borrados físicos financieros.

**RN-005**

Los tenants suspendidos operan en modo read-only.

**RN-006**

Las sugerencias WhatsApp deben excluir personas sin teléfono.

**RN-007**

La generación masiva debe ser idempotente.

**RN-008**

Todo cambio financiero genera timeline.

**RN-009**

Toda subida de archivo inicia como pendiente_subida.

**RN-010**

Los workers deben operar en chunks paginados.

**11. Seguridad**

**11.1 JWT Claims**

Claims principales:

{\
\"app_metadata\": {\
\"academia_id\": \"uuid\",\
\"rol\": \"admin\"\
}\
}

**11.2 RLS**

Todas las tablas operativas usan:

academia_id = security.get_my_tenant_id()

**11.3 Storage**

Buckets privados.

Paths aislados:

tenant_id/contexto/YYYY_MM/file.ext

**12. Arquitectura RPC**

Toda lógica crítica vive en RPCs.

**Ejemplos**

- registrar_pago_atomico

- generar_cargos_masivos

- gestionar_membresia

- confirmar_subida

- solicitar_subida

**13. Arquitectura Workers**

**Workers principales**

- nightly_billing_worker

- envio_sugerido_worker

- storage_reaper

- analytics_refresh_worker

**14. Observabilidad**

**14.1 Job Execution**

Registra:

- éxito

- fallos

- duración

- payloads

**14.2 Auditoría**

Timeline + Ledger = trazabilidad total.

**15. Integraciones**

**MVP**

- WhatsApp links

- Supabase Auth

- Supabase Storage

**Futuro**

- Stripe

- MercadoPago

- WhatsApp API

- SAT

- CFDI

**16. Restricciones Técnicas**

- PostgreSQL obligatorio.

- RLS obligatorio.

- UUID obligatorio.

- Sin DELETE físico financiero.

- RPC-first architecture.

**17. Riesgos Técnicos**

**Riesgos**

- Deadlocks financieros.

- Storage orphan files.

- Workers duplicados.

- JWT stale state.

- Saturación WhatsApp.

**Mitigaciones**

- FOR UPDATE ordenado.

- Idempotencia.

- Reapers.

- Refresh session.

- Chunking workers.

**18. Roadmap Evolutivo**

**V1**

Operación básica SaaS.

**V1.5**

Analytics avanzados.

**V2**

WhatsApp API real.

**V3**

Facturación.

**V4**

Automatización inteligente.

**19. Decisiones Arquitectónicas Congeladas**

- Multi-tenant por academia_id.

- RLS como seguridad principal.

- Ledger inmutable.

- RPC-first.

- Timeline universal.

- Workers async.

- Storage privado.

- JWT claims ligeros.

- PostgreSQL como motor central.

**20. Conclusión**

SIPRA está diseñado como un SaaS operativo-financiero robusto,
audit-proof y altamente escalable, priorizando:

- simplicidad operativa

- seguridad multi-tenant

- trazabilidad financiera

- automatización controlada

- crecimiento progresivo sin rehacer arquitectura

El MVP queda orientado a validación comercial rápida sin comprometer la
base técnica para escalar posteriormente.

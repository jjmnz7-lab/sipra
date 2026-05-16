**Especificación de Requisitos de Software (SRS): SIPRA**

**Proyecto:** Sistema de Recordatorios y Pagos para Academias

**Versión:** 1.0 (Foundational)

**Estado:** Congelado para Desarrollo

**1. Introducción**

**1.1 Propósito**

El propósito de este documento es definir los requisitos funcionales, no
funcionales y técnicos para el desarrollo de SIPRA. El sistema está
diseñado como un Micro-SaaS multi-tenant para la gestión administrativa
y financiera de academias (deportivas, artísticas, etc.), con un enfoque
crítico en la automatización de cobranza y la integridad de datos.

**1.2 Alcance**

SIPRA permitirá a los dueños de academias gestionar expedientes de
alumnos, organizar grupos, automatizar la generación de cargos
mensuales, registrar pagos de forma atómica y enviar recordatorios
proactivos vía WhatsApp.

**1.3 Definiciones y Terminología**

- **Ledger:** Libro mayor contable inmutable que registra todos los
  movimientos financieros.

- **Tenant:** Instancia aislada de una academia dentro del sistema.

- **Pendiente:** Término oficial para referirse a saldos no liquidados
  (evitando el uso de \"Deuda\").

- **RPC (Remote Procedure Call):** Funciones del lado del servidor
  (PostgreSQL) que ejecutan lógica de negocio atómica.

**2. Descripción General**

**2.1 Perspectiva del Producto**

SIPRA es una plataforma web \"Backend-First\" construida sobre
**Supabase**, utilizando PostgreSQL como motor de estado y Edge
Functions para orquestación externa.

**2.2 Funciones del Producto**

1.  **Gestión de Entidades:** Control de Academias, Usuarios (Staff),
    Alumnos (Personas) y Grupos.

2.  **Motor Financiero:** Generación de cargos recurrentes y gestión de
    saldos.

3.  **Sistema de Pagos:** Registro de abonos con aplicación automática a
    cargos vencidos.

4.  **Automatización de Mensajería:** Generación de sugerencias de envío
    para WhatsApp.

5.  **Evidencia Digital:** Almacenamiento seguro de comprobantes y
    documentos.

6.  **Auditoría e Inteligencia:** Dashboards en tiempo real y detección
    de inconsistencias.

**2.3 Atributos de Usuario**

- **Owner:** Dueño de la academia. Control total sobre finanzas y staff.

- **Admin/Staff:** Personal administrativo. Registro de pagos y gestión
  de alumnos.

- **Profesor:** Acceso limitado a listas de asistencia y datos básicos
  de alumnos.

**3. Requisitos Funcionales**

**3.1 Módulo de Identidad y Acceso (IAM)**

- **RF1:** Aislamiento estricto de datos mediante **Row Level Security
  (RLS)** por academia_id.

- **RF2:** Autenticación mediante Supabase Auth con inyección de
  academia_id en el JWT.

**3.2 Módulo Financiero (El Ledger)**

- **RF3:** Inmutabilidad de movimientos. Los registros financieros no se
  editan, se revierten mediante contra-movimientos.

- **RF4:** Aplicación de pagos determinista siguiendo la jerarquía:

  1.  Vencidos más antiguos.

  2.  Saldos parciales.

  3.  Cargos corrientes.

- **RF5:** Consistencia matemática obligatoria:

> \$\$\\text{monto\\\_original} = \\text{saldo\\\_pendiente} + \\sum
> \\text{aplicaciones}\$\$

**3.3 Módulo de Automatización (Workers)**

- **RF6:** Generación masiva de cargos mensuales mediante micro-workers
  con **Advisory Locks** para prevenir duplicados.

- **RF7:** Gestión de recordatorios asíncronos. La base de datos genera
  la \"intención\" y el worker ejecuta el envío externo.

- **RF8:** Reconciliación nocturna de estados de cuenta y limpieza de
  subidas de archivos fallidas.

**3.4 Gestión de Archivos**

- **RF9:** Subida de evidencias en dos fases (Intención en DB -\> Upload
  a Storage -\> Confirmación).

- **RF10:** Acceso a documentos privados mediante **Signed URLs** de
  corta duración (1-5 min).

**4. Requisitos No Funcionales**

**4.1 Seguridad**

- **RNF1:** Encriptación de datos en tránsito (TLS) y en reposo
  (AES-256).

- **RNF2:** Todas las mutaciones financieras deben ejecutarse mediante
  **RPCs con Security Definer** y search_path protegido.

**4.2 Rendimiento**

- **RNF3:** Las consultas del Dashboard deben responder en \< 500ms
  mediante el uso de **Materialized Views** y tablas de Snapshots.

- **RNF4:** El sistema debe soportar **Bounded Concurrency** para no
  saturar el pool de conexiones durante procesos masivos.

**4.3 Disponibilidad y Resiliencia**

- **RNF5:** Idempotencia garantizada en todas las operaciones críticas
  mediante llaves de control persistentes.

- **RNF6:** Estrategia de **Anti-Drift** en cron jobs para evitar el
  desfase de horarios operativos.

**5. Arquitectura Técnica**

**5.1 Stack Tecnológico**

- **Base de Datos:** PostgreSQL (Supabase).

- **Backend:** Edge Functions (Deno/TypeScript) y PL/pgSQL (RPCs).

- **Almacenamiento:** Supabase Storage (Buckets privados).

- **Infraestructura de Jobs:** pg_cron y Workers asíncronos.

**5.2 Estructura de Datos (Core)**

  --------------------------------------------
  **Tabla**         **Función**
  ----------------- --------------------------
  academia          Definición del Tenant y
                    límites de cuota.

  persona           Expediente del alumno.

  cargo             Obligación financiera
                    generada.

  movimiento        Entrada de dinero o
                    ajuste.

  evento_timeline   Registro histórico de
                    sucesos.

  archivo_adjunto   Metadatos de evidencias
                    físicas.
  --------------------------------------------

**6. Reglas de Negocio \"Congeladas\"**

1.  **Prioridad de Operaciones:** 1. Ledger, 2. RPCs, 3. Cobranza, 4.
    Timeline, 5. Analytics.

2.  **Integridad de Borrado:** ON DELETE RESTRICT en todas las entidades
    con historial financiero.

3.  **Privacidad:** Ningún archivo es público por defecto.

4.  **Tone & Voice:** La interfaz debe ser proactiva y amigable,
    utilizando estados de pago claros y términos no agresivos.

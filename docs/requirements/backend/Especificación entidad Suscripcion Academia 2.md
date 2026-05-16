**ESPECIFICACIÓN DE ENTIDAD: suscripcion_academia (Gobernanza y
Billing)**

**1. Filosofía de la Entidad**

Representa el **Contrato Comercial** vigente e histórico entre SIPRA y
la academia. Es una entidad de **solo lectura** para el staff de la
academia (consumida para mostrar límites y estado de cuenta) y de
**escritura protegida** para procesos del sistema. Su diseño permite el
*Grandfather Pricing* (congelar precios a clientes antiguos), la gestión
de cuotas suaves (*Soft Quotas*) y un rastro auditable de la vida
comercial del cliente (Upgrades/Downgrades).

**Nombre de Tabla:** suscripcion_academia

**2. Estructura de Campos (Esquema Físico)**

  -----------------------------------------------------------------------------------------
  **Campo**             **Tipo**        **Reglas y          **Propósito**
                                        Restricciones**     
  --------------------- --------------- ------------------- -------------------------------
  **id**                UUID            **PK**, DEFAULT     ID único del
                                        gen_random_uuid()   contrato/suscripción.

  **academia_id**       UUID            FK, **NOT NULL**,   Tenant dueño del contrato.
                                        Indexado            

  **is_current**        Boolean         **NOT NULL, DEFAULT **Flag Operativo:** Identifica
                                        true**              el plan vigente.

  **plan_codigo**       Varchar(30)     **NOT NULL**        starter, growth, pro, trial.

  **estado**            Varchar(20)     **NOT NULL**        trial, activa, past_due,
                                                            suspendida, cancelada,
                                                            reemplazada.

  **precio_mensual**    Numeric(10,2)   **NOT NULL**        **Snapshot:** Precio pactado en
                                                            la firma.

  **moneda**            Varchar(10)     **NOT NULL, DEFAULT Moneda de facturación.
                                        \'MXN\'**           

  **limite_personas**   Integer         NULLABLE (NULL =    Cuota de alumnos (Soft Quota).
                                        Ilimitado)          

  **limite_usuarios**   Integer         NULLABLE            Cuota de staff.

  **limite_grupos**     Integer         NULLABLE            Cuota de organización.

  **periodo_inicio**    Timestamptz     **NOT NULL, DEFAULT Inicio exacto de la vigencia
                                        now()**             actual.

  **fecha_corte**       Timestamptz     NULLABLE            Próximo intento de cargo
                                                            automático.

  **grace_ends_at**     Timestamptz     NULLABLE            **Fin de Gracia:** Límite para
                                                            modo escritura.

  **trial_ends_at**     Timestamptz     NULLABLE            Expiración exacta del periodo
                                                            gratuito.

  **metadata**          JSONB           **NOT NULL, DEFAULT Stripe/MercadoPago IDs,
                                        \'{}\'**            cupones, overrides.

  **created_at**        Timestamptz     DEFAULT now()       Auditoría de creación.

  **updated_at**        Timestamptz     DEFAULT now()       Auditoría de cambio de estado.
  -----------------------------------------------------------------------------------------

**3. Integridad y Garantía Operativa**

Para asegurar que el motor de facturación y las políticas de acceso no
sufran colisiones, se aplica un índice parcial de exclusividad.

**El Índice de la \"Suscripción Vigente\"**

SQL

CREATE UNIQUE INDEX uq_suscripcion_vigente

ON suscripcion_academia (academia_id)

WHERE is_current = true;

- **Transición de Plan:** Cuando ocurre un cambio de plan, la
  suscripción anterior se marca con is_current = false y estado =
  \'reemplazada\'. La nueva se inserta con is_current = true. Esto
  permite tener un historial infinito de contratos sin penalizar el
  rendimiento de las consultas actuales.

**4. Ciclo de Vida y Estados Comerciales**

1.  **trial**: Periodo gratuito inicial con límites reducidos.

2.  **activa**: Suscripción pagada y al corriente. Acceso total.

3.  **past_due**: El cobro falló. Se activa el **Grace Period** hasta la
    fecha marcada en grace_ends_at.

4.  **suspendida**: Periodo de gracia agotado. La academia entra en
    **Modo Solo Lectura**.

5.  **cancelada**: Baja definitiva del servicio.

6.  **reemplazada**: Estado histórico para registros que ya no son el
    plan actual tras un upgrade/downgrade.

**5. Seguridad y Row Level Security (RLS)**

- **Lectura (SELECT):** Permitida solo para el owner de la academia y
  solo para registros donde academia_id coincida con su sesión.

- **Escritura (INSERT, UPDATE, DELETE):** **PROHIBIDA** para todos los
  roles de la academia (USING false).

  - **Regla Inviolable:** Las suscripciones solo se manipulan vía
    *Service Role* desde el backend (Webhooks de la pasarela de pagos o
    funciones de administración interna). Esto impide cualquier intento
    de manipulación de precios o límites desde el cliente.

**6. Reglas de Negocio y \"Soft Quotas\"**

- **Determinismo de Gracia:** El sistema no calcula el tiempo de gracia
  al vuelo. Se consulta grace_ends_at. Si now() \> grace_ends_at, las
  funciones de escritura financieras (RPCs) deben rechazar la
  transacción.

- **Capas de Límite (Alumnos):**

  - **90% del límite:** Alerta visual preventiva.

  - **100% del límite:** Bloqueo de creación de *nuevas* personas, pero
    permite operar finanzas y comunicación de los existentes.

- **Independencia de Dominio:** El estado de la suscripción (billing) es
  independiente del estado del tenant (operativo). Una academia puede
  estar al corriente en pagos pero suspendida manualmente por infracción
  de términos de servicio.

**7. Decisiones Arquitectónicas Congeladas**

1.  **Snapshot de Precio:** Almacenar el precio_mensual protege al
    cliente contra cambios en los precios globales (Grandfathering) y
    permite auditorías financieras precisas.

2.  **Capability-Based Access:** El sistema no debe preguntar por el
    código del plan, sino por capacidades (ej: has_whatsapp_pro). El
    mapeo entre plan_codigo y capacidades se define en la lógica del
    backend.

3.  **Zonas Horarias:** Todas las fechas críticas (corte, grace, trial)
    utilizan Timestamptz para evitar errores de sincronización en cobros
    internacionales.

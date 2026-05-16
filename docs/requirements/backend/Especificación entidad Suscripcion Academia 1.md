**ESPECIFICACIÓN COMPLETA Y ACTUALIZADA --- ENTIDAD:
suscripcion_academia**

**1. Filosofía de la Entidad**

La entidad suscripcion_academia representa:

**la relación comercial SaaS entre SIPRA y una academia.**

**Responsabilidades**

Esta entidad controla:

✅ acceso operativo al SaaS\
✅ plan contratado\
✅ lifecycle comercial\
✅ límites de uso\
✅ estado de pago\
✅ modo read-only\
✅ trials\
✅ grace periods\
✅ upgrades/downgrades\
✅ histórico comercial

**NO representa**

❌ pagos de alumnos\
❌ movimientos financieros internos\
❌ facturación SAT\
❌ ledger contable

**Regla arquitectónica congelada**

El dominio SaaS:

**está completamente desacoplado del Ledger financiero de alumnos.**

**Separación oficial**

  ------------------------------------
  **Dominio**   **Entidad**
  ------------- ----------------------
  Cobranza      movimiento
  alumnos       

  Billing SIPRA suscripcion_academia
  ------------------------------------

**2. Nombre Físico de Tabla**

suscripcion_academia

**3. Relación Principal**

academia 1:N suscripcion_academia

**Filosofía**

Una academia:

- puede iniciar trial,

- renovar,

- cambiar plan,

- suspenderse,

- reactivarse,

- cancelar.

Por eso:

**se conserva histórico comercial.**

**4. Estructura de Campos (Esquema Físico)**

  -------------------------------------------------------------------------------
  **Campo**            **Tipo**        **Reglas y            **Propósito**
                                       Restricciones**       
  -------------------- --------------- --------------------- --------------------
  id                   UUID            PK, DEFAULT           Identificador
                                       gen_random_uuid()     

  academia_id          UUID            FK, NOT NULL, INDEX   Tenant owner

  plan_codigo          VARCHAR(30)     NOT NULL              Tipo de plan

  estado               VARCHAR(20)     NOT NULL              Estado comercial

  is_current           BOOLEAN         NOT NULL DEFAULT true Suscripción vigente

  max_personas         INTEGER         NOT NULL DEFAULT 30   Cuota de alumnos

  max_usuarios         INTEGER         NOT NULL DEFAULT 2    Cuota staff

  max_grupos           INTEGER         NULLABLE              Cuota operativa

  precio_mensual       NUMERIC(10,2)   NOT NULL              Snapshot financiero

  moneda               VARCHAR(10)     NOT NULL DEFAULT      Moneda
                                       \'MXN\'               

  external_id          VARCHAR(120)    NULLABLE              ID
                                                             Stripe/MercadoPago

  fecha_inicio         TIMESTAMPTZ     NOT NULL DEFAULT      Inicio vigencia
                                       now()                 

  fecha_fin            TIMESTAMPTZ     NULLABLE              Fin contractual

  fecha_corte          TIMESTAMPTZ     NULLABLE              Próximo cobro

  trial_ends_at        TIMESTAMPTZ     NULLABLE              Expiración trial

  grace_ends_at        TIMESTAMPTZ     NULLABLE              Fin grace period

  cancelado_at         TIMESTAMPTZ     NULLABLE              Momento cancelación

  motivo_cancelacion   TEXT            NULLABLE              Analytics churn

  metadata             JSONB           NOT NULL DEFAULT      Extensiones futuras
                                       \'{}\'                

  created_by           UUID            FK usuario.id,        Auditoría
                                       NULLABLE              

  created_at           TIMESTAMPTZ     NOT NULL DEFAULT      Auditoría
                                       now()                 

  updated_at           TIMESTAMPTZ     NOT NULL DEFAULT      Auditoría
                                       now()                 
  -------------------------------------------------------------------------------

**5. Estados Oficiales**

  -------------------------------------
  **Estado**    **Significado**
  ------------- -----------------------
  trial         Periodo gratuito

  activa        Operación normal

  gracia        Pago vencido con
                tolerancia

  suspendida    Read-only

  cancelada     Baja definitiva

  reemplazada   Sustituida por
                upgrade/downgrade
  -------------------------------------

**Filosofía importante**

estado:

**representa lifecycle comercial.**

NO:

- bloqueo operativo absoluto,

- sanciones,

- moderación.

Eso pertenece a:

academia.estado_tenant

**6. Planes Oficiales V1**

  -------------------------------
  **plan_codigo**   **Uso**
  ----------------- -------------
  trial             Prueba

  basico            Operación
                    pequeña

  pro               Operación
                    estándar

  personalizado     Casos
                    especiales
  -------------------------------

**Filosofía**

NO crear catálogo complejo de planes en V1.

**Razón**

Evitar:

sobreingeniería temprana

**7. Restricciones a Nivel Motor (CHECK Constraints)**

**Plan válido**

CHECK (\
plan_codigo IN (\
\'trial\',\
\'basico\',\
\'pro\',\
\'personalizado\'\
)\
)

**Estado válido**

CHECK (\
estado IN (\
\'trial\',\
\'activa\',\
\'gracia\',\
\'suspendida\',\
\'cancelada\',\
\'reemplazada\'\
)\
)

**Precio válido**

CHECK (\
precio_mensual \>= 0\
)

**Límites válidos**

CHECK (\
max_personas \> 0\
)

CHECK (\
max_usuarios \> 0\
)

CHECK (\
max_grupos IS NULL\
OR max_grupos \> 0\
)

**Fechas válidas**

CHECK (\
fecha_fin IS NULL\
OR fecha_fin \>= fecha_inicio\
)

**8. Restricción Arquitectónica Crítica**

**Solo una suscripción vigente**

Una academia:

**NO puede tener múltiples suscripciones operativas simultáneas.**

**Implementación oficial**

CREATE UNIQUE INDEX uq_sub_current\
ON suscripcion_academia (academia_id)\
WHERE is_current = true;

**Filosofía**

Esto permite:

- histórico completo,

- upgrades,

- renovaciones,

- churn analytics,

sin perder:

**lookup operacional rápido.**

**9. Filosofía de is_current**

is_current:

**NO es redundante.**

Existe para:

- queries rápidas,

- enforcement,

- middleware,

- cron jobs,

- límites operativos.

**Ejemplo de upgrade**

**Suscripción vieja**

estado = \'reemplazada\'\
is_current = false

**Nueva suscripción**

estado = \'activa\'\
is_current = true

**10. Índices Recomendados**

**Lookup tenant actual**

CREATE INDEX idx_sub_current_lookup\
ON suscripcion_academia (\
academia_id,\
is_current,\
estado\
);

**Renovaciones y grace**

CREATE INDEX idx_sub_billing_dates\
ON suscripcion_academia (\
fecha_corte,\
grace_ends_at,\
estado\
);

**Trials**

CREATE INDEX idx_sub_trials\
ON suscripcion_academia (\
trial_ends_at\
);

**Billing provider**

CREATE INDEX idx_sub_external\
ON suscripcion_academia (\
external_id\
);

**11. Seguridad y RLS (MUY IMPORTANTE)**

**Activación**

ALTER TABLE suscripcion_academia\
ENABLE ROW LEVEL SECURITY;

**SELECT**

Permitido únicamente para usuarios del tenant.

USING (\
is_auth_user_for_tenant(academia_id)\
)

**INSERT / UPDATE / DELETE**

USING (false)

**Regla congelada**

La tabla:

suscripcion_academia

es:

**READ-ONLY para clientes/tenants.**

**Mutaciones permitidas SOLO desde**

  ------------------------------
  **Actor**      **Permitido**
  -------------- ---------------
  Service Role   Sí

  Webhooks       Sí
  billing        

  Consola        Sí
  interna SIPRA  

  RPC            Sí
  privilegiada   

  Frontend       NO
  tenant         
  ------------------------------

**12. Integración con Billing Providers**

**external_id**

Permite integración futura con:

✅ Stripe\
✅ MercadoPago\
✅ Paddle\
✅ LemonSqueezy

**Regla**

Nunca acoplar:

plan_codigo

a IDs externos.

**13. Control de Límites (Quotas)**

**max_personas**

Controla:

persona

**max_usuarios**

Controla:

usuario

**max_grupos**

Controla:

grupo

**Filosofía importante**

Los límites:

**NO deben bloquear brutalmente.**

**Estrategia oficial**

  ----------------------
  **Uso**   **Acción**
  --------- ------------
  90%       warning

  100%      warning
            fuerte

  110%      bloqueo
            progresivo
  ----------------------

**Razón**

Evitar churn por:

hard stop inesperado

**14. Modo Read-Only**

**Regla oficial**

Si:

estado IN (\'suspendida\')

Entonces:

**toda mutación operativa debe bloquearse.**

**Esto debe validarse desde:**

✅ helper SQL\
✅ RPC\
✅ backend\
✅ RLS indirecto

**NO frontend únicamente.**

**15. Grace Period**

**grace_ends_at**

Existe para:

- evitar suspensión inmediata,

- mejorar recuperación,

- reducir churn.

**Flujo típico**

  ----------------------------
  **Estado**   **Resultado**
  ------------ ---------------
  activa       normal

  gracia       warning +
               operación

  suspendida   read-only
  ----------------------------

**16. Integración con Automatización**

Debe existir Cron/Worker que:

✅ detecte trials vencidos\
✅ detecte pagos vencidos\
✅ active grace period\
✅ suspenda automáticamente\
✅ reactive tras pago

**Resultado esperado**

Puede mutar:

- suscripcion_academia.estado

- academia.estado_tenant

**17. Metadata JSONB**

**Permitido**

✅ promociones\
✅ campañas\
✅ addons\
✅ flags comerciales\
✅ notas internas\
✅ descuentos temporales

**NO permitido**

❌ límites core\
❌ estado principal\
❌ ownership\
❌ seguridad

Eso debe vivir:

**en columnas físicas.**

**18. Reglas Arquitectónicas Congeladas**

**Regla 1**

Billing SaaS:

**completamente separado del Ledger operativo.**

**Regla 2**

La tabla es:

**READ-ONLY para tenants.**

**Regla 3**

Mutaciones solo vía:

- backend privilegiado,

- webhooks,

- service role.

**Regla 4**

TIMESTAMPTZ obligatorio para billing.

**Regla 5**

Siempre máximo:

1 suscripción vigente

por tenant.

**Regla 6**

reemplazada\
NO significa churn.

**Regla 7**

Los límites:

**deben degradar elegantemente.**

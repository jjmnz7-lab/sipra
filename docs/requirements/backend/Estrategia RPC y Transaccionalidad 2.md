**ESTRATEGIA: RPC y Transaccionalidad Atómica (V1)**

**1. Filosofía de Orquestación**

En SIPRA, el Frontend tiene **prohibido** manipular el Ledger o los
estados operativos directamente. Su única función es enviar una
\"Intención de Cambio\". La lógica de negocio, la integridad financiera
y la coherencia del estado residen exclusivamente en la base de datos a
través de **RPCs (Remote Procedure Calls)** desarrolladas en PL/pgSQL.

**El Patrón Sagrado de las 6 Capas**

Toda operación que muta el estado debe seguir esta secuencia lineal e
indivisible:

1.  **Seguridad:** Validación via security.can_write_to_academia().

2.  **Validación de Negocio:** Verificación de reglas (ej. ¿Existe
    saldo?, ¿Es una baja válida?).

3.  **Locks:** Adquisición de bloqueos (FOR UPDATE o Advisory) en orden
    determinístico.

4.  **Ledger:** Ejecución de la matemática financiera (Money-in /
    Money-out).

5.  **Side-Effects:** Invalidación de envio_sugerido, limpieza de caché,
    preparación de colas.

6.  **Narrativa/Auditoría:** Registro en evento_timeline y
    rpc_idempotency.

**2. Determinismo de Aplicación**

Para garantizar que el sistema sea predecible y justo, la aplicación de
pagos a deudas sigue una jerarquía técnica inmutable:

1.  **Vencidos más antiguos:** Prioridad total para sanear la cartera
    vencida.

2.  **Saldos parciales:** Liquidar deudas que ya tienen abonos previos.

3.  **Cargos pendientes:** Deuda del periodo actual.

4.  **Cargos futuros/específicos:** Uniformes, eventos o meses
    adelantados.

**3. Estrategia de Bloqueo Inteligente (Anti-Contención)**

Diseñamos para la concurrencia. El objetivo es proteger la integridad
sin matar el rendimiento.

  -----------------------------------------------------------------------------------
  **Tipo de       **Herramienta**           **Aplicación**
  Lock**                                    
  --------------- ------------------------- -----------------------------------------
  **Por Fila**    SELECT \... FOR UPDATE    Entidades con saldo o estado (Cargos,
                                            Movimientos, Usuarios).

  **Por Proceso** pg_advisory_xact_lock()   Operaciones masivas (Generar
                                            mensualidades, Recalcular KPIs).

  **Defensivo**   SET LOCAL lock_timeout =  Evita cascadas de procesos colgados y
                  \'5s\'                    libera la UX.
  -----------------------------------------------------------------------------------

- **Regla de Oro:** Todo bloqueo de múltiples filas debe hacerse con
  ORDER BY id ASC para prevenir **Deadlocks**.

**4. El Motor de Idempotencia (rpc_idempotency)**

Para manejar los reintentos por parpadeos de red o errores de cliente,
se utiliza un registro de \"Replay\" persistente.

- **Funcionamiento:** Antes de procesar la lógica, la RPC busca la
  idempotency_key enviada por el frontend.

- **Success:** Si existe y terminó bien, se devuelve el response_payload
  cacheado sin tocar el Ledger.

- **Running:** Si existe pero sigue en curso, se rechaza la petición
  duplicada.

- **New:** Si no existe, se registra y se inicia la ejecución de las 6
  capas.

**5. Separación de Poderes: Ledger vs. Reacción**

Dividimos la responsabilidad técnica para asegurar que un fallo en un
servicio externo no corrompa la verdad financiera.

- **Mundo DB (Source of Truth):** Responsable de la atomicidad, el
  Ledger y la consistencia. **Jamás realiza llamadas externas (HTTP).**

- **Mundo Edge (Reaction Layer):** Responsable de integraciones
  (WhatsApp, Stripe, Emails). **Solo puede llamar a una RPC financiera
  por operación.**

**6. Manejo de Errores Estructurados**

Las excepciones no son solo texto; son datos para el frontend.

SQL

RAISE EXCEPTION USING

MESSAGE = \'Saldo insuficiente para esta operación\',

ERRCODE = \'P001\', \-- Prefijo P para Pagos, C para Cargos, S para
Sistema

DETAIL = json_build_object(\'id_cargo\', v_id, \'saldo_actual\',
v_saldo)::text;

**7. Reglas Arquitectónicas Congeladas (RPC)**

1.  **Atomicidad Total:** No hay \"commits parciales\". O se registra el
    pago, se aplica a la deuda y se crea el evento en el timeline, o no
    ocurre nada.

2.  **Versionado Obligatorio:** Las RPCs se nombran con sufijo (\_v1,
    \_v2) para permitir la evolución del sistema sin romper clientes
    antiguos.

3.  **Security Definer + Search Path:** Toda RPC operativa debe ser
    SECURITY DEFINER y fijar su search_path = public, security para
    evitar escalamiento de privilegios.

4.  **No Dynamic SQL:** Queda prohibido el uso de EXECUTE con strings
    concatenados dentro de las RPCs financieras para blindar el sistema
    contra Inyección SQL.

5.  **Rollback Narrativo:** Si la lógica financiera falla, el registro
    en el Timeline debe revertirse también. El Ledger es la prioridad
    absoluta.

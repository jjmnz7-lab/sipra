**ESPECIFICACIÓN: Capa de Analytics, Auditoría y KPIs (V1)**

**1. Filosofía de Datos (OLTP vs. OLAP)**

SIPRA opera bajo el principio de **Desacoplamiento Analítico**.

- **Esquema public (OLTP):** Verdad operativa inmutable, atómica y
  rápida.

- **Esquema analytics (OLAP):** Proyecciones, agregaciones y snapshots
  para consumo de UI y reportes.

**2. Categoría I: Auditoría Financiera (The Watchdogs)**

Estas vistas son de **Tiempo Real** y su propósito es detectar
inconsistencias matemáticas. Si estas vistas devuelven filas, el sistema
emite una alerta de corrupción.

**A. vw_conciliacion_ledger**

Valida la integridad de cada movimiento y cargo basándose solo en
estados activos.

- **Fórmula de Verdad:**

> \$\$\\sum Cargos(activos) - \\sum Aplicaciones(activas) = \\sum
> Saldo(pendiente)\$\$

- **Detección:** Fugas de dinero, dobles aplicaciones o errores en
  reversiones manuales.

**B. vw_auditoria_seguridad**

Filtra el evento_timeline para acciones de alto riesgo.

- **Eventos:** reversa_pago, anulacion_cargo, ajuste_manual_saldo,
  cambio_propietario.

- **Severidad:** Clasifica cada evento en MEDIA, ALTA o CRÍTICA.

**3. Categoría II: Operativas (Bandeja de Entrada)**

Optimizadas para la gestión diaria del Staff. Son vistas dinámicas
(VIEW) que dependen fuertemente de índices.

- **vw_bandeja_cobranza:** Listado de personas con saldos vencidos,
  ordenados por \"Días de Atraso\" y \"Monto\". Cruza con promesa_pago
  activa.

- **vw_asistencia_riesgo:** Detecta alumnos con inasistencias
  consecutivas en la última semana para prevenir el abandono.

- **vw_estado_cuenta_persona:** Una vista financiera pura (Cargos vs.
  Pagos) que el frontend consume para proyectar la narrativa económica
  del alumno.

**4. Categoría III: Business Analytics (Tendencias)**

Debido a su costo computacional, estas son **Materialized Views** o
**Snapshot Tables** actualizadas de forma asíncrona.

  -------------------------------------------------------------------------------------
  **Vista**                   **Tipo**   **Frecuencia**   **KPI Clave**
  --------------------------- ---------- ---------------- -----------------------------
  **mv_cartera_vencida**      MatView    Horaria          Bucketización (1-7, 8-30, 31+
                                                          días).

  **mv_churn_financiero**     MatView    Diaria           Alumnos sin pagos en los
                                                          últimos 45 días.

  **mv_retencion_cohortes**   MatView    Semanal          Salud de las generaciones de
                                                          ingreso.

  **dashboard_snapshot**      Table      Cada 15m         MRR, Alumnos activos,
                                                          Recaudación de hoy.
  -------------------------------------------------------------------------------------

**5. Categoría IV: SaaS & Observabilidad (Root SIPRA)**

Vistas exclusivas para la administración del sistema (Juan Manuel),
aisladas del acceso de las academias.

- **vw_saas_mrr:** Ingresos recurrentes reales de SIPRA basados en
  suscripciones cobradas.

- **vw_storage_drift:** Compara SUM(archivo_adjunto.file_size) vs.
  academia.storage_used_bytes para detectar discrepancias en el
  accounting de disco.

- **vw_workers_health:** Monitoreo de job_execution para detectar
  workers \"Zombies\" o con tasa de fallo superior al 5%.

**6. Reglas de Performance y Refresco (Staggered Strategy)**

1.  **Unique Identity:** Toda MATERIALIZED VIEW posee un índice único
    compuesto por (academia_id, pk_entidad) para permitir el comando
    REFRESH CONCURRENTLY.

2.  **Anti-Spike:** El worker de refresco opera de forma escalonada
    (sharding por academia_id) para evitar picos de carga en PostgreSQL.

3.  **No Logic in WHERE:** Se prohíbe el uso de AT TIME ZONE en
    cláusulas WHERE. Se utiliza la columna precomputada
    fecha_operativa_local para búsquedas indexadas.

4.  **Lazy Dashboard:** Los KPIs de la pantalla principal consumen datos
    de la tabla dashboard_snapshot. Si un usuario requiere el dato
    exacto al segundo, debe ejecutar una acción de \"Refrescar\" manual
    que dispara una RPC controlada.

**7. Reglas Arquitectónicas Congeladas (Inteligencia)**

- **Regla 1:** Analytics jamás bloquea al Ledger. La consistencia
  eventual (15 min) es aceptable para dashboards.

- **Regla 2:** Toda inconsistencia financiera detectada por las vistas
  de auditoría es **no negociable** y debe ser alertada vía
  Webhook/Pager.

- **Regla 3:** El esquema analytics es de solo lectura para las APIs
  estándar; las actualizaciones solo ocurren vía Workers o RPCs
  administrativas.

- **Regla 4:** La auditoría financiera es **Forensic-Ready**: no se
  oculta información, se categoriza el estado del dinero.

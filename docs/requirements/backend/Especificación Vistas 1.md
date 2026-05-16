# ESPECIFICACIÓN SISTEMA DE VISTAS / KPIs / ANALYTICS / AUDITORÍA --- SIPRA

**1. Filosofía Arquitectónica**

El subsistema de vistas en SIPRA:

**NO es parte del OLTP.**

Su propósito es:

✅ observabilidad\
✅ auditoría\
✅ dashboards\
✅ tendencias\
✅ inteligencia operativa\
✅ conciliación\
✅ métricas SaaS

**Principio Oficial**

El ledger vive para exactitud.\
Las vistas viven para lectura.

**2. Separación Oficial OLTP vs OLAP**

**OLTP (public)**

Responsable de:

✅ transacciones\
✅ ledger\
✅ saldos\
✅ RLS operativo\
✅ consistencia fuerte

**OLAP / Analytics (analytics)**

Responsable de:

✅ KPIs\
✅ tendencias\
✅ snapshots\
✅ materialización\
✅ agregaciones\
✅ reporting

**Regla Congelada**

Analytics jamás debe degradar operaciones financieras.

**3. Estructura Oficial de Schemas**

  -----------------------------
  **Schema**    **Uso**
  ------------- ---------------
  public        tablas
                operativas

  security      helpers RLS

  analytics     materialized
                views

  sipra_admin   métricas SaaS
                root
  -----------------------------

**4. Clasificación Oficial de Vistas**

  ---------------------------------------
  **Categoría**    **Objetivo**
  ---------------- ----------------------
  Auditoría        detectar corrupción

  Operación        bandejas/trabajo
                   diario

  Financiera       ingresos/cartera

  Analytics        tendencias/cohortes

  SaaS             métricas SIPRA

  Observabilidad   jobs/workers/storage
  ---------------------------------------

**5. REGLAS GLOBALES CONGELADAS**

**Regla 1**

Toda vista multi-tenant:\
DEBE incluir:

academia_id

**Regla 2**

Toda MATERIALIZED VIEW:\
requiere:

✅ UNIQUE INDEX\
✅ estrategia refresh\
✅ wrapper seguro

**Regla 3**

Las MATERIALIZED VIEW:

**NO heredan RLS automáticamente.**

**Regla 4**

Toda MV:\
debe exponerse mediante:

✅ VIEW wrapper\
O\
✅ RLS explícito.

**Regla 5**

Toda auditoría:\
usa únicamente:

estados contables activos

**Regla 6**

Estados:

anulado\
revertido

NO generan corrupción.

**Regla 7**

Analytics históricos:\
eventualmente migran a:

snapshot tables

**Regla 8**

Mes actual:\
puede calcularse live.

Meses cerrados:\
preferentemente snapshot.

**Regla 9**

NO usar:

AT TIME ZONE

en WHERE.

**Regla 10**

Toda vista:\
proyecta únicamente:\
columnas necesarias.

**6. VISTAS DE AUDITORÍA FINANCIERA**

**VIEW:**

**analytics.vw_auditoria_movimientos**

**Filosofía**

Detectar:

✅ fuga dinero\
✅ inflación ledger\
✅ corrupción aplicaciones

**Fórmula Oficial**

monto_total\
=\
monto_disponible\
+\
SUM(aplicaciones_activas)

**Estados excluidos**

anulado\
revertido

**Severidad**

CRÍTICA.

**Resultado esperado**

0 filas

**VIEW:**

**analytics.vw_auditoria_cargos**

**Fórmula**

monto_original\
=\
saldo_pendiente\
+\
SUM(aplicaciones_activas)

**Detecta**

✅ pagos perdidos\
✅ corrupción rollback\
✅ inflación cargo

**Severidad**

CRÍTICA.

**VIEW:**

**analytics.vw_financial_integrity_global**

**Objetivo**

Dashboard ejecutivo:\
salud financiera global.

**Métricas**

  -----------------------------------
  **Campo**               **Uso**
  ----------------------- -----------
  movimientos_corruptos   alertas

  cargos_corruptos        alertas

  tenants_afectados       impacto

  diferencia_total        severidad
  -----------------------------------

**7. VISTAS OPERATIVAS**

**VIEW:**

**public.vw_bandeja_cobranza**

**Filosofía**

Inbox operacional.

**Incluye**

✅ persona\
✅ deuda viva\
✅ días atraso\
✅ prioridad\
✅ promesa activa\
✅ sugerencias pendientes

**Fuente principal**

Pantalla home SIPRA.

**VIEW:**

**public.vw_personas_riesgo**

**Filosofía**

Detección churn.

**Variables**

✅ atraso recurrente\
✅ promesas incumplidas\
✅ pagos parciales frecuentes\
✅ baja actividad

**Output**

score_riesgo

**VIEW:**

**public.vw_grupos_activos**

**Uso**

Listados rápidos:\
miembros activos.

**Regla**

Solo:

persona_grupo.estado = activo

**8. VISTAS FINANCIERAS**

**VIEW:**

**analytics.vw_ingresos_diarios**

**Métricas**

✅ ingresos cobrados\
✅ ajustes\
✅ reversos\
✅ métodos pago

**Agrupación**

academia_id + fecha_operativa_local

**VIEW:**

**analytics.mv_cartera_vencida**

(MATERIALIZED VIEW)

**Filosofía**

Estado consolidado:\
deuda vencida.

**Buckets oficiales**

  -----------------------------
  **Bucket**   **Definición**
  ------------ ----------------
  leve         1-7

  media        8-30

  crítica      31-90

  severa       90+
  -----------------------------

**Requisitos obligatorios**

✅ UNIQUE INDEX\
✅ REFRESH CONCURRENTLY\
✅ wrapper VIEW seguro

**Wrapper oficial**

CREATE VIEW public.vw_cartera_vencida AS\
SELECT \*\
FROM analytics.mv_cartera_vencida\
WHERE academia_id = security.get_my_tenant_id();

**VIEW:**

**analytics.vw_recuperacion_cartera**

**Objetivo**

Medir:\
efectividad cobranza.

**Fórmula**

pagos posteriores a envio_sugerido

**VIEW:**

**analytics.vw_promesas_incumplidas**

**Detecta**

Personas:\
con historial:\
de incumplimiento.

**9. VISTAS NARRATIVAS**

**VIEW:**

**public.vw_timeline_persona**

**Filosofía**

Narrativa humana.

**Incluye**

✅ timeline\
✅ eventos\
✅ uploads\
✅ comunicaciones

**Regla**

NO mezclar:\
conciliación financiera pesada.

**VIEW:**

**public.vw_estado_cuenta_financiero**

**Filosofía**

Narrativa financiera ligera.

**Incluye**

✅ cargos\
✅ pagos\
✅ saldos\
✅ comprobantes adjuntos

**Regla**

Separada del timeline completo.

**10. VISTAS ANALYTICS**

**MATERIALIZED VIEW:**

**analytics.mv_retencion_personas**

**Filosofía**

Retención cohortes.

**Variables**

✅ fecha alta\
✅ última actividad\
✅ permanencia

**MATERIALIZED VIEW:**

**analytics.mv_cohortes_ingreso**

**Filosofía**

Analítica cohortes históricas.

**Ejemplo**

Personas ingresadas Enero 2026\
vs permanencia posterior

**VIEW:**

**analytics.vw_actividad_staff**

**Métricas**

✅ pagos registrados\
✅ reversos\
✅ mensajes enviados\
✅ actividad operativa

**11. VISTAS SaaS ROOT**

(Schema: sipra_admin)

**VIEW:**

**sipra_admin.vw_saas_mrr**

**Filosofía**

MRR REAL SIPRA.

NO:\
facturación academias.

**Métricas**

✅ MRR\
✅ ARR\
✅ upgrades\
✅ downgrades\
✅ churn SaaS

**VIEW:**

**sipra_admin.vw_storage_usage**

**Métricas**

✅ storage usado\
✅ cuota restante\
✅ crecimiento mensual

**VIEW:**

**sipra_admin.vw_tenants_salud**

**Detecta**

✅ academias abandonadas\
✅ riesgo churn\
✅ poco uso\
✅ alta morosidad

**Seguridad**

NO expuestas:\
a:

authenticated

**Acceso**

Solo:

✅ service role\
✅ super admin interno

**12. VISTAS OBSERVABILIDAD**

**VIEW:**

**analytics.vw_jobs_failed_recent**

**Detecta**

Jobs:

failed

últimas:\
24h.

**VIEW:**

**analytics.vw_workers_health**

**Métricas**

✅ throughput\
✅ retries\
✅ duración promedio\
✅ stuck jobs

**VIEW:**

**analytics.vw_storage_drift**

**Detecta**

Desincronización:\
DB vs Storage.

**13. DASHBOARD SNAPSHOTS**

**Tabla:**

**analytics.dashboard_snapshot**

**Filosofía**

Evitar:\
agregaciones pesadas\
en login.

**Actualización**

Workers async.

**NO usar**

Triggers financieros críticos.

**Estrategia**

Append-only snapshots.

**14. REFRESH STRATEGY**

**Regla Oficial**

SIEMPRE:

REFRESH MATERIALIZED VIEW CONCURRENTLY

**Requisito**

Toda MV:\
requiere:

UNIQUE INDEX

**Estrategia staggered**

  ------------------------------
  **Tipo**      **Frecuencia**
  ------------- ----------------
  operativas    realtime/live

  financieras   5-15 min

  analytics     nightly

  cohortes      nightly

  snapshots     mensual
  ------------------------------

**15. SNAPSHOTTING HISTÓRICO**

**Filosofía**

Histórico:\
NO debe recalcularse eternamente.

**Estrategia oficial futura**

**Datos vivos**

Mes actual.

**Datos cerrados**

Tabla snapshot immutable.

**Patrón**

snapshot_historico\
UNION ALL\
mes_actual_live

**16. SEGURIDAD Y RLS**

**Regla Oficial**

Toda VIEW pública:\
debe filtrar:

academia_id = security.get_my_tenant_id()

**Regla Oficial**

MATERIALIZED VIEW:\
jamás expuesta directamente.

**Regla Oficial**

Analytics SaaS:\
fuera de:

public

**17. PERFORMANCE**

**Regla 1**

Analytics:\
NO bloquea ledger.

**Regla 2**

Joins gigantes:\
evitarlos realtime.

**Regla 3**

Timeline:\
separado de ledger pesado.

**Regla 4**

Workers:\
procesan por chunks/cursors.

**Regla 5**

Timezone:\
precalculado.

**Regla 6**

Materialized:\
solo cuando costo lo amerite.

**18. ALERTAS Y OBSERVABILIDAD**

**Alertas críticas**

  ------------------------------
  **Evento**     **Severidad**
  -------------- ---------------
  corrupción     crítica
  ledger         

  drift storage  media

  jobs failed    media

  reversos       alta
  masivos        

  cambio owner   crítica
  ------------------------------

**Integraciones futuras**

✅ Slack\
✅ Discord\
✅ Email Ops\
✅ PagerDuty

**19. EXPORTACIÓN**

**Regla Oficial**

CSV/PDF:\
NO se generan:\
en PostgreSQL.

**Responsabilidad**

Edge Functions.

**Razón**

✅ RAM\
✅ timeouts\
✅ escalabilidad

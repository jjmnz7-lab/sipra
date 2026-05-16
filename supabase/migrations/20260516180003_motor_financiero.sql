-- Migración: 004_motor_financiero
-- Descripción: Creación de las tablas financieras (cargo, movimiento, aplicacion_movimiento) y RLS.

-- ==============================================================================
-- 1. Tabla: cargo
-- ==============================================================================
CREATE TABLE public.cargo (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id       UUID           NOT NULL REFERENCES public.academia(id),
  persona_id        UUID           NOT NULL REFERENCES public.persona(id),
  grupo_id_origen   UUID           REFERENCES public.grupo(id),
  concepto          VARCHAR(150)   NOT NULL,
  descripcion       TEXT,
  monto_original    NUMERIC(12,2)  NOT NULL,
  saldo_pendiente   NUMERIC(12,2)  NOT NULL,
  fecha_creacion    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  fecha_vencimiento DATE           NOT NULL,
  fecha_promesa     DATE,
  estado_financiero VARCHAR(20)    NOT NULL DEFAULT 'pendiente',
  origen            VARCHAR(20)    NOT NULL DEFAULT 'manual',
  metadata          JSONB          NOT NULL DEFAULT '{}',
  created_by        UUID           REFERENCES public.usuario(id),
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_cargo_monto_original  CHECK (monto_original > 0),
  CONSTRAINT chk_cargo_saldo           CHECK (saldo_pendiente >= 0),
  CONSTRAINT chk_cargo_saldo_max       CHECK (saldo_pendiente <= monto_original),
  CONSTRAINT chk_cargo_estado          CHECK (estado_financiero IN ('pendiente','parcial','vencido','liquidado','anulado')),
  CONSTRAINT chk_cargo_origen          CHECK (origen IN ('manual','grupal','automatico','ajuste')),
  CONSTRAINT chk_cargo_concepto        CHECK (char_length(trim(concepto)) > 0)
);

CREATE INDEX idx_cargo_academia_estado ON public.cargo (academia_id, estado_financiero);
CREATE INDEX idx_cargo_persona         ON public.cargo (persona_id);
CREATE INDEX idx_cargo_vencimiento     ON public.cargo (academia_id, fecha_vencimiento);
CREATE INDEX idx_cargo_promesa         ON public.cargo (academia_id, fecha_promesa);
CREATE INDEX idx_cargo_operativo       ON public.cargo (academia_id, estado_financiero, fecha_vencimiento);

ALTER TABLE public.cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY cargo_select_policy ON public.cargo
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY cargo_insert_policy ON public.cargo
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_admin_of_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY cargo_update_policy ON public.cargo
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY cargo_delete_policy ON public.cargo
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 2. Tabla: movimiento
-- ==============================================================================
CREATE TABLE public.movimiento (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id      UUID           NOT NULL REFERENCES public.academia(id),
  persona_id       UUID           NOT NULL REFERENCES public.persona(id),
  monto_total      NUMERIC(12,2)  NOT NULL,
  monto_disponible NUMERIC(12,2)  NOT NULL,
  fecha_pago       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  metodo_pago      VARCHAR(30)    NOT NULL,
  referencia       VARCHAR(100),
  estado           VARCHAR(20)    NOT NULL DEFAULT 'registrado',
  idempotency_key  VARCHAR(100)   NOT NULL,
  created_by       UUID           NOT NULL REFERENCES public.usuario(id),
  anulado_by       UUID           REFERENCES public.usuario(id),
  anulado_motivo   TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_mov_monto_total      CHECK (monto_total > 0),
  CONSTRAINT chk_mov_disponible       CHECK (monto_disponible >= 0),
  CONSTRAINT chk_mov_disponible_max   CHECK (monto_disponible <= monto_total),
  CONSTRAINT chk_mov_estado           CHECK (estado IN ('registrado', 'anulado')),
  CONSTRAINT chk_mov_metodo           CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta','deposito','otro')),
  CONSTRAINT uq_mov_idempotency       UNIQUE (academia_id, idempotency_key)
);

CREATE INDEX idx_movimiento_academia_persona ON public.movimiento (academia_id, persona_id);
CREATE INDEX idx_movimiento_fecha            ON public.movimiento (academia_id, fecha_pago);

ALTER TABLE public.movimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY movimiento_select_policy ON public.movimiento
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY movimiento_insert_policy ON public.movimiento
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_auth_user_for_tenant(academia_id) -- Staff can create
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY movimiento_update_policy ON public.movimiento
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY movimiento_delete_policy ON public.movimiento
FOR DELETE TO authenticated
USING (false);

-- ==============================================================================
-- 3. Tabla: aplicacion_movimiento
-- ==============================================================================
CREATE TABLE public.aplicacion_movimiento (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  academia_id      UUID           NOT NULL REFERENCES public.academia(id),
  movimiento_id    UUID           NOT NULL REFERENCES public.movimiento(id),
  cargo_id         UUID           NOT NULL REFERENCES public.cargo(id),
  monto_aplicado   NUMERIC(12,2)  NOT NULL,
  estado           VARCHAR(20)    NOT NULL DEFAULT 'activa',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

  CONSTRAINT chk_ap_monto  CHECK (monto_aplicado > 0),
  CONSTRAINT chk_ap_estado CHECK (estado IN ('activa', 'revertida'))
);

CREATE INDEX idx_aplicacion_movimiento ON public.aplicacion_movimiento (movimiento_id);
CREATE INDEX idx_aplicacion_cargo      ON public.aplicacion_movimiento (cargo_id);
CREATE INDEX idx_aplicacion_academia   ON public.aplicacion_movimiento (academia_id, estado);

ALTER TABLE public.aplicacion_movimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_mov_select_policy ON public.aplicacion_movimiento
FOR SELECT TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id));

CREATE POLICY app_mov_insert_policy ON public.aplicacion_movimiento
FOR INSERT TO authenticated
WITH CHECK (
  sipra_auth.is_auth_user_for_tenant(academia_id)
  AND sipra_auth.can_write_to_academia(academia_id)
);

CREATE POLICY app_mov_update_policy ON public.aplicacion_movimiento
FOR UPDATE TO authenticated
USING (sipra_auth.is_auth_user_for_tenant(academia_id))
WITH CHECK (sipra_auth.can_write_to_academia(academia_id));

CREATE POLICY app_mov_delete_policy ON public.aplicacion_movimiento
FOR DELETE TO authenticated
USING (false);

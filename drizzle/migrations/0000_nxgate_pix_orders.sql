CREATE TABLE public.pix_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_hash text NOT NULL,
 idempotency_key uuid NOT NULL UNIQUE,
 plan_id text NOT NULL,
 amount numeric(12,2) NOT NULL,
 environment text NOT NULL,
 status text NOT NULL DEFAULT 'creating',
 transaction_id text UNIQUE,
 payment_code text,
 paid_at timestamptz,
 last_checked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pix_orders TO service_role;
ALTER TABLE public.pix_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX pix_orders_session_idx ON public.pix_orders(session_hash);
COMMENT ON TABLE public.pix_orders IS 'Private server-managed guest checkout orders. No direct browser access.';
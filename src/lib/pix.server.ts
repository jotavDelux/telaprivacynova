import { getCookie, setCookie, setResponseHeader } from '@tanstack/react-start/server';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createNxGateClient, NxGateError, nxgateErrorMessage, paymentMatches } from './nxgate';
import { paymentPlans } from './payment-plans';

const inputSchema = z.object({ plan: z.enum(Object.keys(paymentPlans) as [keyof typeof paymentPlans, ...(keyof typeof paymentPlans)[]]), key: z.string().uuid() });
const lookupSchema = z.object({ orderId: z.string().uuid() });

export type PixResult = {
  ok: boolean; configured?: boolean; message?: string; newAttempt?: boolean;
  orderId?: string; paymentCode?: string | null; status?: string; environment?: string;
};

function config() {
  const baseUrl = process.env['NXGATE_BASE_URL'] || 'https://sandbox.nxgate.com.br';
  const apiKey = process.env['NXGATE_API_KEY'];
  const secret = process.env['NXGATE_WEBHOOK_SECRET'];
  const webhook = process.env['NXGATE_WEBHOOK_URL'];
  if (!apiKey || !secret || !webhook) throw new NxGateError(503, 'not_configured');
  const url = z.string().url().parse(webhook);
  if (!url.startsWith('https://') || url.length > 2048) throw new NxGateError(503, 'not_configured');
  return { client: createNxGateClient({ baseUrl, apiKey }), webhook, environment: baseUrl.includes('sandbox') ? 'sandbox' : 'live' };
}

function checkoutSession(create: boolean) {
  setResponseHeader('Cache-Control', 'no-store');
  let session = getCookie('pix_checkout');
  if (!session || !/^[a-f0-9]{64}$/.test(session)) {
    if (!create) throw new Error('Pedido não encontrado.');
    session = randomBytes(32).toString('hex');
    setCookie('pix_checkout', session, { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax', path: '/', maxAge: 86400 * 7 });
  }
  return createHash('sha256').update(session).digest('hex');
}

export function pixAvailability() {
  setResponseHeader('Cache-Control', 'no-store');
  try { const settings = config(); return { configured: true, environment: settings.environment }; }
  catch { return { configured: false, environment: 'sandbox' }; }
}

export async function createPixOrder(data: z.infer<typeof inputSchema>): Promise<PixResult> {
    try {
      const settings = config();
      const sessionHash = checkoutSession(true);
      // Privileged guest checkout is restricted by an HttpOnly capability, not user-supplied ownership.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const plan = paymentPlans[data.plan];
      const existing = await supabaseAdmin.from('pix_orders').select('*').eq('idempotency_key', data.key).eq('session_hash', sessionHash).maybeSingle();
      if (existing.error) throw new Error('Storage unavailable');
      let order = existing.data;
      if (!order) {
        const inserted = await supabaseAdmin.from('pix_orders').insert({ session_hash: sessionHash, idempotency_key: data.key, plan_id: data.plan, amount: plan.price, environment: settings.environment }).select('*').single();
        if (inserted.error || !inserted.data) throw new NxGateError(409, 'processing');
        order = inserted.data;
      }
      if (order.plan_id !== data.plan || order.environment !== settings.environment) throw new NxGateError(409, 'processing');
      if (order.transaction_id) return { ok: true, orderId: order.id, status: order.status, paymentCode: order.payment_code, environment: order.environment };
      if (order.status === 'failed') return { ok: false, message: 'A tentativa anterior falhou. Você pode tentar novamente.', newAttempt: true };
      if (Date.now() - Date.parse(order.created_at) > 240000) return { ok: false, message: 'Não foi possível recuperar esta cobrança com segurança. Não pague novamente; fale com a titular.' };
      let charge;
      try {
        charge = await settings.client.createCharge({ amount: Number(order.amount), description: `Mel Cabelinho — ${plan.label}`, orderId: order.id, webhook: settings.webhook, key: order.idempotency_key });
      } catch (error) {
        const definiteFailure = error instanceof NxGateError && [400, 401, 403, 422, 429].includes(error.status);
        if (definiteFailure) await supabaseAdmin.from('pix_orders').update({ status: 'failed' }).eq('id', order.id).eq('status', 'creating');
        return { ok: false, orderId: order.id, message: nxgateErrorMessage(error), newAttempt: definiteFailure };
      }
      const saved = await supabaseAdmin.from('pix_orders').update({ transaction_id: charge.transactionId, payment_code: charge.paymentCode, status: 'waiting' }).eq('id', order.id).eq('status', 'creating');
      if (saved.error) throw new NxGateError(503, 'uncertain');
      return { ok: true, orderId: order.id, status: 'waiting', paymentCode: charge.paymentCode, environment: order.environment };
    } catch (error) { return { ok: false, configured: !(error instanceof NxGateError && error.code === 'not_configured'), message: nxgateErrorMessage(error) }; }
  }

export async function consultPixOrder(data: z.infer<typeof lookupSchema>): Promise<PixResult> {
    try {
      const sessionHash = checkoutSession(false);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: order, error } = await supabaseAdmin.from('pix_orders').select('*').eq('id', data.orderId).eq('session_hash', sessionHash).maybeSingle();
      if (error || !order) return { ok: false, message: 'Pedido não encontrado nesta sessão.' };
      const dto = { ok: true, orderId: order.id, status: order.status, paymentCode: order.payment_code, environment: order.environment };
      if (order.status === 'paid' || !order.transaction_id) return dto;
      if (order.last_checked_at && Date.now() - Date.parse(order.last_checked_at) < 20000) return dto;
      const settings = config();
      if (settings.environment !== order.environment) throw new NxGateError(503, 'not_configured');
      await supabaseAdmin.from('pix_orders').update({ last_checked_at: new Date().toISOString() }).eq('id', order.id);
      const result = await settings.client.consult(order.transaction_id);
      const paid = paymentMatches(result, order.transaction_id, Number(order.amount));
      const code = result.payment_instruction?.pix_copy_and_paste || order.payment_code;
      const update = await supabaseAdmin.from('pix_orders').update({ status: paid ? 'paid' : 'waiting', payment_code: code, ...(paid ? { paid_at: result.paid_at } : {}) }).eq('id', order.id).neq('status', 'paid');
      if (update.error) throw new Error('Storage unavailable');
      return { ...dto, status: paid ? 'paid' : 'waiting', paymentCode: code };
    } catch (error) { return { ok: false, message: nxgateErrorMessage(error) }; }
  }
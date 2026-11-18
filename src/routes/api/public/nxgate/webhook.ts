import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { createNxGateClient, paymentMatches } from '@/lib/nxgate';

const eventSchema = z.object({
  type: z.string().max(100).optional(), status: z.string().max(50).optional(),
  data: z.object({ tx_id: z.string().min(1).max(255), magic_id: z.string().max(255).optional() }).optional(),
});

export const Route = createFileRoute('/api/public/nxgate/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const secret = process.env['NXGATE_WEBHOOK_SECRET'];
    // An unconfigured endpoint cannot authenticate any delivery. Reject it as
    // unauthorized rather than making the preview interpret it as a server crash.
    if (!secret) return new Response('Unauthorized', { status: 401 });
    if (Number(request.headers.get('content-length') || 0) > 65536) return new Response('Too large', { status: 413 });
    const raw = await request.text();
    if (raw.length > 65536) return new Response('Too large', { status: 413 });
    const { verifyNxGateSignature } = await import('@/lib/nxgate-signature.server');
    if (!verifyNxGateSignature(raw, request.headers.get('X-NXGate-Timestamp'), request.headers.get('X-NXGate-Signature'), secret)) return new Response('Unauthorized', { status: 401 });
    let event;
    try { event = eventSchema.parse(JSON.parse(raw)); } catch { return new Response('Invalid event', { status: 400 }); }
    if (event.type !== 'QR_CODE_COPY_AND_PASTE_PAID') return new Response('ok');
    if (!event.data) return new Response('Invalid event', { status: 400 });
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: order, error } = await supabaseAdmin.from('pix_orders').select('*').eq('transaction_id', event.data.tx_id).maybeSingle();
      if (error) return new Response('Unavailable', { status: 503 });
      // Early webhook can beat charge persistence. Fail visibly for manual resend; never create or release unknown orders.
      if (!order) return new Response('Order not ready', { status: 409 });
      if (order.status === 'paid') return new Response('ok');
      if (event.data.magic_id && event.data.magic_id !== order.id) return new Response('Invalid reference', { status: 400 });
      const baseUrl = process.env['NXGATE_BASE_URL'] || 'https://sandbox.nxgate.com.br';
      const environment = baseUrl.includes('sandbox') ? 'sandbox' : 'live';
      if (environment !== order.environment) return new Response('Unavailable', { status: 503 });
      const client = createNxGateClient({ baseUrl, apiKey: process.env['NXGATE_API_KEY'] || '' });
      const result = await client.consult(event.data.tx_id);
      if (!paymentMatches(result, event.data.tx_id, Number(order.amount))) return new Response('ok');
      const saved = await supabaseAdmin.from('pix_orders').update({ status: 'paid', paid_at: result.paid_at }).eq('id', order.id).neq('status', 'paid');
      return new Response(saved.error ? 'Unavailable' : 'ok', { status: saved.error ? 503 : 200 });
    } catch { return new Response('Unavailable', { status: 503 }); }
  } } },
});
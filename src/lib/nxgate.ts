import { z } from 'zod';

export class NxGateError extends Error {
  constructor(public status: number, public code: string, public retryAfter = 20) {
    super(code);
  }
}

const chargeSchema = z.object({
  status: z.literal('success'), idTransaction: z.string().min(1).max(255),
  paymentCode: z.string().max(10000).nullable().optional(),
  paymentInstruction: z.object({ type: z.string(), pixCopyAndPaste: z.string().max(10000).optional() }).passthrough().optional(),
});
const consultationSchema = z.object({
  status: z.enum(['paid', 'waiting']), transaction_id: z.string().min(1).max(255),
  currency: z.literal('BRL'), amount: z.number().finite(), payment_method: z.literal('PIX'),
  paid_at: z.string().datetime().nullable(),
  payment_instruction: z.object({ type: z.string(), pix_copy_and_paste: z.string().max(10000).optional() }).passthrough().nullable(),
});

export function nxgateErrorMessage(error: unknown) {
  if (!(error instanceof NxGateError)) return 'Não foi possível concluir agora. Tente novamente mais tarde.';
  if (error.code === 'not_configured') return 'Pix ainda não configurado. Nenhuma cobrança foi criada.';
  if (error.status === 401 || error.status === 403) return 'O Pix está temporariamente indisponível. A configuração da conta precisa ser revisada.';
  if (error.status === 409) return 'Sua cobrança ainda está sendo processada. Aguarde antes de tentar novamente.';
  if (error.status === 429) return `Aguarde ${error.retryAfter} segundos antes de consultar novamente.`;
  if (error.status === 422) return 'Não foi possível gerar esta cobrança. A conta ou os dados do pedido precisam ser revisados.';
  return 'Não foi possível confirmar agora. Não pague novamente; tente consultar mais tarde.';
}

export function paymentMatches(result: z.infer<typeof consultationSchema>, transactionId: string, amount: number) {
  return result.status === 'paid' && result.transaction_id === transactionId &&
    result.currency === 'BRL' && result.payment_method === 'PIX' &&
    Math.round(result.amount * 100) === Math.round(amount * 100) && result.paid_at !== null;
}

export function createNxGateClient(config: { baseUrl: string; apiKey: string }, transport: typeof fetch = fetch) {
  if (!['https://sandbox.nxgate.com.br', 'https://api.nxgate.com.br'].includes(config.baseUrl) || !config.apiKey) {
    throw new NxGateError(503, 'not_configured');
  }
  async function post(path: string, body: object, idempotencyKey?: string) {
    let response: Response;
    try {
      response = await transport(`${config.baseUrl}${path}`, {
        method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) },
        body: JSON.stringify({ ...body, api_key: config.apiKey }),
      });
    } catch { throw new NxGateError(503, 'uncertain'); }
    if (!response.ok) {
      // Never log response bodies: providers may echo credentials or payer data.
      const retry = Number(response.headers.get('Retry-After')) || Math.max(20, Number(response.headers.get('X-RateLimit-Reset')) - Math.floor(Date.now() / 1000));
      throw new NxGateError(response.status, 'provider_error', Math.min(3600, Number.isFinite(retry) ? retry : 20));
    }
    try {
      const result: unknown = await response.json();
      if (result && typeof result === 'object' && 'status' in result && result.status === 'error') throw new NxGateError(422, 'provider_error');
      return result;
    } catch (error) { if (error instanceof NxGateError) throw error; throw new NxGateError(503, 'uncertain'); }
  }
  return {
    async createCharge(input: { amount: number; description: string; orderId: string; webhook: string; key: string }) {
      const raw = await post('/v2/cobranca', { valor: input.amount, moeda: 'BRL', metodo: 'PIX', descricao: input.description, magic_id: input.orderId, webhook: input.webhook }, input.key);
      const parsed = chargeSchema.safeParse(raw);
      if (!parsed.success) throw new NxGateError(503, 'uncertain');
      return { transactionId: parsed.data.idTransaction, paymentCode: parsed.data.paymentCode || parsed.data.paymentInstruction?.pixCopyAndPaste || null };
    },
    async consult(transactionId: string) {
      const raw = await post('/v2/consultar', { transaction_id: transactionId });
      const parsed = consultationSchema.safeParse(raw);
      if (!parsed.success) throw new NxGateError(503, 'invalid_response');
      return parsed.data;
    },
  };
}
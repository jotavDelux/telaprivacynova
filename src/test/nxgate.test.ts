import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { createNxGateClient, NxGateError, paymentMatches } from '@/lib/nxgate';
import { verifyNxGateSignature } from '@/lib/nxgate-signature.server';

const config = { baseUrl: 'https://sandbox.nxgate.com.br', apiKey: '<TEST_PLACEHOLDER>' };
const input = { amount: 22.9, description: 'Assinatura', orderId: 'pedido-123', webhook: 'https://example.com/api/public/nxgate/webhook', key: 'ed477b41-86ec-4199-8d0a-bb077c681f91' };
const charge = { status: 'success', idTransaction: 'opaque-id', paymentCode: '000201TEST', paymentCodeBase64: 'not-an-image' };
const paid = { status: 'paid' as const, transaction_id: 'opaque-id', currency: 'BRL' as const, amount: 22.9, payment_method: 'PIX' as const, paid_at: '2026-11-18T19:00:00.000Z', payment_instruction: null };

describe('documented NxGate Pix contract', () => {
  it('posts decimal BRL price, body authentication and the same idempotency key on retries', async () => {
    const fetcher = vi.fn().mockImplementation(async () => Response.json(charge));
    const client = createNxGateClient(config, fetcher);
    expect(await client.createCharge(input)).toEqual({ transactionId: 'opaque-id', paymentCode: '000201TEST' });
    await client.createCharge(input);
    for (const [url, options] of fetcher.mock.calls) {
      expect(url).toBe('https://sandbox.nxgate.com.br/v2/cobranca');
      expect(options.method).toBe('POST');
      expect(options.headers['X-Idempotency-Key']).toBe(input.key);
      expect(JSON.parse(options.body)).toEqual({ api_key: '<TEST_PLACEHOLDER>', valor: 22.9, moeda: 'BRL', metodo: 'PIX', descricao: 'Assinatura', magic_id: 'pedido-123', webhook: input.webhook });
      expect(options.headers.Authorization).toBeUndefined();
    }
  });
  it('supports pending instruction without depending on base64', async () => {
    const client = createNxGateClient(config, vi.fn().mockResolvedValue(Response.json({ ...charge, paymentCode: null, paymentInstruction: { type: 'pendente' } })));
    expect((await client.createCharge(input)).paymentCode).toBeNull();
  });
  it.each([400, 401, 403, 404, 409, 422, 429, 500, 503])('preserves HTTP %s without leaking provider body', async (status) => {
    const client = createNxGateClient(config, vi.fn().mockResolvedValue(Response.json({ error: 'private provider data' }, { status, headers: { 'Retry-After': '60' } })));
    await expect(client.consult('opaque-id')).rejects.toMatchObject({ status, code: 'provider_error', retryAfter: 60 });
  });
  it('rejects status error inside HTTP 200', async () => {
    const client = createNxGateClient(config, vi.fn().mockResolvedValue(Response.json({ status: 'error', message: 'rejected' })));
    await expect(client.createCharge(input)).rejects.toMatchObject({ status: 422 });
  });
  it('handles network timeout as uncertain, not as a new operation', async () => {
    const client = createNxGateClient(config, vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(client.createCharge(input)).rejects.toMatchObject({ code: 'uncertain' });
  });
  it('confirms only paid with matching id, amount, currency and date', () => {
    expect(paymentMatches(paid, 'opaque-id', 22.9)).toBe(true);
    expect(paymentMatches({ ...paid, status: 'waiting' }, 'opaque-id', 22.9)).toBe(false);
    expect(paymentMatches(paid, 'other-id', 22.9)).toBe(false);
    expect(paymentMatches(paid, 'opaque-id', 32.9)).toBe(false);
    expect(paymentMatches({ ...paid, paid_at: null }, 'opaque-id', 22.9)).toBe(false);
  });
  it('consults the documented POST endpoint and returns waiting instruction', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ...paid, status: 'waiting', paid_at: null, payment_instruction: { type: 'pix', pix_copy_and_paste: '000201TEST' } }));
    const result = await createNxGateClient(config, fetcher).consult('opaque-id');
    expect(result.status).toBe('waiting');
    expect(result.payment_instruction?.pix_copy_and_paste).toBe('000201TEST');
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://sandbox.nxgate.com.br/v2/consultar');
  });
  it('rejects missing credentials and arbitrary base URLs', () => {
    expect(() => createNxGateClient({ ...config, apiKey: '' })).toThrow(NxGateError);
    expect(() => createNxGateClient({ ...config, baseUrl: 'https://example.com' })).toThrow(NxGateError);
  });
});

describe('NxGate HMAC signatures', () => {
  const raw = '{"type":"QR_CODE_COPY_AND_PASTE_PAID","data":{"tx_id":"opaque-id"}}';
  const timestamp = '1795028400';
  const secret = '<WEBHOOK_TEST_PLACEHOLDER>';
  const signature = 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  const now = Number(timestamp) * 1000;
  it('accepts signed raw body within 300 seconds', () => {
    expect(verifyNxGateSignature(raw, timestamp, signature, secret, now + 300000)).toBe(true);
  });
  it('rejects stale and future replays beyond 300 seconds', () => {
    expect(verifyNxGateSignature(raw, timestamp, signature, secret, now + 301000)).toBe(false);
    expect(verifyNxGateSignature(raw, timestamp, signature, secret, now - 301000)).toBe(false);
  });
  it('rejects missing signature, wrong secret and changed body', () => {
    expect(verifyNxGateSignature(raw, timestamp, null, secret, now)).toBe(false);
    expect(verifyNxGateSignature(raw, timestamp, signature, 'other-placeholder', now)).toBe(false);
    expect(verifyNxGateSignature(raw + ' ', timestamp, signature, secret, now)).toBe(false);
    expect(verifyNxGateSignature(raw, timestamp, 'sha256=no', secret, now)).toBe(false);
  });
});
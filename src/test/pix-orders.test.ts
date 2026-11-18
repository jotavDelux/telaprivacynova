import { beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
const mocks = vi.hoisted(() => ({ order: null as Record<string, unknown> | null, create: vi.fn(), consult: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getCookie: () => 'a'.repeat(64), setCookie: vi.fn(), setResponseHeader: vi.fn() }));
vi.mock('@/lib/nxgate', async (original) => ({ ...await original<typeof import('@/lib/nxgate')>(), createNxGateClient: () => ({ createCharge: mocks.create, consult: mocks.consult }) }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => {
  const filters: Record<string, unknown> = {};
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { filters[key] = value; return query; },
    neq: () => query,
    maybeSingle: async () => ({ data: mocks.order && Object.entries(filters).every(([k, v]) => mocks.order?.[k] === v) ? mocks.order : null, error: null }),
    insert: (data: object) => { mocks.order = { ...data, id: 'c85c3ba4-97dc-46df-bd23-511bf72c2f04', status: 'creating', created_at: new Date().toISOString(), transaction_id: null, payment_code: null }; return query; },
    single: async () => ({ data: mocks.order, error: null }),
    update: (data: object) => { if (mocks.order) Object.assign(mocks.order, data); return query; },
    then: (resolve: (value: object) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  return query;
} } }));
import { createPixOrder, consultPixOrder } from '@/lib/pix.server';
const input = { plan: 'mensal' as const, key: 'ed477b41-86ec-4199-8d0a-bb077c681f91' };
beforeEach(() => {
  vi.stubEnv('NXGATE_BASE_URL', 'https://sandbox.nxgate.com.br');
  vi.stubEnv('NXGATE_API_KEY', '<PLACEHOLDER>');
  vi.stubEnv('NXGATE_WEBHOOK_SECRET', '<PLACEHOLDER>');
  vi.stubEnv('NXGATE_WEBHOOK_URL', 'https://example.com/api/public/nxgate/webhook');
  mocks.order = null; mocks.create.mockReset(); mocks.consult.mockReset();
  mocks.create.mockResolvedValue({ transactionId: 'opaque-id', paymentCode: '000201TEST' });
});
it('derives R$22.90 and reuses a persisted charge on repeated clicks', async () => {
  const first = await createPixOrder(input);
  const second = await createPixOrder(input);
  expect(first.ok).toBe(true);
  expect(second.orderId).toBe(first.orderId);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.create.mock.calls[0]?.[0].amount).toBe(22.9);
  expect(mocks.order?.['amount']).toBe(22.9);
});
it('does not create orders without credentials', async () => {
  vi.stubEnv('NXGATE_API_KEY', '');
  expect((await createPixOrder(input)).configured).toBe(false);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.order).toBeNull();
});
it('never returns another session’s order', async () => {
  await createPixOrder(input);
  if (mocks.order) mocks.order['session_hash'] = 'other-session';
  const result = await consultPixOrder({ orderId: 'c85c3ba4-97dc-46df-bd23-511bf72c2f04' });
  expect(result.ok).toBe(false);
  expect(result.paymentCode).toBeUndefined();
  expect(mocks.consult).not.toHaveBeenCalled();
});
it('confirms paid once and does not consult again after confirmation', async () => {
  await createPixOrder(input);
  expect(mocks.order?.['session_hash']).toBe(createHash('sha256').update('a'.repeat(64)).digest('hex'));
  mocks.consult.mockResolvedValue({ status: 'paid', transaction_id: 'opaque-id', currency: 'BRL', amount: 22.9, payment_method: 'PIX', paid_at: '2026-11-18T19:00:00.000Z', payment_instruction: null });
  const orderId = 'c85c3ba4-97dc-46df-bd23-511bf72c2f04';
  expect((await consultPixOrder({ orderId })).status).toBe('paid');
  expect((await consultPixOrder({ orderId })).status).toBe('paid');
  expect(mocks.consult).toHaveBeenCalledTimes(1);
});
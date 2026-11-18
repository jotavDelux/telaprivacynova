import { afterEach, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ handler: null as ((context: { request: Request }) => Promise<Response>) | null }));
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { server: { handlers: { POST: (context: { request: Request }) => Promise<Response> } } }) => {
    captured.handler = options.server.handlers.POST;
    return options;
  },
}));
import '@/routes/api/public/nxgate/webhook';
afterEach(() => vi.unstubAllEnvs());

it('rejects an unconfigured webhook as unauthorized, not a server crash', async () => {
  vi.stubEnv('NXGATE_WEBHOOK_SECRET', '');
  if (!captured.handler) throw new Error('Webhook handler was not registered');
  const result = await captured.handler({ request: new Request('https://example.com/api/public/nxgate/webhook', { method: 'POST', body: '{}' }) });
  expect(result.status).toBe(401);
  expect(await result.text()).toBe('Unauthorized');
});

it('rejects missing signatures even when the webhook is configured', async () => {
  vi.stubEnv('NXGATE_WEBHOOK_SECRET', '<TEST_PLACEHOLDER>');
  if (!captured.handler) throw new Error('Webhook handler was not registered');
  const result = await captured.handler({ request: new Request('https://example.com/api/public/nxgate/webhook', { method: 'POST', body: '{}' }) });
  expect(result.status).toBe(401);
});
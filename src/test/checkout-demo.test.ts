import { describe, expect, it } from 'vitest';
import { demoModeFromSearch, demoPaymentCode } from '@/lib/checkout-demo';

describe('Checkout demo mode', () => {
  it('turns on only for the explicit test flag', () => {
    expect(demoModeFromSearch('teste')).toBe(true);
    expect(demoModeFromSearch('1')).toBe(true);
    expect(demoModeFromSearch(undefined)).toBe(false);
    expect(demoModeFromSearch('true ')).toBe(false);
    expect(demoModeFromSearch(true)).toBe(false);
  });

  it('builds a copy code that is clearly not payable', () => {
    const code = demoPaymentCode('mensal', 22.9);
    expect(code).toContain('DEMO');
    expect(code).toContain('2290');
    expect(code.length).toBeGreaterThan(80);
  });
});

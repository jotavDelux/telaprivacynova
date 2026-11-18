import { describe, expect, it } from 'vitest';
import { paymentPlans, resolvePaymentPlan } from '@/lib/payment-plans';

describe('Existing checkout plan prices', () => {
  it('keeps the monthly total at R$ 22,90', () => { expect(paymentPlans.mensal.price).toBe(22.9); });
  it('keeps the three-month total at R$ 32,90', () => { expect(paymentPlans.trimestral.price).toBe(32.9); });
  it('keeps the six-month total at R$ 69,90', () => { expect(paymentPlans.semestral.price).toBe(69.9); });
  it('keeps the VIP total at R$ 59,90', () => { expect(paymentPlans.vip.price).toBe(59.9); });
  it('keeps the security fee at R$ 11,98', () => { expect(paymentPlans.taxa.price).toBe(11.98); });
  it('defaults an unknown or inherited plan to monthly', () => {
    expect(resolvePaymentPlan('invalid')).toBe('mensal');
    expect(resolvePaymentPlan('toString')).toBe('mensal');
    expect(resolvePaymentPlan('semestral')).toBe('semestral');
  });
});
import { describe as d2, it as i2, expect as e2 } from 'vitest';
import { paymentPlans as pp, CONTENT_ACCESS_URL } from '@/lib/payment-plans';
d2('confirmation fee', () => {
  i2('costs R$ 9,98', () => e2(pp.confirmacao.price).toBe(9.98));
  i2('unlocks the Telegram link', () => e2(CONTENT_ACCESS_URL).toBe('https://t.me/+je4pipwbQZ03Y2Y5'));
});

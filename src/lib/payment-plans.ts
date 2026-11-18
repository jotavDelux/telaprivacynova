export const paymentPlans = {
  mensal: { label: '1 mês', price: 22.9 },
  trimestral: { label: '3 meses (30% off)', price: 32.9 },
  semestral: { label: '6 meses (40% off)', price: 69.9 },
  vip: { label: 'Super Combo VIP', price: 59.9 },
  taxa: { label: 'Taxa de segurança', price: 11.98 },
  confirmacao: { label: 'Taxa de confirmação', price: 9.98 },
  teste: { label: 'Teste (R$ 1,00)', price: 1 },
} as const;

export type PaymentPlanId = keyof typeof paymentPlans;
export function resolvePaymentPlan(value: unknown): PaymentPlanId {
  return typeof value === 'string' && Object.hasOwn(paymentPlans, value)
    ? value as PaymentPlanId
    : 'mensal';
}
export function formatPaymentPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}
export const CONTENT_ACCESS_URL = 'https://t.me/+je4pipwbQZ03Y2Y5';

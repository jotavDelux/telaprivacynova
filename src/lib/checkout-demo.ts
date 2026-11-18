// Browser-safe demo mode: lets the owner preview the checkout screens
// without creating any real charge. Never used by the payment server.

export function demoModeFromSearch(value: unknown): boolean {
  return value === 'teste' || value === '1' || value === 'true';
}

// Structurally similar to a real Pix "copia e cola" string, but it carries the
// DEMO marker and is never registered with the payment provider, so no bank
// can pay it.
export function demoPaymentCode(plan: string, amount: number): string {
  const cents = Math.round(amount * 100).toString().padStart(6, '0');
  return [
    '00020126580014br.gov.bcb.pix0136demo-mel-cabelinho',
    plan,
    cents,
    '5204000053039865802BR5915MEL CABELINHO DEMO6009SAO PAULO',
    '62290525DEMO-NAO-DEVE-SER-PAGO',
    cents,
    '6304DEMO',
  ].join('');
}

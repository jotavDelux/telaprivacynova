import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, ExternalLink, LoaderCircle, LockKeyhole, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPix, consultPix, getPixAvailability, type PixResult } from '@/lib/pix.functions';
import { CONTENT_ACCESS_URL, formatPaymentPrice, paymentPlans, type PaymentPlanId } from '@/lib/payment-plans';
import { demoPaymentCode } from '@/lib/checkout-demo';

export function PixCheckout({ plan, onStep, demo = false }: { plan: PaymentPlanId; onStep?: ((plan: PaymentPlanId) => void) | undefined; demo?: boolean }) {
  const create = useServerFn(createPix);
  const consult = useServerFn(consultPix);
  const availability = useServerFn(getPixAvailability);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [environment, setEnvironment] = useState('sandbox');
  const [result, setResult] = useState<PixResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const key = useRef<string | null>(null);
  const creating = useRef(false);
  const [demoCode, setDemoCode] = useState('');
  const [demoPaid, setDemoPaid] = useState(false);

  useEffect(() => {
    if (!demo) return;
    setDemoCode(demoPaymentCode(plan, paymentPlans[plan].price));
    setDemoPaid(false);
  }, [demo, plan]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    availability().then(data => { if (active) { setConfigured(data.configured); setEnvironment(data.environment); } }).catch(() => { if (active) setConfigured(false); });
    // Session storage holds only an opaque order reference, never a credential.
    try {
    const stored = sessionStorage.getItem(`pix-order-${plan}`);
    if (stored) {
      const record: unknown = JSON.parse(stored);
      if (record && typeof record === 'object' && 'key' in record && typeof record.key === 'string') key.current = record.key;
      if (record && typeof record === 'object' && 'orderId' in record && typeof record.orderId === 'string') {
        consult({ data: { orderId: record.orderId } }).then(data => { if (active) { setResult(data); setMessage(data.message || ''); } }).catch(() => {});
      }
    }
    } catch { /* An unavailable or invalid local reference must not prevent checkout. */ }
    return () => { active = false; };
  }, [plan, availability, consult]);

  useEffect(() => {
    if (!result?.orderId || result.status !== 'waiting') return;
    const orderId = result.orderId;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    async function poll() {
      try {
        const data = await consult({ data: { orderId } });
        if (!active) return;
        if (data.ok) setResult(data);
        setMessage(data.message || '');
        if (data.status === 'paid') return;
      } catch { if (active) setMessage('Não foi possível consultar agora. Não pague novamente.'); }
      if (active && ++count < 45) timer = setTimeout(poll, 20000);
    }
    timer = setTimeout(poll, 20000);
    return () => { active = false; clearTimeout(timer); };
  }, [result?.orderId, result?.status, consult]);

  async function generate() {
    if (creating.current) return;
    creating.current = true;
    setBusy(true); setMessage('');
    if (!key.current || result?.newAttempt) key.current = crypto.randomUUID();
    const operationKey = key.current;
    try {
      sessionStorage.setItem(`pix-order-${plan}`, JSON.stringify({ key: operationKey }));
      const data = await create({ data: { plan, key: operationKey } });
      setResult(data); setMessage(data.message || '');
      if (data.orderId) sessionStorage.setItem(`pix-order-${plan}`, JSON.stringify({ key: operationKey, orderId: data.orderId }));
    } catch { setMessage('Não foi possível recuperar a resposta. Tente novamente para recuperar a mesma cobrança.'); }
    finally { setBusy(false); creating.current = false; }
  }
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!configured || autoStarted.current || result?.paymentCode || result?.status === 'paid') return;
    autoStarted.current = true;
    void generate();
  });
  async function refresh() {
    if (!result?.orderId || busy) return;
    setBusy(true);
    try { const data = await consult({ data: { orderId: result.orderId } }); if (data.ok) setResult(data); setMessage(data.message || ''); }
    catch { setMessage('Não foi possível consultar agora. Não pague novamente.'); }
    finally { setBusy(false); }
  }
  async function copy(code: string) {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); }
    catch { setMessage('Não foi possível copiar. Selecione o código Pix e copie manualmente.'); }
  }

  const paid = demoPaid || result?.status === 'paid';
  const next: PaymentPlanId | null = plan === 'taxa' ? 'confirmacao' : plan === 'confirmacao' ? null : 'taxa';
  useEffect(() => { if (paid && next) onStep?.(next); }, [paid, next, onStep]);

  if (paid) {
    if (!next) return <div className="checkout-confirmed" role="status"><Check /><h2>Pagamento confirmado</h2><p>Tudo certo! Seu acesso está liberado.</p>
      <Button variant="original" size="original" className="checkout-method checkout-cta" asChild><a href={CONTENT_ACCESS_URL} target="_blank" rel="noopener noreferrer"><ExternalLink />Acessar conteúdo</a></Button></div>;
    return <FeeStep plan={next} paidLabel={plan === 'taxa' ? 'Sua taxa de segurança foi recebida.' : 'Seu pagamento da assinatura foi recebido.'} onStep={onStep} demo={demo} />;
  }
  if (demo) {
    const code = demoCode || demoPaymentCode(plan, paymentPlans[plan].price);
    return <>
      <p className="checkout-demo-note" role="status">Modo de teste — nenhuma cobrança real é criada</p>
      <div className="checkout-qr checkout-qr-ready" aria-label="QR Code Pix de demonstração">
        <QRCodeSVG value={code} size={220} marginSize={2} title="QR Code do pagamento Pix (demonstração)" />
      </div>
      <div className="checkout-pix-row"><input aria-label="Código Pix copia e cola" value={code} readOnly /><Button variant="original" size="original" className="checkout-pix-copy" onClick={() => copy(code)}><Copy />{copied ? 'Copiado' : 'Copiar Pix'}</Button></div>
      <Button variant="original" size="original" className="checkout-method checkout-cta" onClick={() => setDemoPaid(true)}><Check />Simular pagamento</Button>
      <p className="checkout-payment-status" role="status"><LockKeyhole />{message || 'Aguardando confirmação do pagamento'}</p>
    </>;
  }
  return <>
    {environment === 'sandbox' && configured && <p className="checkout-payment-status">Ambiente de teste — sem cobrança real</p>}
    <div className={`checkout-qr${result?.paymentCode ? ' checkout-qr-ready' : ''}`} aria-label={result?.paymentCode ? 'QR Code Pix' : 'Pagamento Pix'}>
      {result?.paymentCode ? <QRCodeSVG value={result.paymentCode} size={220} marginSize={2} title="QR Code do pagamento Pix" /> : <><QrCode aria-hidden="true" /><p>{configured === false ? 'Pix ainda não configurado' : busy ? 'Gerando seu Pix…' : result?.status === 'waiting' ? 'Aguardando código Pix' : 'Pagamento por Pix'}</p></>}
    </div>
    {result?.paymentCode ? <>
      <div className="checkout-pix-row"><input aria-label="Código Pix copia e cola" value={result.paymentCode} readOnly /><Button variant="original" size="original" className="checkout-pix-copy" onClick={() => copy(result.paymentCode ?? '')}><Copy />{copied ? 'Copiado' : 'Copiar Pix'}</Button></div>
      <Button variant="original" size="original" className="checkout-method checkout-method-card" disabled={busy} onClick={refresh}><RefreshCw />Verificar pagamento</Button>
    </> : <Button variant="original" size="original" className="checkout-method checkout-pix-generate" disabled={!configured || busy} onClick={generate}>{busy ? <LoaderCircle className="animate-spin" /> : <QrCode />}{busy ? 'Gerando Pix…' : result?.orderId && !result.newAttempt ? 'Recuperar cobrança' : 'Gerar Pix'}</Button>}
    <p className="checkout-payment-status" role="status"><LockKeyhole />{message || (configured === false ? 'Nenhuma cobrança foi criada' : result?.status === 'waiting' ? 'Aguardando confirmação do pagamento' : 'Pagamento seguro por Pix')}</p>
  </>;
}

const feeNotes: Partial<Record<PaymentPlanId, string>> = {
  taxa: 'Cobrança única de verificação para proteger a sua conta e liberar o acesso com segurança.',
  confirmacao: 'Cobrança única para confirmar seus dados e liberar o acesso ao conteúdo.',
};

function FeeStep({ plan, paidLabel, onStep, demo = false }: { plan: PaymentPlanId; paidLabel: string; onStep?: ((plan: PaymentPlanId) => void) | undefined; demo?: boolean }) {
  const [paying, setPaying] = useState(false);
  const fee = paymentPlans[plan];
  if (paying) return <PixCheckout plan={plan} onStep={onStep} demo={demo} />;
  return <>
    <div className="checkout-confirmed" role="status"><Check /><h2>Pagamento confirmado</h2><p>{paidLabel}</p></div>
    <div className="checkout-fee">
      <h3>{fee.label}</h3>
      <p className="checkout-fee-price">{formatPaymentPrice(fee.price)}</p>
      <p className="checkout-fee-note">{feeNotes[plan]}</p>
      <Button variant="original" size="original" className="checkout-method checkout-cta" onClick={() => setPaying(true)}><ShieldCheck />Pagar {fee.label.toLowerCase()}</Button>
    </div>
  </>;
}

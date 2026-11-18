import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, X } from 'lucide-react';
import { PixCheckout } from '@/components/pix-checkout';
import { Button } from '@/components/ui/button';
import coverAsset from '@/assets/FOTODECOSTA.jpeg.asset.json';
import avatarAsset from '@/assets/fotoperfil.jpg.asset.json';
import { formatPaymentPrice, paymentPlans, resolvePaymentPlan, type PaymentPlanId } from '@/lib/payment-plans';
import { demoModeFromSearch } from '@/lib/checkout-demo';
import { photoSource } from '@/lib/photo-swap';

// ─── TROQUE AS FOTOS AQUI ──────────────────────────────────────────────
// As fotos estão na pasta public/: banner.jpg (faixa do topo) e
// perfil.jpg (foto redonda). Para trocar, substitua o arquivo na pasta
// public/ mantendo o mesmo nome — pronto, nada mais a fazer.
// Ou cole aqui o endereço (URL) de outra imagem entre as aspas.
const BANNER_URL = "banner.jpg";
const PERFIL_URL = "perfil.jpg";
// ───────────────────────────────────────────────────────────────────────
const cover = photoSource(BANNER_URL, coverAsset);
const avatar = photoSource(PERFIL_URL, avatarAsset);

export const Route = createFileRoute('/pagamento')({
  validateSearch: (search: Record<string, unknown>): { plano: PaymentPlanId; modo?: string } => ({
    plano: resolvePaymentPlan(search['plano']),
    ...(typeof search['modo'] === 'string' ? { modo: search['modo'] } : {}),
  }),
  head: () => ({ meta: [
    { title: 'Pagamento | Mel Cabelinho' },
    { name: 'description', content: 'Confira seu plano e as formas de pagamento para Mel Cabelinho.' },
    { property: 'og:title', content: 'Pagamento | Mel Cabelinho' },
    { property: 'og:description', content: 'Confira seu plano e as formas de pagamento para Mel Cabelinho.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: PaymentPage,
});

function PaymentPage() {
  const { plano, modo } = Route.useSearch();
  const demo = demoModeFromSearch(modo);
  const plan = paymentPlans[plano];
  const [step, setStep] = useState<PaymentPlanId>(plano);
  const feeStep = step !== plano;
  const shown = feeStep ? paymentPlans[step] : plan;
  return (
    <main className="checkout-stage">
      <section className="checkout-sheet" aria-label="Pagamento da assinatura">
        <img className="checkout-cover" src={cover.url} alt="Capa de Mel Cabelinho" />
        <Button variant="original" size="original" className="checkout-close" asChild>
          <Link to="/" aria-label="Fechar pagamento" title="Fechar pagamento"><X /></Link>
        </Button>
        <div className="checkout-content">
          <header className="checkout-identity">
            <img className="checkout-avatar" src={avatar.url} alt="Mel Cabelinho" />
            <div><h1>Mel Cabelinho</h1><p className="checkout-username">@mel.cabelinho</p></div>
          </header>
          {!feeStep && <section className="checkout-benefits" aria-labelledby="benefits-title">
            <h2 id="benefits-title">Benefícios exclusivos</h2>
            <ul><li><Check />Acesso ao conteúdo</li><li><Check />Conteúdos exclusivos</li><li><Check />Sem renovação automática</li></ul>
          </section>}
          <div className="checkout-total"><strong className="checkout-price">{formatPaymentPrice(shown.price)}</strong><span className="checkout-plan">{shown.label}</span></div>
          <h2 className="checkout-method-title">Formas de pagamento</h2>
          <PixCheckout key={plano} plan={plano} onStep={setStep} demo={demo} />
        </div>
      </section>
    </main>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import coverAsset from "@/assets/FOTODECOSTA.jpeg.asset.json";
import avatarAsset from "@/assets/fotoperfil.jpg.asset.json";
import { mediaForFilter } from "@/lib/profile-media";
import { photoSource } from "@/lib/photo-swap";

// ─── TROQUE AS FOTOS AQUI ──────────────────────────────────────────────
// As fotos estão na pasta public/: banner.jpg (faixa do topo) e
// perfil.jpg (foto redonda). Para trocar, substitua o arquivo na pasta
// public/ mantendo o mesmo nome — pronto, nada mais a fazer.
// Ou cole aqui o endereço (URL) de outra imagem entre as aspas.
const BANNER_URL = "banner.png";
const PERFIL_URL = "perfil.jpg";
// ───────────────────────────────────────────────────────────────────────
const cover = photoSource(BANNER_URL, coverAsset);
const avatar = photoSource(PERFIL_URL, avatarAsset);

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Mel Cabelinho | Privacy" },
    { name: "description", content: "Perfil e assinaturas de Mel Cabelinho na Privacy." },
    { property: "og:title", content: "Mel Cabelinho | Privacy" },
    { property: "og:description", content: "Perfil e assinaturas de Mel Cabelinho na Privacy." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});
function LockedArt() { return <><svg className="bubble-outline" viewBox="0 0 1446 1262" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M530,1320 L561,1205 A694,694 0 1 0 51.6,710 L214,1320" /></svg><svg className="lock-icon" viewBox="0 0 86 99" aria-hidden="true"><path d="M20.5,40 V24.75 A22,22 0 0 1 64.5,24.75 V40" /><rect x="2.75" y="42.75" width="80.5" height="50.5" rx="8" /><path className="keyhole" d="M42.5,59.5 V76.5" /></svg></>; }
function Index() {
 const [tab, setTab] = useState("posts");
 const [filter, setFilter] = useState("all");
 const dialog = useRef<HTMLDialogElement>(null);
 const dialogContent = useRef<HTMLDivElement>(null);
 const visibleMedia = mediaForFilter(filter);
 function switchTab(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const next = tab === "posts" ? "media" : "posts";
  setTab(next); document.getElementById(`${next}-tab`)?.focus();
 }
 function openPost() {
  const post = document.querySelector("#posts-panel .post");
  if (!post || !dialog.current || !dialogContent.current) return;
  dialogContent.current.replaceChildren(post.cloneNode(true));
  dialog.current.showModal();
 }
 return <div className="profile-site">

<nav className="top-nav">
<h1 className="logo">privacy<span>.</span></h1>
</nav>


<main className="container">
<section className="profile-card">
<div className="cover-image">
<img src={cover.url}/>
</div>
<div className="profile-header">
<div className="avatar-container">
<img alt="Foto de perfil" className="profile-photo" src={avatar.url}/>
</div>
<div className="profile-stats">
<span><i className="fa-regular fa-image"></i> 250</span>
<span><i className="fa-solid fa-video"></i> 42</span>
<span><i className="fa-solid fa-microphone"></i> 36</span>
<span><i className="fa-regular fa-heart"></i> 14.9K</span>
</div>
</div>
<div className="profile-info">
<h2 className="display-name">Mel Cabelinho <i className="fa-solid fa-circle-check verified"></i></h2>
<p className="username">@mel.cabelinho</p>
<p className="bio">
<span className="read-more"></span>
</p>
<div className="social-container">
<a className="instagram-link" href="https://www.instagram.com/mel.cabelinho?utm_source=ig_web_button_share_sheet&amp;hvrq=ZDNlZDc0MzIxNw==" rel="noopener noreferrer" target="_blank">
<i className="fa-brands fa-instagram"></i>
</a>
</div>
</div>
<div className="subscription-box">
<p className="section-label">Assinaturas</p>
<Button variant="original" size="original" asChild><Link className="plan-btn vibrant-gradient" to="/pagamento" search={{ plano: "mensal" }}>
<span>1 mês</span>
<span>R$ 22,90</span>
</Link></Button>
<div className="promo-header">
<p className="section-label">Promoções</p>
<i className="fa-solid fa-chevron-up"></i>
</div>
<Button variant="original" size="original" asChild><Link className="plan-btn vibrant-gradient" to="/pagamento" search={{ plano: "trimestral" }}>
<span>3 meses (30% off)</span>
<span>R$ 32,90</span>
</Link></Button>
<Button variant="original" size="original" asChild><Link className="plan-btn vibrant-gradient" to="/pagamento" search={{ plano: "semestral" }}>
<span>6 meses (40% off)</span>
<span>R$ 69,90</span>
</Link></Button>
</div>
</section>
<div aria-label="Conteúdo do perfil" className="tabs-nav" role="tablist">
<Button variant="original" size="original" aria-controls="posts-panel" aria-selected={tab === "posts"} className={`tab ${tab === "posts" ? "active" : ""}`} data-tab="posts" onClick={() => setTab("posts")} onKeyDown={switchTab} id="posts-tab" role="tab" type="button"><i className="fa-solid fa-mobile-screen"></i> 50 Postagens</Button>
<Button variant="original" size="original" aria-controls="media-panel" aria-selected={tab === "media"} className={`tab ${tab === "media" ? "active" : ""}`} data-tab="media" onClick={() => setTab("media")} onKeyDown={switchTab} id="media-tab" role="tab" tabIndex={tab === "media" ? 0 : -1} type="button"><i className="fa-regular fa-folder-open"></i> 50 Mídias</Button>
</div>
<div aria-labelledby="posts-tab" className="tab-panel" id="posts-panel" hidden={tab !== "posts"} role="tabpanel">
<article className="post">
<div className="post-user-info">
<img className="post-avatar" src={avatar.url}/>
<div className="post-user-text">
<p className="post-name">Mel Cabelinho <i className="fa-solid fa-circle-check verified"></i></p>
<p className="post-username">@mel.cabelinho</p>
</div>
<i className="fa-solid fa-ellipsis-vertical post-more"></i>
</div>
<div aria-label="Abrir postagem em destaque" onClick={openPost} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPost(); } }} className="feed-media-content" role="button" tabIndex={0}>
<svg aria-hidden="true" className="bubble-outline" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1446 1262">
<path d="M530,1320 L561,1205 A694,694 0 1 0 51.6,710 L214,1320"></path>
</svg>
<svg aria-label="Conteúdo bloqueado" className="lock-icon" role="img" viewBox="0 0 86 99">
<path d="M20.5,40 V24.75 A22,22 0 0 1 64.5,24.75 V40"></path>
<rect height="50.5" rx="8" width="80.5" x="2.75" y="42.75"></rect>
<path className="keyhole" d="M42.5,59.5 V76.5"></path>
</svg>
<div className="lock-stats">
<span>
<svg aria-hidden="true" viewBox="0 0 24 24"><rect height="15" rx="3" width="19" x="2.5" y="4.5"></rect><circle cx="8" cy="9.5" r="1.6"></circle><path d="M3.5 16.5 9 11l4.5 4.5 3-2.5 4 3.5"></path></svg>
                        133
                    </span>
<span>
<svg aria-hidden="true" viewBox="0 0 24 24"><rect height="15" rx="3" width="19" x="2.5" y="4.5"></rect><path d="M10 9.5 15 12l-5 2.5z"></path></svg>
                        38
                    </span>
<span>
<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20 4.6 12.9C2.9 11.2 2.9 8.3 4.6 6.6s4.4-1.7 6.1 0l1.3 1.3 1.3-1.3c1.7-1.7 4.4-1.7 6.1 0s1.7 4.6 0 6.3z"></path></svg>
                        2.8K
                    </span>
</div>
</div>
<div className="post-actions">
<div className="left-actions">
<i className="fa-regular fa-heart"></i>
<i className="fa-regular fa-comment"></i>
<span className="tip-icon">$</span>
</div>
<i className="fa-regular fa-bookmark"></i>
</div>
</article>
</div>
<section aria-labelledby="media-tab" className="tab-panel media-gallery" hidden={tab !== "media"} id="media-panel" role="tabpanel">
<div aria-label="Filtrar mídias" className="media-filters">
<Button variant="original" size="original" aria-pressed={filter === "all"} className={`media-filter ${filter === "all" ? "active" : ""}`} data-filter="all" onClick={() => setFilter("all")} type="button">Todos</Button>
<Button variant="original" size="original" aria-pressed={filter === "photos"} className={`media-filter ${filter === "photos" ? "active" : ""}`} data-filter="photos" onClick={() => setFilter("photos")} type="button">Fotos</Button>
<Button variant="original" size="original" aria-pressed={filter === "videos"} className={`media-filter ${filter === "videos" ? "active" : ""}`} data-filter="videos" onClick={() => setFilter("videos")} type="button">Vídeos</Button>
<Button variant="original" size="original" aria-pressed={filter === "paid"} className={`media-filter ${filter === "paid" ? "active" : ""}`} data-filter="paid" onClick={() => setFilter("paid")} type="button">Pagos</Button>
</div>
<div className="media-grid" id="media-grid">{visibleMedia.map(item => <div key={item.index} className="media-tile" role="img" aria-label={`${item.kind === "videos" ? "Vídeo" : "Foto"} bloqueado ${item.index + 1}`}><LockedArt /></div>)}</div>
</section>
<section aria-labelledby="vip-combo-title" className="vip-combo">
<h2 id="vip-combo-title">🔥 Super Combo VIP Exclusivo</h2>
<p className="vip-combo-description">Tenha acesso completo e irrestrito a todos os meus conteúdos</p>
<ul className="vip-benefits">
<li>Acesso Vitalício ao meu Privacy VIP</li>
<li>Entrada no Grupo VIP Secreto no Telegram</li>
<li>Uma chamada de vídeo exclusiva comigo</li>
<li>Meu número pessoal de WhatsApp</li>
<li>Pedidos de vídeos e fotos personalizadas por mim</li>
</ul>
<Button variant="original" size="original" className="vip-combo-button" asChild><Link to="/pagamento" search={{ plano: "vip" }}>🔥 QUERO O SUPER COMBO <strong>R$ 59,90</strong></Link></Button>
</section>
<section aria-labelledby="faq-title" className="faq-section">
<h2 id="faq-title">Perguntas Frequentes</h2>
<details className="faq-item">
<summary>É sigiloso? Vai aparecer na fatura?</summary>
<p>Sim, 100% sigiloso e discreto. Cobrança neutra sem qualquer menção a nomes adultos ou modelos.</p>
</details>
<details className="faq-item">
<summary>Quando tenho acesso depois do pagamento?</summary>
<p>O acesso é liberado instantaneamente! Assim que o Pix é detectado (em média 5 a 10 segundos), você é redirecionado para a área VIP.</p>
</details>
<details className="faq-item">
<summary>Posso cancelar quando quiser?</summary>
<p>Sim, todos os pagamentos são pontuais sem renovações automáticas inesperadas. Você renova apenas se quiser.</p>
</details>
<details className="faq-item">
<summary>Tem garantia ou reembolso?</summary>
<p>Sim! Garantia total incondicional de 7 dias com devolução direta caso não goste.</p>
</details>
</section>
</main>





<dialog ref={dialog} className="post-dialog" aria-label="Postagem em destaque" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}><Button variant="original" size="original" className="post-dialog-close" aria-label="Fechar postagem" onClick={() => dialog.current?.close()}><i className="fa-solid fa-xmark" /></Button><div ref={dialogContent} /></dialog></div>;
}

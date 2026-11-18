COMO TROCAR AS FOTOS DO SITE
============================

As fotos ficam na pasta "public":

  public/banner.jpg  -> faixa do topo (perfil E telas de pagamento)
  public/perfil.jpg  -> foto redonda do perfil

PARA TROCAR:
1. Escolha a foto nova no seu computador.
2. Renomeie ela para "banner.jpg" (ou "perfil.jpg").
3. Copie para dentro da pasta "public", substituindo a antiga.
4. Pronto. Na próxima publicação do site a foto nova aparece.

DICAS:
- O banner tem 130px de altura e a largura toda, cortado pelo meio.
  Foto horizontal e larga aparece inteira; vertical perde as bordas.
- A foto de perfil é redonda: o centro da imagem é o que aparece.

SE PREFERIR USAR UM LINK DE IMAGEM:
- Abra src/routes/index.tsx e src/routes/pagamento.tsx
- No bloco "TROQUE AS FOTOS AQUI", troque "banner.jpg" pelo endereço
  completo da imagem, ex.: "https://exemplo.com/minha-foto.jpg"

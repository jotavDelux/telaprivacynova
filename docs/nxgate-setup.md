# NxGate Pix — configuração

Documentação consultada: https://nxgate.com.br/doc/llms.txt e https://nxgate.com.br/doc/llms-full.txt.

Não cole credenciais no chat ou em arquivos. Configure apenas no armazenamento seguro de segredos do Lovable Cloud:

## Estado atual

- `NXGATE_BASE_URL` agora aponta para produção (`https://api.nxgate.com.br`): Pix gerados cobram de verdade. `NXGATE_WEBHOOK_URL` ainda é o endereço da prévia; trocar após publicar.
- `NXGATE_API_KEY` e `NXGATE_WEBHOOK_SECRET` foram inseridas pela titular no formulário seguro de **Configurações do projeto → Secrets**. Os valores não passaram pelo chat nem foram gravados em arquivo.
- Com as quatro variáveis presentes, o botão Gerar Pix fica habilitado.
- **Verificado:** a NxGate recusou a cobrança com `401 Chave de producao nao funciona no sandbox: use a chave de teste (nxg_test_...)`. A chave salva é de produção, mas `NXGATE_BASE_URL` aponta para o sandbox. Isso não indica falha de código: o pedido foi marcado como falho e nenhuma cobrança foi criada.
- Para corrigir, escolha **uma** das opções e mantenha as duas chaves coerentes com ela:
  - Teste: cole em `NXGATE_API_KEY` a chave de teste (prefixo `nxg_test_`) gerada em **Painel → API → Sandbox**, e use a mesma chave em `NXGATE_WEBHOOK_SECRET`.
  - Produção: troque `NXGATE_BASE_URL` para `https://api.nxgate.com.br`, `NXGATE_WEBHOOK_URL` para a URL publicada e `NXGATE_WEBHOOK_SECRET` pelo segredo HMAC da conta, junto com a chave de produção já salva.

## Ativar com segurança

1. Na NxGate, abra **Painel → API → Sandbox** e gere a chave de teste com acesso a cobrança e consulta (cashin).
2. No Lovable, abra **Configurações do projeto → Secrets**. Adicione `NXGATE_API_KEY` com a chave de teste diretamente nesse armazenamento seguro, nunca no chat.
3. Adicione `NXGATE_WEBHOOK_SECRET` no mesmo local. **No sandbox, use a mesma chave de teste**, conforme a documentação oficial. Em produção, use o segredo HMAC de **Painel → API**; quando não estiver disponível, a documentação indica a API key Interna da conta.
4. Mantenha as duas variáveis de endereço já configuradas para testes. A URL de retorno precisa estar publicamente acessível à NxGate. Um POST sem assinatura deve ser recusado com 401; isso é esperado e não indica que o Pix esteja quebrado.
5. Reabra a tela de assinatura na prévia. Com a configuração completa, deve aparecer “Ambiente de teste — sem cobrança real” e o botão Gerar Pix deve estar habilitado.
6. Realize o teste abaixo antes de mudar para produção. Ter todas as variáveis preenchidas não prova que a chave é válida: isso só será confirmado pela resposta da NxGate.

As alterações de segredos ficam disponíveis na prévia imediatamente; o site publicado precisa ser publicado novamente para receber a configuração atualizada.

| Variável do servidor | Configuração |
| --- | --- |
| NXGATE_BASE_URL | `https://sandbox.nxgate.com.br` para testes; `https://api.nxgate.com.br` para produção |
| NXGATE_API_KEY | Chave com escopo cashin, obtida no painel NxGate → API (exemplo: `<CHAVE_DA_CONTA>`) |
| NXGATE_WEBHOOK_SECRET | Segredo HMAC do painel → API; no sandbox, a própria chave de teste |
| NXGATE_WEBHOOK_URL | `https://project--c202dca5-2c02-4818-ad5d-96385356de0c.lovable.app/api/public/nxgate/webhook` após publicar |

Para o site publicado, publique antes de usar a URL de produção acima. O ambiente de teste está configurado para `https://project--c202dca5-2c02-4818-ad5d-96385356de0c-dev.lovable.app/api/public/nxgate/webhook`. Verifique que a URL recebe os POSTs da NxGate sem exigir login do visitante; a assinatura continua obrigatória.

O QR é gerado a partir de paymentCode, não de paymentCodeBase64. Os valores são definidos pelo catálogo no servidor. Nenhuma chave vai ao navegador. Os pedidos são privados e identificados por uma sessão de checkout HttpOnly. Os códigos não são lançados em logs.

O Pix não tem renovação automática. A confirmação registra o pedido pago; não desbloqueia uma área de conteúdo ainda inexistente.

## Teste com a NxGate

1. Configure URL e chave de sandbox, além do HMAC; abra um plano e clique em Gerar Pix.
2. Simule o pagamento no sandbox com `POST /v2/sandbox/simular` e JSON `{"api_key":"<CHAVE_DE_TESTE>","transaction_id":"<ID_DA_TRANSACAO>","resultado":"pago"}` em ferramenta segura, nunca no navegador público.
3. Confirme a consulta em `/v2/consultar` e o pedido pago na tela. Verifique também waiting e reenvio manual do webhook.
4. Troque URL, chave e HMAC juntos para produção, somente após o teste. Não há cobrança real sem configuração.

Webhooks são autenticados com HMAC-SHA256 de `timestamp.corpo-bruto`, tolerância de 300 segundos; confirmações exigem consulta paid com ID, BRL, PIX e valor exatos. Reenvios não liberam o pedido novamente. Não há webhook de estorno/MED: nenhuma reversão ou reembolso automático foi implementado.

Após timeout, a mesma operação pode ser consultada/repetida somente dentro da janela de idempotência documentada (5 minutos); depois disso não criaremos outra cobrança automaticamente. Cobranças com falha definitiva podem ser tentadas com uma nova operação. Cartão e Apple Pay não fazem parte desta integração.

## Passar para produção

1. Termine o teste de QR Code, copia e cola, pagamento confirmado e reenvio manual de webhook.
2. Em **Configurações do projeto → Secrets**, altere `NXGATE_BASE_URL` para `https://api.nxgate.com.br`, substitua `NXGATE_API_KEY` pela chave de produção e `NXGATE_WEBHOOK_SECRET` pelo segredo HMAC da conta.
3. Altere `NXGATE_WEBHOOK_URL` para a URL estável publicada indicada na tabela e publique novamente. Não misture chave de teste com produção: a NxGate retorna 401.
4. Comece um pedido novo. Pedidos de teste não são reutilizados em produção.

## Modo de demonstração

Para conferir as telas sem cobrar, abra `https://.../pagamento?plano=mensal&modo=teste`.
A tela mostra o valor, o QR Code e o copia e cola com o rótulo "Modo de teste", e o botão
**Simular pagamento** avança para a taxa de segurança (R$ 11,98), depois para a taxa de
confirmação (R$ 9,98) e por fim para o botão **Acessar conteúdo**.

- Nenhuma chamada é feita ao provedor nem ao banco nesse modo: nenhuma cobrança, pedido ou
  liberação real acontece.
- O código Pix exibido contém a marca `DEMO` e não é registrável, então nenhum banco o paga.
- Sem `modo=teste` o checkout continua cobrando de verdade; a flag não altera o servidor.

## O que não fazer
- Não use nomes iniciados por `VITE_` para credenciais NxGate: eles são enviados ao navegador.
- Não coloque as credenciais em `.env` versionado, JavaScript, campos da página, screenshots ou mensagens.
- Não gere um segredo aleatório substituto para o HMAC da NxGate; o valor precisa corresponder ao do provedor.
- Não compartilhe valores para depuração. Confira somente se as variáveis existem; para substituir uma chave, reentre o valor no armazenamento seguro.
- Não desbloqueie pedidos com um webhook isolado: a confirmação também exige consulta com status paid, ID e valor exatos.
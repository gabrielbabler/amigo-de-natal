# Amigo de Natal — Checklist para Produção (`amigodenatal.com.br`)

Guia passo a passo para colocar o **Amigo de Natal** (100% gratuito) no ar no seu VPS com Coolify, configurar afiliados (Amazon, Mercado Livre e Shopee) e validar tudo antes de divulgar.

---

## 1. Infraestrutura no VPS (Coolify + PostgreSQL)

- [X] **Criar banco PostgreSQL no Coolify:**
  - Crie um serviço **PostgreSQL 18** (ou 16+) no mesmo projeto do Coolify.
  - Copie a `DATABASE_URL` interna/externa gerada pelo Coolify.
- [ ] **Configurar o App Next.js no Coolify:**
  - Conecte o repositório GitHub (`gabrielbabler/amigo-de-natal`, branch `main`).
  - Selecione build via **`Dockerfile`** (porta `3000`).
  - Aponte o domínio `amigodenatal.com.br` (e `www.amigodenatal.com.br`) no DNS (Registro.br / Cloudflare) para o IP do VPS e ative **HTTPS (Let's Encrypt)** no Coolify.
- [ ] **Rodar as migrations do banco:**
  - No terminal do container no Coolify (ou apontando seu terminal local para a `DATABASE_URL` de produção), execute:
    ```bash
    npm run db:migrate
    ```
  - Verifique se `/api/health` responde `{"ok":true,"status":"healthy"}`.
- [ ] **Agendar limpeza automática pós-Ano Novo (LGPD):**
  - No Coolify, crie um **Scheduled Task (Cron)** diário (ex: `0 4 * * *`) chamando:
    ```bash
    curl -X POST https://amigodenatal.com.br/api/cron/cleanup -H "Authorization: Bearer SEU_CRON_SECRET"
    ```

---

## 2. Variáveis de Ambiente de Produção

Configure todas as variáveis abaixo no painel **Environment Variables** do Coolify (baseado em `.env.example`):

- [ ] `NEXT_PUBLIC_APP_URL=https://amigodenatal.com.br`
- [ ] `DATABASE_URL=<url-do-postgres-coolify>`
- [ ] `PIN_PEPPER=<string-aleatoria-longa-32+-chars>` (ex: `openssl rand -hex 32`) — ⚠️ **Não altere depois de ir ao ar**, pois ela gera o hash dos PINs e o índice cego (`phone_hmac`) dos números de WhatsApp.
- [ ] `CRON_SECRET=<string-aleatoria>`
- [ ] `FOUNDER_ADMIN_KEY=<sua-chave-secreta-para-acessar-/painel-secreto>`
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL=contato@gbabler.com`
- [ ] **IA Gratuita (Google Gemini — Free Tier):**
  - `GEMINI_API_KEY=<chave-google-ai-studio>`
  - `GEMINI_MODEL=gemini-2.5-flash-lite`
  - `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`
- [ ] **Web Push Gratuito (VAPID — opcional, mas recomendado):**
  - Rode `npx web-push generate-vapid-keys` localmente e preencha:
    - `NEXT_PUBLIC_VAPID_PUBLIC_KEY=...`
    - `VAPID_PRIVATE_KEY=...`
    - `VAPID_SUBJECT=mailto:contato@gbabler.com`

---

## 3. Cadastro nos Programas de Afiliados

> **Dica importante:** Cadastre-se usando o site **já no ar** em `https://amigodenatal.com.br` (mesmo que ainda sem divulgação), pois Amazon e Shopee pedem uma URL pública ativa para aprovar a conta.

### A. Amazon Associados Brasil
- [ ] Acesse [associados.amazon.com.br](https://associados.amazon.com.br) e clique em **Inscrever-se** (use sua conta Amazon Brasil ou crie uma).
- [ ] Informe o site `https://amigodenatal.com.br` e descreva como *"Ferramenta gratuita de Amigo Secreto que recomenda ideias de presentes dentro do orçamento do grupo"*.
- [ ] Ao finalizar, copie o seu **ID de Associado (Store ID)** — tem o formato `amigodenatal-20` (ou `seunome-20`).
- [ ] Configure no Coolify: `NEXT_PUBLIC_AMAZON_TAG=seu-id-20`.
- [ ] ⚠️ **Regra da Amazon:** Você precisa realizar **pelo menos 3 vendas qualificadas nos primeiros 180 dias** para a conta não expirar (comprar pelo seu próprio link não conta).

### B. Mercado Livre Afiliados
- [ ] Acesse [afiliados.mercadolivre.com.br](https://afiliados.mercadolivre.com.br) (ou pelo menu **Afiliados** dentro da sua conta Mercado Livre).
- [ ] Cadastre o site `https://amigodenatal.com.br` como canal de divulgação.
- [ ] Gere um link qualquer no painel de afiliados do Mercado Livre e observe o parâmetro `matt_tool=` na URL (ex: `matt_tool=12345678`).
- [ ] Configure no Coolify: `NEXT_PUBLIC_MELI_TAG=12345678`.
- [ ] **Nota:** O Mercado Livre paga comissão mesmo se a pessoa clicar na busca e comprar outro produto dentro da janela de atribuição.

### C. Shopee Afiliados Brasil
- [ ] Acesse [affiliate.shopee.com.br](https://affiliate.shopee.com.br) e faça login com sua conta Shopee.
- [ ] Preencha o formulário de inscrição informando `https://amigodenatal.com.br` como seu site/plataforma (a aprovação costuma levar de 1 a 3 dias úteis).
- [ ] Após aprovado, pegue seu **Affiliate ID** (e verifique no painel de **Link Personalizado / Universal Link** o formato de rastreamento, ex: `mmp_pid` / `af_siteid` ou API de geração de links curtos `s.shopee.com.br`).
- [ ] *(Código)* Quando tiver o ID aprovado, adicionar a função `buildShopeeSearchUrl` em `src/lib/affiliates.ts` e o 3º botão **"Ver na Shopee"** em `src/components/RoomClient.tsx`.

---

## 5. Como Funcionam as Recomendações e URLs de Afiliado

1. **Coleta de contexto sem atrito:**
   - Ao entrar na sala, cada participante escolhe **até 3 tags** (ex: `Café especial`, `Meio amargo 70%`, `Sempre atrasado`) adaptadas à modalidade do grupo (`SECRETO`, `ONCA`, `CHOCOLATE`).
   - O organizador define o **orçamento máximo** (ex: `R$ 80,00`).

2. **Montagem automática da busca na revelação (`src/app/api/rooms/[slug]/reveal/route.ts`):**
   - Quando o participante abre o presente e revela quem tirou, o backend lê as tags do sorteado e o orçamento do grupo (`budgetCents`) — **100% grátis, sem gastar tokens de IA**.
   - Para cada tag, monta um termo de busca limpo em português (ex: `"presente Café especial"` ou `"chocolate Meio amargo 70%"`).

3. **Injeção dinâmica da loja + faixa de preço (`src/lib/affiliates.ts`):**
   - **Amazon Brasil (`buildAmazonSearchUrl`):**
     ```text
     https://www.amazon.com.br/s?k=presente+Caf%C3%A9+especial&high-price=80&tag=SEU_ID-20
     ```
     - `k=` leva o termo de busca.
     - `high-price=` filtra itens até o teto do grupo.
     - `tag=` garante sua comissão na Amazon Associados.
   - **Mercado Livre (`buildMercadoLivreSearchUrl`):**
     ```text
     https://lista.mercadolivre.com.br/presente-Caf%C3%A9-especial_PriceRange_0BRL-80BRL?matt_tool=SEU_MELI_TAG
     ```
     - O sufixo `_PriceRange_0BRL-80BRL` já abre a vitrine filtrada no orçamento.
     - `matt_tool=` atribui a comissão à sua conta de afiliado.
   - **Shopee (quando adicionada):**
     - A Shopee usa `https://shopee.com.br/search?keyword=...&maxPrice=80` encapsulada no formato de link de afiliado da sua conta (`af_siteid` / Universal Link do portal `affiliate.shopee.com.br`).

4. **Observabilidade de cliques:**
   - Cada clique nos botões **"Ver na Amazon"** ou **"Mercado Livre"** dispara `AFFILIATE_CLICK` para `/api/analytics/track`, e você acompanha o total por loja em `/painel-secreto`.

---

## 6. Teste Final Antes de Divulgar (Smoke Test)

- [ ] Criar uma sala no celular (testar no Safari/Chrome e dentro do navegador do WhatsApp).
- [ ] Entrar com 3 números diferentes (testar erro de WhatsApp inválido, aviso de nome parecido e recuperação com PIN).
- [ ] Testar "Modo Caos" (zoeiras, pistas e prendas) e adicionar 1 regra anti-casal grátis.
- [ ] Realizar sorteio, abrir o presente embrulhado, baixar o Card 9:16 e clicar nos links da Amazon e Mercado Livre para confirmar que seu `tag=` e `matt_tool=` estão na URL.
- [ ] Abrir `/painel-secreto` e confirmar que acessos, salas, participantes e cliques em afiliados estão contabilizando.

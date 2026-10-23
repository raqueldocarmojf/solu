import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchSiteContent(url) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, conteudo, persona, contexto } = req.body || {};

  let siteContent = conteudo || "";
  if (url) {
    const fetched = await fetchSiteContent(url);
    siteContent = fetched ? `${siteContent}\n\n${fetched}` : siteContent;
  }

  const PRODUTO = `
SOBRE A SOL (produto da Solú):
A Sol é uma colaboradora digital que conduz entrevistas reais com candidatos — não é triagem de currículo, não é chatbot. Ela entrevista em vídeo, avalia tecnicamente, gera perfil comportamental (56 afirmações) e entrega um shortlist pronto com notas e recomendação.

Processo em 4 passos:
1. Você abre a vaga e descreve o perfil
2. Divulga o link (WhatsApp ou site)
3. A Sol conduz as entrevistas automaticamente
4. Você recebe o shortlist e decide quem avança

Diferenciais que importam para quem contrata:
- Primeiros candidatos qualificados em até 72h
- Tempo médio de fechamento: 18 dias (mercado: 39,5 dias — mais que o dobro)
- 92% de satisfação dos candidatos com o processo
- Anti-fraude: detecta uso de IA, leitura de tela, consulta a terceiros durante a entrevista
- Critérios 100% personalizados por vaga — não é one-size-fits-all
- O recrutador sempre tem a palavra final

Resultados reais de clientes:
- Peter Seiffert, CEO Valetec Capital: "Fizemos 6 contratações em 2 cargos críticos. O processo foi mais rápido e a qualidade superou o que tínhamos conseguido antes."
- Clientes ativos: ASSA ABLOY, Domino's, Softplan, Fundação Bradesco

Planos a partir de R$ 350 por vaga (ou R$ 390/mês no Starter).
CTA ideal: diagnóstico de 30 min → demo com vaga real da empresa → proposta.

Contato: Raquel | Head de Vendas | raquel@getsolu.ai
`;

  const personaInfo = persona ? `Cargo/perfil do contato que vai receber as mensagens: ${persona}` : "";
  const contextoInfo = contexto ? `Contexto adicional sobre a empresa ou situação: ${contexto}` : "";
  const siteInfo = siteContent
    ? `DADOS REAIS DA EMPRESA (extraídos do site/texto fornecido — use isso para personalizar):\n${siteContent}`
    : "Nenhuma informação específica da empresa foi fornecida. Sinalize isso na análise e seja o mais contextual possível com o que foi dado.";

  const prompt = `Você é Raquel, Head de Vendas da Solú (getsolu.ai). Você está prospectando essa empresa para vender a Sol.

${PRODUTO}

---

${personaInfo}
${contextoInfo}

${siteInfo}

---

REGRAS ABSOLUTAS — violar qualquer uma delas torna a mensagem inútil:

1. NUNCA use frases genéricas como:
   - "Notei que sua empresa está em crescimento"
   - "Pode estar buscando agilidade"
   - "Como está o processo de recrutamento atualmente?"
   - "Gostaria de apresentar uma solução"
   - "Temos uma plataforma inovadora"
   - Qualquer coisa que poderia ser enviada para qualquer empresa do Brasil

2. SEMPRE cite algo específico e real da empresa — um produto, cliente, mercado, expansão, setor, tamanho, momento. Se não tiver dados, diga que precisa de mais contexto no campo sinais_de_compra.

3. WhatsApp deve parecer uma mensagem real de uma pessoa real — sem bullet points, sem formalidade corporativa, sem emojis em excesso. Máximo 4 linhas. Termine com uma pergunta específica (não genérica).

4. Email pode ser um pouco mais estruturado, mas ainda humano. Nada de "Espero que esteja bem" ou "Venho por meio deste".

5. O insight central de cada mensagem deve ser diferente — não repita o mesmo ângulo 6 vezes.

6. Use dados concretos da Sol quando fizer sentido (72h, 18 dias, 92%, Peter Seiffert, etc.) — números vendem mais que adjetivos.

7. Escreva como Raquel escreve para um colega de mercado — direta, sem rodeios, com personalidade.

---

EXEMPLOS DO QUE NÃO FAZER vs O QUE FAZER:

❌ "Oi Ana, sou Raquel da Sol. Notei que a Transfeera está crescendo e pode precisar de agilidade no recrutamento. Como está o processo hoje?"

✅ "Oi Ana, vi que a Transfeera opera infraestrutura de pagamentos B2B — geralmente esse setor tem picos de contratação quando lança novos produtos ou expande integrações. A Sol faz a primeira entrevista de todos os candidatos automaticamente e entrega shortlist em 72h. Vocês costumam contratar em volume ou é mais pontual?"

❌ "Prezado, gostaria de apresentar a Sol, uma solução inovadora de recrutamento com IA..."

✅ "Assunto: 18 dias pra fechar uma vaga — você chegou perto disso?

[Nome], a média do mercado pra fechar uma vaga é 39 dias. Nossos clientes estão fechando em 18 — e o diferencial não é velocidade por velocidade, é que a Sol já conduziu as entrevistas iniciais antes de você precisar sentar com alguém.

[Dado específico sobre a empresa]. Faz sentido conversar 30 min pra eu mostrar como ficaria configurado pra vocês?"

---

Gere a sequência completa com 6 mensagens:

1. whatsapp_1 — Primeira abordagem. Específica, curiosa, termina com pergunta contextual.
2. whatsapp_2 — Follow-up 3 dias depois. Ângulo completamente diferente da primeira. Não mencione que você já mandou mensagem antes — apenas abra outro ponto de valor.
3. whatsapp_3 — Último WPP. Curtíssimo (2 linhas). Deixa porta aberta sem pressão.
4. email_1 — Primeiro email. Formato: primeira linha = "ASSUNTO: [assunto]\n\n[corpo]". Assunto deve ser intrigante, não genérico. Assinatura: "Abraços, Raquel | Head de Vendas, Solú | raquel@getsolu.ai"
5. email_2 — Follow-up 5 dias depois. Ângulo diferente, pode trazer case ou dado novo. Mesma assinatura.
6. email_3 — Email final. Muito curto. Tom de "última tentativa honesta". Mesma assinatura.

Retorne JSON com exatamente essas chaves:
{
  "sinais_de_compra": "o que você identificou de específico nessa empresa que indica fit ou dor — seja honesto se os dados foram insuficientes",
  "justificativa_fit": "por que a Sol faz sentido agora para essa empresa, com base nos dados reais",
  "whatsapp_1": "mensagem",
  "whatsapp_2": "mensagem",
  "whatsapp_3": "mensagem",
  "email_1": "ASSUNTO: ...\n\n...\n\nAbraços, Raquel | Head de Vendas, Solú | raquel@getsolu.ai",
  "email_2": "ASSUNTO: ...\n\n...\n\nAbraços, Raquel | Head de Vendas, Solú | raquel@getsolu.ai",
  "email_3": "ASSUNTO: ...\n\n...\n\nAbraços, Raquel | Head de Vendas, Solú | raquel@getsolu.ai"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 3200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você é Raquel, Head de Vendas da Solú. Escreva prospecção real, personalizada e humana. Jamais use frases genéricas. Retorne sempre JSON válido.",
        },
        { role: "user", content: prompt },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao gerar mensagens. Tente novamente." });
  }
}

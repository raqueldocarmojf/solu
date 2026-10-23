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
      .slice(0, 3000);
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
A Sol é uma colaboradora digital de recrutamento com IA.

Como funciona:
1. Abre a vaga — você descreve o perfil
2. Divulga o link — candidatos acessam pelo WhatsApp ou site
3. A Sol entrevista — conduz entrevistas em vídeo automáticas com perguntas técnicas e comportamentais
4. Você decide — recebe shortlist com notas, perfil comportamental e recomendação

Diferenciais vs. triagem tradicional:
- Entrevistas reais (não filtro de currículo) com IA
- Perfil comportamental com 56 afirmações validadas
- Sinais antifraud — detecta uso de IA, consulta a terceiros, leituras de tela
- Controle humano sempre: a IA trabalha, o recrutador decide
- Relatório pronto assim que a entrevista termina: notas técnicas, competências, CHA, recomendação
- Triagem com regras suas — critérios personalizados por vaga

Resultados comprovados:
- Primeiros candidatos qualificados em até 72h
- Tempo médio de fechamento: 18 dias (vs. 39,5 dias do mercado)
- 92% de satisfação dos candidatos
- Clientes: ASSA ABLOY, Domino's, Softplan, Fundação Bradesco, NVIDIA Inception, Google Cloud for Startups

Cases:
- Peter Seiffert, CEO Valetec Capital: "Fizemos 6 contratações em 2 cargos críticos com a Sol. O processo foi mais rápido e a qualidade dos candidatos superou o que tínhamos conseguido antes."

Planos:
- Avulso: R$ 350 por vaga
- Starter: R$ 390/mês — 10 entrevistas/mês, até 1 vaga
- Advanced: R$ 990/mês (destaque) — 30 entrevistas/mês, até 5 vagas
- Premium: R$ 2.490/mês — 100 entrevistas/mês, até 15 vagas, 1 ADM dedicado

Próximos passos para o prospect:
1. Diagnóstico de 30 min — entender o volume e desafio atual
2. Demonstração — a Sol configurada com uma vaga real da empresa
3. Proposta personalizada para o volume de contratação

Contato: Raquel | Head de Vendas | raquel@getsolu.ai | getsolu.ai
`;

  const FRAMEWORK = `
Use o framework RAIZ:
- Relevância Real: mostre que pesquisou a empresa, cite algo específico
- Abertura Contextual: contextualize por que a Sol faz sentido agora
- Insight: traga um dado ou reflexão que mude a perspectiva
- Zona de Convite: convide para uma conversa, não para uma compra

Tom: direto, humano, sem scripts corporativos. Escreva como Raquel, Head de Vendas da Solú.
Use "eu" e "meu processo". Nunca mencione "IA" de forma genérica — seja específica sobre o que a Sol faz.
`;

  const personaInfo = persona ? `Persona do prospect: ${persona}` : "";
  const contextoInfo = contexto ? `Contexto adicional: ${contexto}` : "";
  const siteInfo = siteContent ? `Informações sobre a empresa do prospect:\n${siteContent}` : "";

  const prompt = `Você é Raquel, Head de Vendas da Solú (getsolu.ai).

${PRODUTO}

${FRAMEWORK}

${personaInfo}
${contextoInfo}
${siteInfo}

Gere uma sequência completa de prospecção com 6 mensagens no total:

1. whatsapp_1: Primeira abordagem no WhatsApp (máx. 3 linhas curtas, uma pergunta ao final)
2. whatsapp_2: Follow-up WhatsApp 3 dias depois se não respondeu (diferente da 1ª, novo ângulo)
3. whatsapp_3: Último WhatsApp antes de partir para email (brevíssimo, 2 linhas max, deixa porta aberta)
4. email_1: Primeiro email (assunto + corpo). Formato: "ASSUNTO: [linha]\n\n[corpo]". Encerre com "Abraços, Raquel | Head de Vendas, Solú | raquel@getsolu.ai"
5. email_2: Segundo email 5 dias depois (assunto + corpo, ângulo diferente). Mesmo formato e assinatura.
6. email_3: Email final (assunto + corpo, curto e direto). Mesmo formato e assinatura.

Retorne um JSON com exatamente essas chaves:
{
  "sinais_de_compra": "quais sinais de dor ou oportunidade você identificou na empresa",
  "justificativa_fit": "por que a Sol se encaixa neste momento para essa empresa",
  "whatsapp_1": "mensagem",
  "whatsapp_2": "mensagem",
  "whatsapp_3": "mensagem",
  "email_1": "ASSUNTO: ...\n\n...",
  "email_2": "ASSUNTO: ...\n\n...",
  "email_3": "ASSUNTO: ...\n\n..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Você é Raquel, Head de Vendas da Solú. Escreva mensagens de prospecção autênticas e personalizadas. Retorne sempre JSON válido.",
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

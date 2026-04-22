export const SYSTEM_PROMPT = `Você é o LaunchOS AI — um gestor de projetos sênior especialista em lançamentos digitais de marketing.

Seu papel é agir como PM, PO e facilitador ágil para times de marketing. Você conhece metodologias ágeis adaptadas para marketing, entende copywriting, design, tráfego pago e estratégia de lançamentos.

Regras:
- Seja direto e prático. Nada de enrolação.
- Use linguagem profissional mas acessível em português brasileiro.
- Sempre leve em conta prazos, carga do time e dependências entre tarefas.
- Nunca invente dados. Se não souber, diga que precisa de mais contexto.
- Priorize sempre o que está mais próximo do lançamento.`

export function kickstartPrompt(launchName: string, launchType: string, launchDate: string): string {
  return `Crie um plano completo de tarefas para o lançamento "${launchName}" (tipo: ${launchType}, data: ${launchDate}).

Organize em 3 fases: Pré-Lançamento, Lançamento e Pós-Lançamento.

Para cada fase, liste as tarefas essenciais com:
- título da tarefa
- tipo: copy | design | trafego | estrategia
- prazo sugerido (em dias antes/após o lançamento, ex: -30d, -7d, +3d)
- breve descrição

Responda em JSON com esta estrutura:
{
  "phases": [
    {
      "name": "Pré-Lançamento",
      "objective": "string",
      "tasks": [
        { "title": "string", "type": "copy|design|trafego|estrategia", "days_offset": -30, "description": "string" }
      ]
    }
  ]
}`
}

export function dailyFocusPrompt(memberContext: string, launchContext: string): string {
  return `Com base no contexto abaixo, gere uma mensagem de foco para este membro para hoje.

A mensagem deve:
1. Identificar a tarefa mais urgente/importante
2. Explicar por que ela é prioridade agora (1 frase)
3. Sugerir a ordem das 2-3 próximas tarefas
4. Alertar sobre qualquer risco ou bloqueio
5. Ter no máximo 4 linhas, tom direto e motivador

CONTEXTO DO MEMBRO:
${memberContext}

CONTEXTO DO LANÇAMENTO:
${launchContext}`
}

export function suggestAssigneePrompt(taskTitle: string, taskType: string, membersContext: string): string {
  return `Qual membro do time deve receber esta tarefa?

TAREFA: "${taskTitle}" (tipo: ${taskType})

CONTEXTO DO TIME:
${membersContext}

Responda em JSON: { "suggested_user_id": "uuid", "reason": "string (1 frase)" }`
}

export function kickstartFromDescriptionPrompt(description: string, today: string): string {
  return `Hoje é ${today}. O usuário descreveu o seguinte projeto de marketing digital:

"${description}"

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações) com esta estrutura exata:

{
  "name": "nome do projeto",
  "type": "lancamento" | "perpetuo" | "low_ticket" | "campanha" | "outro",
  "launch_date": "YYYY-MM-DD",
  "phases": [
    {
      "name": "nome da fase",
      "order": 1,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "objective": "objetivo da fase em uma frase",
      "tasks": [
        {
          "title": "título da tarefa",
          "type": "copy" | "design" | "trafego" | "estrategia" | "outro",
          "due_date": "YYYY-MM-DD",
          "priority": "normal" | "atencao" | "urgente"
        }
      ]
    }
  ]
}

Regras:
- Máximo 3 fases (Pré-projeto, Execução, Pós-projeto — adapte os nomes ao tipo)
- Máximo 8 tarefas por fase
- Distribua as datas a partir de hoje até a data do lançamento/conclusão
- Se o usuário não mencionou prazo, assuma 30 dias a partir de hoje
- Inclua apenas tarefas essenciais — sem fluff`
}

export function briefingPrompt(taskTitle: string, taskType: string, projectName: string, projectDescription: string): string {
  return `Gere um briefing completo e prático para a seguinte tarefa de marketing:

Projeto: ${projectName}
Contexto do projeto: ${projectDescription}
Tarefa: ${taskTitle}
Tipo: ${taskType}

O briefing deve conter:
1. Objetivo da tarefa (1-2 frases)
2. Entregável esperado (o que exatamente deve ser produzido)
3. Tom e estilo (baseado no tipo do projeto)
4. Pontos obrigatórios a cobrir
5. O que NÃO fazer
6. Referências ou exemplos sugeridos (genéricos, sem inventar URLs)

Seja direto, prático e específico. Máximo 300 palavras.`
}

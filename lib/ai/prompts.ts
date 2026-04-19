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

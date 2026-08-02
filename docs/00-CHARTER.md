---
id: CRMGC-CHARTER-000
title: Constituição do Projeto — CRM GC
version: 0.1.0
status: DRAFT
owner: CEO
depends_on:
  - (nenhuma, este é o documento raiz)
last_update: 2026-07-15
---

# CRM GC — Charter

## 1. Princípios Inegociáveis

- **Humano no controle das mensagens:** a IA nunca envia mensagens a leads de forma autônoma. Toda sugestão de resposta é preparada para revisão humana. O sistema atualiza dados — não se comunica com o cliente final.
- **Dados sensíveis sempre criptografados:** qualquer informação de saúde (TDAH, TEA, dislexia, Alzheimer, declínio cognitivo) ou dado pessoal de lead (nome, telefone, histórico de conversa) deve ser criptografada em repouso e em trânsito, sem exceção.
- **Nenhuma condição sensível inferida:** características como TDAH, TEA, dislexia ou Alzheimer só são registradas nos cards quando o próprio lead mencionar espontaneamente. O sistema nunca infere ou assume com base em pistas indiretas.
- **Qualidade não é negociável:** nenhuma feature entra em produção sem cobertura de testes (TDD). Cenários de aceite escritos em Gherkin antes do código. Testes funcionais e não funcionais obrigatórios.
- **Simplicidade sobre completude:** entregar menos que funciona é preferível a entregar mais que quebra. Escopo do MVP é fechado — nenhuma feature nova entra sem aprovação do CEO.
- **Segurança é prioridade máxima:** (exceto pelo uso consciente do tier gratuito de IA no MVP, decisão de negócio documentada). Todo o restante segue princípios de segurança por design — zero trust, menor privilégio, auditoria de acessos.
- **Modelo de IA intercambiável:** a IA de processamento (Gemini no MVP) deve ser configurável via variável de ambiente. Trocar de modelo não pode exigir alteração de código — apenas de configuração.
- **Pipeline CI/CD obrigatório:** nenhum código chega a produção fora do pipeline. Deploy manual é proibido em qualquer ambiente além do desenvolvimento local.

## 2. Regras Globais (todo agente deve obedecer sempre)

- **Regra de segurança:** dados sensíveis (pessoais e de saúde) são criptografados com AES-256 em repouso e TLS 1.3 em trânsito. Chaves gerenciadas via variáveis de ambiente — nunca hardcoded no código.
- **Regra de qualidade mínima aceitável:** cobertura de testes mínima de 80% por serviço. Testes de contrato entre microsserviços obrigatórios. Testes de performance e segurança executados em cada release.
- **Regra de aprovação para ações irreversíveis:** qualquer ação que altere ou exclua dados de leads em produção exige log de auditoria. Deleção em massa requer aprovação explícita do CEO.
- **Regra de rastreabilidade:** nada é "pronto" sem uma linha na matriz de rastreabilidade (04-TRACEABILITY.md) com status validado pelo agente de QA.
- **Regra de documentação primeiro:** nenhum agente escreve código sem que o documento de domínio correspondente (02-DOMAIN.md) e os critérios de aceite em Gherkin estejam aprovados.
- **Regra de decisão ambígua:** se qualquer agente encontrar uma decisão não coberta pelos documentos, PARA e registra como "Decisão Pendente" em 04-TRACEABILITY.md. Nunca assume e segue silenciosamente.
- **Regra de dependência de agentes:** nenhum agente altera o escopo do trabalho de outro sem documento de mudança aprovado pelo CTO e registrado.

## 3. O Que Este Projeto NUNCA Vai Fazer

- **Nunca enviar mensagens automáticas para leads** sem revisão e aprovação humana explícita.
- **Nunca registrar diagnósticos ou condições de saúde** antes de o lead mencionar espontaneamente na conversa.
- **Nunca armazenar credenciais hardcoded** no código-fonte ou em arquivos versionados no repositório.
- **Nunca fazer deploy em produção fora do pipeline CI/CD**, independente de urgência.
- **Nunca usar dados reais de leads para treinar modelos de IA** de terceiros sem consentimento explícito e documentado.
- **Nunca crescer o escopo do MVP** sem decisão formal do CEO registrada na rastreabilidade.
- **Nunca tratar qualidade como fase final** — testes são escritos antes do código (TDD), não depois.

## 4. Decisão de Negócio Registrada — Tier Gratuito de IA

O uso do tier gratuito do Gemini (Google) no MVP é uma decisão consciente de negócio, aceita pelo CEO. Implicação conhecida: no tier gratuito, o Google pode usar prompts para treinamento de modelos. Mitigação prevista: nenhum dado de produção com informações sensíveis reais deve ser processado até que a migração para um tier pago (com Data Processing Agreement) seja realizada. O MVP deve ser validado com dados de teste antes de ir para produção com leads reais.

## 5. Critério de Alto Nível de Sucesso

O projeto será considerado bem-sucedido quando, após a ativação do trigger (manual ou batch diário), **todos os leads com novas conversas no período tiverem seus cards no Notion atualizados automaticamente — sem nenhuma intervenção manual** — por 7 dias consecutivos sem falha.

Métricas secundárias:
- Tempo de processamento do batch diário: inferior a 5 minutos para até 30 conversas
- Zero leads novos não identificados (nenhum lead que enviou mensagem fica sem card criado)
- Taxa de campos corretamente preenchidos pela IA: superior a 85% (validado por amostragem semanal pelo CEO)

---

## Suposições Pendentes de Validação

- [ ] **SUPOSIÇÃO-001:** O número de WhatsApp real será conectado via Evolution API após o MVP ser validado com dados de teste. Impacto se errada: o MVP pode precisar de ajuste no conector de WhatsApp.
- [ ] **SUPOSIÇÃO-002:** O Notion continuará sendo o CRM no MVP. Website próprio é fase posterior, não comprometida neste Charter.
- [ ] **SUPOSIÇÃO-003:** Volume máximo de 30 conversas/dia no MVP. Se o volume crescer significativamente, a arquitetura de batch pode precisar de revisão.

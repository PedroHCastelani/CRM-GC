---
id: CRMGC-OPS-003B
title: Blueprint de Execução — Parte 2 (Critérios de Pronto e Cenários Gherkin)
version: 0.1.0
status: DRAFT
owner: CTO + QA
depends_on:
  - CRMGC-OPS-003A
last_update: 2026-07-15
---

# CRM GC — Operational Blueprint (Parte 2)

## 4. Critério de "Pronto" por Serviço

Nada é "pronto" sem todos os itens abaixo checados pelo Agente de QA.
Um item não checado bloqueia o avanço para o próximo nível.

### 4.1 Infraestrutura + CI/CD

- [ ] Docker Compose sobe todos os serviços com um único comando
- [ ] Variáveis de ambiente carregadas de `.env` — zero valores hardcoded no código
- [ ] Pipeline CI executa automaticamente em cada pull request
- [ ] Pipeline bloqueia merge se qualquer teste falhar
- [ ] Pipeline bloqueia merge se cobertura de testes estiver abaixo de 80%
- [ ] Deploy em staging automatizado após merge na branch `main`
- [ ] Deploy em produção requer aprovação manual do CEO no pipeline
- [ ] Backup automático do SQLite configurado e testado (restore validado)

### 4.2 Message Store

- [ ] Endpoint POST /webhook responde 200 em menos de 200ms
- [ ] Mensagens com `fromMe: true` são descartadas sem gravar no banco
- [ ] Mensagens com `messageType` diferente de "conversation" são descartadas com log
- [ ] `pushName: null` é tratado sem erro (grava string vazia, não lança exceção)
- [ ] `remoteJid` com sufixo `@lid` é normalizado corretamente para número limpo
- [ ] Dados sensíveis (telefone, nome, corpo) estão criptografados no arquivo SQLite
- [ ] Endpoint GET /health retorna 200 quando saudável
- [ ] Cobertura de testes ≥ 80%
- [ ] Todos os cenários Gherkin da seção 5.1 passando

### 4.3 Processador

- [ ] Batch executa automaticamente às 02h sem intervenção manual
- [ ] Batch processa apenas mensagens com `processado = false`
- [ ] Loop de retry: 4 tentativas com 30.000ms de delay entre cada uma
- [ ] Após 4 falhas, o lead é marcado no log de auditoria e o batch avança para o próximo
- [ ] Campos incertos NÃO sobrescrevem valores existentes no Notion (RN-004)
- [ ] Características específicas só são registradas quando mencionadas espontaneamente
- [ ] Estágio nunca regride (ex: "Aula realizada" não volta para "Em qualificação")
- [ ] Log de auditoria gerado para cada operação de escrita no Notion
- [ ] Endpoint POST /run responde e dispara o processamento
- [ ] Cobertura de testes ≥ 80%
- [ ] Todos os cenários Gherkin da seção 5.2 passando

### 4.4 Gateway

- [ ] GET / serve o painel web com botão "Processar agora" e área de status
- [ ] POST /trigger aciona o Processador e retorna status imediato
- [ ] GET /status retorna dados da tabela `batch_estado` em JSON
- [ ] Acesso bloqueado para IPs fora da lista permitida (configurável via env)
- [ ] Quando Processador está indisponível, retorna erro legível (não 500 genérico)
- [ ] Cobertura de testes ≥ 80%
- [ ] Todos os cenários Gherkin da seção 5.3 passando

### 4.5 End-to-End (MVP completo)

- [ ] Mensagem de lead novo recebida → card criado no Notion com campos corretos
- [ ] Mensagem de lead existente recebida → card atualizado sem duplicar
- [ ] Trigger manual no painel → processamento iniciado e status atualizado na tela
- [ ] Batch às 02h → todas as mensagens do dia processadas sem erro
- [ ] Teste de performance: batch de 30 leads processados em menos de 5 minutos
- [ ] Teste de segurança: nenhuma credencial exposta em logs, nenhum endpoint
  sem controle de acesso, nenhum dado sensível em texto plano no banco
- [ ] 7 dias consecutivos em staging sem falha → aprovação do CEO para produção

---

## 5. Cenários Gherkin por Serviço

Os cenários abaixo são o ponto de partida. O Agente de QA deve
expandir com casos de borda identificados durante a implementação.
**Regra:** os cenários são escritos ANTES do código correspondente.

### 5.1 Message Store

```gherkin
Feature: Recebimento e persistência de mensagens do WhatsApp

  Background:
    Given o Message Store está rodando
    And o banco SQLite está inicializado

  Scenario: Receber mensagem de texto de lead novo
    Given chega um webhook da Evolution API com evento "messages.upsert"
    And o campo "fromMe" é false
    And o campo "messageType" é "conversation"
    And o telefone "5535999998888" não existe no banco
    When o Message Store processa o webhook
    Then uma nova mensagem é gravada no banco com "processado" igual a false
    And o corpo da mensagem está criptografado no banco
    And o telefone está criptografado no banco
    And o endpoint retorna HTTP 200

  Scenario: Receber mensagem de lead existente
    Given chega um webhook com telefone "5535999998888" que já existe no banco
    And o campo "fromMe" é false
    When o Message Store processa o webhook
    Then uma nova mensagem é adicionada ao banco para esse telefone
    And o número de mensagens do telefone aumenta em 1

  Scenario: Ignorar mensagem enviada pelo próprio número
    Given chega um webhook com "fromMe" igual a true
    When o Message Store processa o webhook
    Then nenhuma mensagem é gravada no banco
    And o endpoint retorna HTTP 200

  Scenario: Tratar pushName nulo sem erro
    Given chega um webhook com "pushName" igual a null
    And o campo "fromMe" é false
    When o Message Store processa o webhook
    Then a mensagem é gravada com nome igual a string vazia
    And nenhum erro é lançado

  Scenario: Normalizar remoteJid com sufixo @lid
    Given chega um webhook com "remoteJid" igual a "5535999998888@lid"
    When o Message Store extrai o telefone
    Then o telefone gravado no banco é "5535999998888"

  Scenario: Descartar mensagem de tipo não suportado
    Given chega um webhook com "messageType" igual a "imageMessage"
    When o Message Store processa o webhook
    Then nenhuma mensagem é gravada no banco
    And uma entrada de log é registrada com o tipo descartado
    And o endpoint retorna HTTP 200

  Scenario: Verificar saúde do serviço
    When uma requisição GET é feita para /health
    Then o endpoint retorna HTTP 200
    And o corpo contém o campo "status" com valor "ok"
```

### 5.2 Processador

```gherkin
Feature: Processamento de conversas e atualização de leads no Notion

  Background:
    Given o Processador está rodando
    And o banco SQLite contém mensagens com "processado" igual a false
    And a integração com o Notion está configurada

  Scenario: Criar card para lead novo
    Given existe uma mensagem de telefone "5535977771111" com "processado" false
    And o Notion não possui card com esse telefone
    When o Processador executa o batch
    Then um novo card é criado no Notion com estágio "Novo lead"
    And o campo "Data último contato" é preenchido
    And a mensagem é marcada como "processado" true no banco
    And uma entrada é gravada no log de auditoria com operação "criar_card"

  Scenario: Atualizar card de lead existente com nova faixa etária
    Given existe uma mensagem de telefone "5535999998888" com "processado" false
    And a mensagem contém "meu filho tem 9 anos"
    And o Notion possui card para esse telefone com "faixaEtaria" nulo
    When o Processador executa o batch
    Then o card no Notion é atualizado com "faixaEtaria" igual a "8-9"
    And uma entrada é gravada no log de auditoria com operação "atualizar_card"

  Scenario: Não sobrescrever campo com string vazia quando IA não tem certeza
    Given o Notion possui card com "faixaEtaria" igual a "60+"
    And a IA retorna "faixaEtaria" como string vazia para essa conversa
    When o Processador atualiza o card
    Then o campo "faixaEtaria" permanece "60+" no Notion
    And "faixaEtaria" é listado nos "camposIncertos" do log de auditoria

  Scenario: Não registrar característica específica por inferência
    Given a mensagem contém "meu pai está esquecendo muitas coisas"
    And a mensagem NÃO contém menção explícita a Alzheimer ou declínio cognitivo
    When a IA processa a mensagem
    Then o campo "caracteristicasEspecificas" retorna lista vazia
    And nenhuma característica é gravada no Notion

  Scenario: Retry de IA em caso de falha temporária
    Given a IA retorna erro 503 na primeira chamada
    And a IA retorna erro 503 na segunda chamada
    And a IA retorna sucesso na terceira chamada
    When o Processador tenta processar o lead
    Then o processamento conclui com sucesso na terceira tentativa
    And o log de auditoria registra "tentativasUsadas" igual a 3

  Scenario: Registrar falha após 4 tentativas sem sucesso
    Given a IA retorna erro em todas as 4 tentativas
    When o Processador tenta processar o lead
    Then a mensagem permanece como "processado" false no banco
    And o log de auditoria registra a falha com "sucesso" false
    And o batch continua e processa o próximo lead

  Scenario: Não regredir estágio do lead
    Given o Notion possui card com estágio "Aula realizada"
    And a IA sugere estágio "Em qualificação" para esse lead
    When o Processador tenta atualizar o card
    Then o estágio permanece "Aula realizada" no Notion
    And o caso é registrado no log de auditoria como "estágio não regredido"

  Scenario: Batch executa somente mensagens não processadas
    Given o banco contém 5 mensagens com "processado" true
    And o banco contém 3 mensagens com "processado" false
    When o Processador executa o batch
    Then apenas 3 mensagens são processadas
    And as 5 mensagens já processadas não são tocadas
```

### 5.3 Gateway

```gherkin
Feature: Painel web e trigger manual de processamento

  Background:
    Given o Gateway está rodando
    And o acesso vem de um IP permitido

  Scenario: Acessar o painel web
    When uma requisição GET é feita para /
    Then o endpoint retorna HTTP 200
    And o corpo contém um botão com texto "Processar agora"
    And o corpo exibe o status da última execução do batch

  Scenario: Disparar processamento via trigger manual
    Given o Processador está disponível
    When uma requisição POST é feita para /trigger
    Then o Processador inicia o processamento
    And o endpoint retorna HTTP 202 com mensagem "Processamento iniciado"

  Scenario: Consultar status da última execução
    Given o batch foi executado anteriormente
    When uma requisição GET é feita para /status
    Then o endpoint retorna HTTP 200
    And o corpo contém os campos: "ultimo_batch_inicio", "ultimo_batch_fim",
      "ultimo_batch_sucesso", "leads_processados", "leads_com_erro"

  Scenario: Bloquear acesso de IP não autorizado
    Given o acesso vem de um IP fora da lista permitida
    When uma requisição é feita para qualquer endpoint
    Then o endpoint retorna HTTP 403
    And nenhuma operação é executada

  Scenario: Retornar erro legível quando Processador indisponível
    Given o Processador está fora do ar
    When uma requisição POST é feita para /trigger
    Then o endpoint retorna HTTP 503
    And o corpo contém mensagem "Serviço de processamento indisponível. Tente novamente em instantes."
```

---

## 6. Testes Não Funcionais Obrigatórios (QA + SecOps)

### 6.1 Performance (ferramenta: k6 ou Artillery)

| Cenário | Carga | Critério de aceite |
|---|---|---|
| Webhook do Message Store | 50 requisições simultâneas | P95 < 200ms, zero erros |
| Batch de 30 leads | Execução sequencial | Tempo total < 5 minutos |
| Painel web (GET /) | 10 usuários simultâneos | P95 < 500ms |
| Trigger manual (POST /trigger) | 5 cliques em sequência | Não dispara processamento duplicado |

### 6.2 Segurança (OWASP Top 10 + checklist específico)

| Verificação | Responsável | Ferramenta |
|---|---|---|
| Nenhuma credencial em código ou git history | SecOps | git-secrets + trufflehog |
| Dados sensíveis criptografados no SQLite | SecOps | inspeção direta do arquivo |
| TLS 1.3 em todas as conexões externas | SecOps | testssl.sh |
| Endpoint /trigger não executa duas vezes simultaneamente | QA | teste de concorrência |
| Logs de auditoria não contêm dados em texto claro | SecOps | inspeção dos logs |
| Nenhum endpoint retorna stack trace em produção | QA | testes de erro intencional |

---

## Suposições Pendentes de Validação

- [ ] **SUPOSIÇÃO-012:** O Agente de QA terá acesso ao ambiente de staging
  para executar testes de performance e segurança antes do go-live.
  Impacto se errada: criação de ambiente de staging separado na Sprint 1.
- [ ] **SUPOSIÇÃO-013:** Os cenários Gherkin acima cobrem os casos de uso
  principais do CEO. Impacto se errada: o CEO deve adicionar cenários de
  negócio que reflitam situações reais não previstas pelo CTO.

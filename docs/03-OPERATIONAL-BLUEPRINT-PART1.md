---
id: CRMGC-OPS-003A
title: Blueprint de Execução — Parte 1 (Ordem de Construção e Papéis)
version: 0.1.0
status: DRAFT
owner: CTO
depends_on:
  - CRMGC-CHARTER-000
  - CRMGC-VISION-001
  - CRMGC-DOMAIN-002
last_update: 2026-07-15
---

# CRM GC — Operational Blueprint (Parte 1)

## 1. Ordem de Construção

A ordem é determinada por dependência técnica — nenhum serviço pode ser
desenvolvido sem que seus pré-requisitos estejam prontos e testados.

```
NÍVEL 0 — Fundação (pré-requisito de tudo)
  ├── Infraestrutura: VPS + Docker + variáveis de ambiente + CI/CD pipeline
  └── Segurança: definição de chaves, TLS, políticas de acesso

NÍVEL 1 — Captura (pode ser feito em paralelo com Nível 0 em ambiente local)
  └── Message Store: webhook listener + SQLite + criptografia AES-256-GCM
        └── Depende de: Evolution API rodando (Nível 0)

NÍVEL 2 — Processamento (depende do Nível 1 estar funcional)
  └── Processador: leitura SQLite + chamada Gemini + atualização Notion
        └── Depende de: Message Store com dados reais ou fixtures de teste

NÍVEL 3 — Interface (depende do Nível 2)
  └── Gateway: endpoints REST + painel web mínimo + trigger manual
        └── Depende de: Processador expondo endpoint de execução

NÍVEL 4 — Qualidade transversal (roda em paralelo a todos os níveis)
  └── QA: cenários Gherkin, automação de testes, cobertura, performance, segurança
        └── Depende de: cada serviço ter critério de "pronto" definido antes do código
```

### Sequência detalhada de sprints sugerida

| Sprint | Entrega | Responsável principal |
|---|---|---|
| 1 | Infraestrutura base: VPS, Docker Compose, CI/CD esqueleto, variáveis de ambiente | DevOps + SecOps |
| 2 | Evolution API containerizada + QR Code conectado + webhook disparando | Integração WhatsApp |
| 3 | Message Store: receber webhook, parsear payload (DT-001), salvar SQLite criptografado | Message Store |
| 4 | Testes do Message Store: Gherkin escritos, automação, cobertura ≥80% | QA |
| 5 | Processador: batch diário, retry 4x/30s, chamada Gemini (DT-002), atualização Notion | Processador |
| 6 | Testes do Processador + testes de integração com Notion | QA |
| 7 | Gateway: endpoint /trigger, /status, painel web mínimo | Gateway |
| 8 | Testes end-to-end + testes de performance + testes de segurança | QA + SecOps |
| 9 | Validação em ambiente de staging com dados reais de teste (não produção) | CEO + QA |
| 10 | Go-live: produção com dados reais, monitoramento ativo por 7 dias | DevOps + CEO |

---

## 2. Papéis dos Agentes

### CEO
| Faz | Não Faz |
|---|---|
| Toma decisões finais quando há ambiguidade não coberta pelos documentos | Não valida código diretamente |
| Aprova mudanças de escopo | Não define arquitetura técnica |
| Aprova go-live para produção | Não revisa PRs de código |
| Define critérios de negócio quando questionado | Não resolve conflitos técnicos entre agentes |
| Valida o produto nas sprints 9 e 10 | Não acompanha sprints 1-8 salvo quando convocado |

### CTO
| Faz | Não Faz |
|---|---|
| Define e mantém a arquitetura técnica | Não escreve código de produção diretamente |
| Resolve conflitos técnicos entre agentes | Não aprova mudanças de escopo de negócio |
| Revisa contratos entre microsserviços antes da implementação | Não valida critérios de aceite de negócio |
| Toma decisões técnicas (DT-001, DT-002, etc.) e as documenta | Não faz deploy em produção |
| Garante que nenhum agente viole os princípios do Charter | Não substitui o SecOps em decisões de segurança |
| Desbloqueia agentes quando há decisão técnica pendente | |

### Agente de Infraestrutura
| Faz | Não Faz |
|---|---|
| Provisionar e configurar o VPS | Não define a stack tecnológica |
| Criar e manter o Docker Compose com todos os serviços | Não escreve lógica de negócio |
| Gerenciar variáveis de ambiente e secrets (nunca hardcoded) | Não acessa dados de produção diretamente |
| Manter backups automatizados do SQLite | Não faz alterações de schema sem aprovação do CTO |
| Monitorar uptime e alertas de disco/memória | Não modifica código dos outros serviços |

### Agente de DevOps
| Faz | Não Faz |
|---|---|
| Construir e manter o pipeline CI/CD | Não define o que entra no pipeline (isso é do CTO + QA) |
| Automatizar builds, testes e deploys | Não faz deploy manual em produção |
| Configurar ambientes: desenvolvimento, staging, produção | Não gerencia secrets de segurança (isso é do SecOps) |
| Garantir que nenhum código chegue a produção fora do pipeline | Não aprova PRs de código |
| Configurar notificações de falha de pipeline | Não modifica testes existentes |

### Agente de Security / SecOps
| Faz | Não Faz |
|---|---|
| Definir e auditar a implementação de AES-256-GCM no Message Store | Não escreve o código de criptografia (apenas audita) |
| Garantir TLS 1.3 em todas as comunicações entre serviços | Não define arquitetura de serviços |
| Revisar que nenhuma credencial está hardcoded no código ou em arquivos versionados | Não aprova merges de código (isso é do CTO) |
| Executar e documentar testes de segurança (OWASP, SAST, DAST) | Não gerencia infraestrutura diretamente |
| Gerenciar rotação de chaves de criptografia e API keys | Não valida critérios de negócio |
| Auditar logs de auditoria em busca de anomalias | Não opera em produção sem aprovação do CEO para ações irreversíveis |

### Agente de Integração WhatsApp
| Faz | Não Faz |
|---|---|
| Instalar, configurar e manter a Evolution API em container Docker | Não processa mensagens (apenas entrega via webhook) |
| Gerenciar a conexão via QR Code e reconexão automática | Não acessa o SQLite diretamente |
| Configurar o webhook para apontar para o Message Store | Não envia mensagens para leads (fora do MVP, princípio do Charter) |
| Documentar o payload real do webhook com exemplos reais (DT-001) | Não modifica outros serviços |
| Monitorar e alertar em caso de desconexão do WhatsApp | |

### Agente do Message Store
| Faz | Não Faz |
|---|---|
| Implementar endpoint POST /webhook que recebe da Evolution API | Não chama a IA |
| Parsear o payload com as regras de DT-001 (fromMe, remoteJid, pushName null) | Não acessa o Notion |
| Criptografar dados sensíveis com AES-256-GCM antes de gravar no SQLite | Não processa nem interpreta o conteúdo das mensagens |
| Ignorar mensagens com fromMe === true e tipos não suportados no MVP | Não expõe dados descriptografados via API |
| Expor endpoint GET /health para o Gateway verificar disponibilidade | Não toma decisões sobre o estado do lead |

### Agente do Processador
| Faz | Não Faz |
|---|---|
| Ler mensagens com processado=false do SQLite | Não recebe webhook diretamente |
| Agrupar mensagens por lead (telefone_hash) e montar o texto da conversa | Não envia mensagens para leads |
| Chamar o Gemini com retry 4x/30s e schema correto (DT-002) | Não modifica o schema do SQLite |
| Atualizar cards no Notion com os campos retornados pela IA | Não sobrescreve campos com string vazia (RN-004) |
| Registrar log de auditoria para cada operação (RN-007) | Não acessa o painel web ou o Gateway |
| Marcar mensagens como processado=true após sucesso | Não toma decisões de negócio além das regras documentadas em 02-DOMAIN |
| Expor endpoint POST /run para ser chamado pelo Gateway | |

### Agente do Gateway
| Faz | Não Faz |
|---|---|
| Servir o painel web mínimo via GET / | Não acessa o SQLite diretamente |
| Expor POST /trigger que chama o Processador | Não chama a IA diretamente |
| Expor GET /status que retorna o estado da tabela batch_estado | Não acessa o Notion diretamente |
| Controlar acesso por IP (sem autenticação no MVP) | Não modifica dados de leads |
| Retornar erros legíveis quando o Processador estiver indisponível | Não substitui o Processador em nenhuma lógica |

### Agente de QA
| Faz | Não Faz |
|---|---|
| Escrever cenários Gherkin ANTES do código de cada serviço | Não escreve código de produção |
| Implementar automação de testes funcionais (Cucumber + supertest) | Não aprova mudanças de escopo |
| Executar e documentar testes de performance (k6 ou Artillery) | Não define arquitetura |
| Validar cobertura mínima de 80% por serviço antes de aprovar "pronto" | Não faz deploy |
| Reportar falhas com contexto suficiente para o agente responsável corrigir | Não toma decisões técnicas |
| Garantir que nenhum critério de "pronto" seja subjetivo | Não substitui o SecOps nos testes de segurança |

---

## 3. Protocolo Quando Algo Der Errado

Formato padrão de registro (qualquer agente pode abrir, só o CTO fecha):

```
## Incidente #XXX
Data: YYYY-MM-DD
Agente que reportou: [nome]
Problema: [descrição objetiva do que quebrou]
Impacto: [o que está bloqueado ou em risco]
Sugestão técnica: [opcional — o agente pode sugerir, não decidir]
Nível de rollback necessário:
  [ ] Pontual — só esta tarefa
  [ ] Cascata — esta tarefa + dependentes
  [ ] De contrato — mudança na interface pública entre serviços
Status: Aberto / Em análise pelo CTO / Resolvido
```

**Regra do Charter:** nenhum agente decide e segue em silêncio sobre algo
ambíguo. Se não há documento que responda, abre incidente e aguarda o CTO.

---

## Suposições Pendentes de Validação

- [ ] **SUPOSIÇÃO-010:** O VPS escolhido suporta Docker Compose com os 4
  serviços + Evolution API simultaneamente (mínimo 2GB RAM, 20GB disco).
  Impacto se errada: upgrade de plano antes da Sprint 1.
- [ ] **SUPOSIÇÃO-011:** O agente de QA usará Cucumber.js para automação
  dos cenários Gherkin. Impacto se errada: apenas substituição da biblioteca,
  sem impacto na arquitetura.

---
id: CRMGC-INCIDENTS-007
title: Registro de Incidentes - CRM GC
version: 0.1.0
status: ACTIVE
owner: CTO
---

# Registro de Incidentes

## Incidente #001
Data: 2026-08-02
Agente que reportou: CEO
Problema:
  a) actions/checkout@v4 usa Node 20, descontinuado nos runners do GitHub
     desde 2025-09-19.
  b) O job de testes usava defaults.run.working-directory apontando para
     services/gateway, services/processador e services/message-store, que
     nao existem no repositorio - diretorios vazios nao sao versionados
     pelo Git. O working-directory e resolvido ANTES do step rodar, logo
     a verificacao condicional dentro do step nunca era alcancada.
Impacto: pipeline vermelho em toda PR e push na master. Bloqueava o
  critério 4.1 do Blueprint (pipeline executa automaticamente).
Sugestao tecnica (DevOps): migrar para checkout@v5 e substituir defaults
  por descoberta dinamica de servicos.
Nivel de rollback: Pontual - apenas .github/workflows/ci.yml.
Resolucao (CTO): DT-008 registrada. Job "discover" lista servicos com
  package.json e alimenta a matrix. Sem servico, o job test e skipped e o
  gate ci-ok aceita skipped como valido. Adicionados jobs shellcheck e
  compose, que sao validaveis desde a Sprint 1.
Status: Resolvido.

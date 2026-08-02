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

## Incidente #002
Data: 2026-08-02
Agente que reportou: CEO
Problema:
  a) O job de testes falhou com "Some specified paths were not resolved,
     unable to cache dependencies" porque
     services/message-store/package-lock.json nao estava versionado. O
     actions/setup-node com cache: npm exige que o cache-dependency-path
     exista, e o npm ci subsequente tambem depende do lockfile.
  b) actions/upload-artifact@v4 ainda executa em Node 20, descontinuado
     nos runners desde 2025-09-19.
  c) O gate ci-ok reprovou por propagacao, sem indicar qual job falhou.
Impacto: pipeline vermelho desde o merge da Sprint 3. Bloqueava o
  critério 4.1 do Blueprint.
Sugestao tecnica (DevOps): commitar o lockfile e tornar o cache
  condicional a sua existencia.
Nivel de rollback: Pontual - .github/workflows/ci.yml e adicao do lockfile.
Resolucao (CTO): DT-012 registrada.
  - package-lock.json gerado e versionado (build reproduzivel)
  - novo job lockfiles reprova qualquer servico com package.json sem lockfile
  - setup-node duplicado com condicao: com cache se houver lockfile, sem
    cache caso contrario
  - npm ci quando ha lockfile, npm install como fallback com warning
  - upload-artifact@v4 para @v5
  - gate ci-ok passa a nomear o job que falhou
  - novo job docker-build valida o Dockerfile multi-stage da Sprint 3
Status: Resolvido.

## Incidente #002
Data: 2026-08-02
Agente que reportou: CEO
Problema:
  a) O job de testes falhou com "Some specified paths were not resolved,
     unable to cache dependencies" porque
     services/message-store/package-lock.json nao estava versionado. O
     actions/setup-node com cache: npm exige que o cache-dependency-path
     exista, e o npm ci subsequente tambem depende do lockfile.
  b) actions/upload-artifact@v4 ainda executa em Node 20, descontinuado
     nos runners desde 2025-09-19.
  c) O gate ci-ok reprovou por propagacao, sem indicar qual job falhou.
Impacto: pipeline vermelho desde o merge da Sprint 3. Bloqueava o
  critério 4.1 do Blueprint.
Sugestao tecnica (DevOps): commitar o lockfile e tornar o cache
  condicional a sua existencia.
Nivel de rollback: Pontual - .github/workflows/ci.yml e adicao do lockfile.
Resolucao (CTO): DT-012 registrada.
  - package-lock.json gerado e versionado (build reproduzivel)
  - novo job lockfiles reprova qualquer servico com package.json sem lockfile
  - setup-node duplicado com condicao: com cache se houver lockfile, sem
    cache caso contrario
  - npm ci quando ha lockfile, npm install como fallback com warning
  - upload-artifact@v4 para @v5
  - gate ci-ok passa a nomear o job que falhou
  - novo job docker-build valida o Dockerfile multi-stage da Sprint 3
Status: Resolvido.

## Incidente #005
Data: 2026-08-02
Agente que reportou: CEO
Problema:
  a) A linha "F11_PLACEHOLDER=1" vazou do script bootstrap-sprint-3.sh para
     dentro de src/parser/webhook.ts, por estar posicionada antes do
     delimitador do heredoc. Erro TS2304.
  b) src/app.ts nao compilava: pino retorna Logger<never, boolean> (que expoe
     msgPrefix) e o generic do FastifyInstance infere esse tipo concreto,
     tornando-o inatribuivel ao FastifyBaseLogger declarado na interface App.
     Erros TS2345 e TS2322.
Impacto: o servico da Sprint 3 nao compilava. O job de testes do CI teria
  reprovado no typecheck.
Causa de processo: a Sprint 3 foi entregue sem que npm run typecheck fosse
  executado antes do commit. O bloqueio local so existia no script de
  correcao do Incidente #002, nao no bootstrap da propria sprint.
Nivel de rollback: Pontual - src/app.ts, src/lib/logger.ts, src/parser/webhook.ts.
Resolucao (CTO): DT-014 registrada.
  - vazamento removido e varredura por grep adicionada ao script
  - logger tipado explicitamente como FastifyBaseLogger em app.ts, com
    criarLogger declarando retorno Logger
  - nova suite tests/unit/integridade.test.ts falha se qualquer arquivo de
    src conter delimitador de heredoc ou marcador de conflito do git
Status: Resolvido.

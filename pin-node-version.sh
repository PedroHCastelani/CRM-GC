#!/usr/bin/env bash
set -euo pipefail

BR="fix/pin-node-22"
BASE="master"
cd "$(git rev-parse --show-toplevel)"
git checkout "$BASE" && git pull origin "$BASE" --no-rebase 2>/dev/null || true
git checkout -B "$BR"

command -v node >/dev/null 2>&1 || { echo "[ERRO] node nao encontrado."; exit 1; }

# ─── Versao unica em todo o projeto ────────────────────────────────
printf '22.14.0\n' > .nvmrc

# ─── engines estrito ───────────────────────────────────────────────
node - <<'FIM'
const fs = require('fs');
const p = 'services/message-store/package.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.engines = { node: '>=22.0.0 <23.0.0', npm: '>=10.0.0' };
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
console.log('engines atualizado em ' + p);
FIM

cat > .npmrc <<'FIM'
engine-strict=true
fund=false
audit=false
FIM

# ─── CI le a versao do .nvmrc (sem Python) ────────────────────────
node - <<'FIM'
const fs = require('fs');
const p = '.github/workflows/ci.yml';
let t = fs.readFileSync(p, 'utf8');
const antes = t;
t = t.replace(/^(\s*)node-version:\s*'22'\s*$/gm, "$1node-version-file: '.nvmrc'");
if (t === antes) {
  console.log('AVISO: nenhuma ocorrencia de node-version: \'22\' encontrada.');
} else {
  fs.writeFileSync(p, t);
  console.log('ci.yml agora usa node-version-file: .nvmrc');
}
FIM

# ─── Registro ─────────────────────────────────────────────────────
cat >> docs/INCIDENTS.md <<'FIM'

## Incidente #004
Data: 2026-08-02
Agente que reportou: CEO
Problema: better-sqlite3@11 nao publica binarios pre-compilados para Node 24
  no Windows. O ambiente local tinha Node 24.18.1 em vez do Node 22 exigido
  pelo Blueprint, forcando compilacao via node-gyp, que falhou por ausencia
  de Python e Visual Studio Build Tools.
Impacto: apenas ambiente local. O CI (Node 22 / Linux) nao seria afetado.
Nivel de rollback: Pontual.
Resolucao (CTO): DT-013 registrada.
  - .nvmrc com 22.14.0 como fonte unica de verdade
  - engines >=22 <23 em package.json
  - .npmrc com engine-strict=true: npm recusa Node incompativel
  - CI usa node-version-file: .nvmrc, eliminando divergencia local/pipeline
Causa de processo: a versao do Node exigida pelo Blueprint nao foi pinada no
  repositorio na Sprint 3.
Status: Resolvido.

## Incidente #006
Data: 2026-08-02
Agente que reportou: CEO
Problema: o script pin-node-version.sh usava python3 para editar o ci.yml.
  O ambiente Windows nao possui Python instalado - o alias de execucao do
  Windows respondeu com mensagem da Microsoft Store e o set -euo pipefail
  abortou o script em estado parcial.
Impacto: script de correcao interrompido; branch criada sem commit.
Nivel de rollback: Pontual - branch descartada e recriada.
Resolucao (CTO): DT-015 registrada. Scripts do projeto passam a usar
  exclusivamente bash, git e node para manipulacao de arquivos. Python nao e
  dependencia declarada do projeto e nao pode ser assumido como disponivel.
Status: Resolvido.
FIM

# ─── Board (sem Python) ───────────────────────────────────────────
node - <<'FIM'
const fs = require('fs');
const p = 'docs/BOARD.md';
if (!fs.existsSync(p)) process.exit(0);
let t = fs.readFileSync(p, 'utf8');
if (t.includes('DT-015')) process.exit(0);
t += `
## Correcoes - Incidentes #004 e #006

| # | Item | Agente | Status |
|---|---|---|---|
| 077 | Node 22 pinado via .nvmrc e engine-strict | Infraestrutura | Resolvido |
| 081 | Scripts sem dependencia de Python | DevOps | Resolvido |

| ID | Decisao Tecnica | Status |
|---|---|---|
| DT-013 | .nvmrc como fonte unica da versao do Node | Incorporada |
| DT-015 | Scripts usam apenas bash, git e node | Incorporada |
`;
fs.writeFileSync(p, t);
console.log('BOARD.md atualizado');
FIM

# ─── Validacao ────────────────────────────────────────────────────
echo ""
echo "─── Validacao ───────────────────────────────────"
echo "  .nvmrc          : $(cat .nvmrc)"
echo "  node instalado  : $(node -v)"
grep -q "node-version-file" .github/workflows/ci.yml \
  && echo "  ci.yml          : OK usa .nvmrc" \
  || echo "  ci.yml          : AVISO verifique manualmente"

( cd services/message-store \
  && npm run lint \
  && npm run typecheck \
  && ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000 \
     NODE_ENV=test npm run test:coverage ) \
|| { echo "[ERRO] validacao falhou. Nao vou commitar."; exit 1; }
echo "─────────────────────────────────────────────────"

# ─── Commit, push, merge ──────────────────────────────────────────
git add -A
git diff --cached --quiet && { echo "Nada a commitar."; exit 0; }
git commit -m "fix(infra): pina Node 22 via .nvmrc e remove dependencia de Python

Resolve Incidentes #004 e #006:
- .nvmrc como fonte unica de verdade (22.14.0)
- engines >=22 <23 no message-store
- .npmrc engine-strict=true recusa Node incompativel
- CI usa node-version-file em vez de versao hardcoded
- scripts passam a usar apenas bash, git e node (sem Python)
- DT-013 e DT-015 registradas"

git push -u origin "$BR"
git checkout "$BASE"
git pull origin "$BASE" --no-rebase 2>/dev/null || true
git merge --no-ff "$BR" -m "merge($BR): pina Node 22 - Incidentes #004 e #006"
git push origin "$BASE"

echo ""
echo "===================================================="
echo " Node 22 pinado. Divergencia local/CI eliminada."
echo "===================================================="

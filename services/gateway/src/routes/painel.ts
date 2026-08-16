import type { FastifyInstance } from 'fastify';

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM GC — Painel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #222; padding: 2rem; }
    h1 { font-size: 1.4rem; margin-bottom: 1.5rem; color: #1a3a2a; }
    .card { background: #fff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .label { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .25rem; }
    .value { font-size: 1rem; font-weight: 600; }
    .status-ok { color: #1a7a4a; }
    .status-erro { color: #c0392b; }
    .status-rodando { color: #e67e22; }
    button { background: #1a3a2a; color: #fff; border: none; padding: .75rem 1.5rem; border-radius: 6px; font-size: 1rem; cursor: pointer; width: 100%; margin-top: .5rem; }
    button:disabled { background: #aaa; cursor: not-allowed; }
    .msg { margin-top: .75rem; font-size: .9rem; color: #555; min-height: 1.2rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  </style>
</head>
<body>
  <h1>CRM GC — Painel de Controle</h1>

  <div class="card">
    <div class="label">Status do Processador</div>
    <div class="value" id="status">Carregando...</div>
    <div class="grid" style="margin-top:1rem">
      <div>
        <div class="label">Ultima execucao</div>
        <div class="value" id="ultima">—</div>
      </div>
      <div>
        <div class="label">Leads processados</div>
        <div class="value" id="leads">—</div>
      </div>
    </div>
    <div class="msg" id="erro"></div>
  </div>

  <div class="card">
    <div class="label">Acao manual</div>
    <button id="btn" onclick="disparar()">Processar agora</button>
    <div class="msg" id="msg"></div>
  </div>

  <script>
    async function carregarStatus() {
      try {
        const r = await fetch('/status');
        const d = await r.json();
        const el = document.getElementById('status');
        if (d.status === 'ok') { el.textContent = 'OK'; el.className = 'value status-ok'; }
        else if (d.status === 'rodando') { el.textContent = 'Rodando...'; el.className = 'value status-rodando'; }
        else if (d.status === 'idle' || d.status === 'nunca_executado') { el.textContent = 'Aguardando'; el.className = 'value'; }
        else { el.textContent = d.status; el.className = 'value status-erro'; }
        if (d.ultima_execucao) {
          document.getElementById('ultima').textContent = new Date(d.ultima_execucao * 1000).toLocaleString('pt-BR');
        }
        if (d.leads_afetados !== null) document.getElementById('leads').textContent = d.leads_afetados;
        if (d.erro) document.getElementById('erro').textContent = 'Ultimo erro: ' + d.erro;
      } catch { document.getElementById('status').textContent = 'Indisponivel'; }
    }

    async function disparar() {
      const btn = document.getElementById('btn');
      const msg = document.getElementById('msg');
      btn.disabled = true;
      msg.textContent = 'Iniciando...';
      try {
        const r = await fetch('/trigger', { method: 'POST' });
        const d = await r.json();
        msg.textContent = d.mensagem;
        setTimeout(carregarStatus, 2000);
      } catch { msg.textContent = 'Erro ao acionar o processador.'; }
      finally { setTimeout(() => { btn.disabled = false; }, 3000); }
    }

    carregarStatus();
    setInterval(carregarStatus, 30000);
  </script>
</body>
</html>`;

export async function painelRoute(app: FastifyInstance): Promise<void> {
  app.get('/', async (_req, reply) => {
    return reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(HTML);
  });
}

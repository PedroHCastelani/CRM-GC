import { loadConfig } from './config.js';
import { criarApp } from './app.js';

const cfg = loadConfig();
const { app, store } = criarApp(cfg);

for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sinal, () => {
    app.log.info({ sinal }, 'encerrando');
    void app.close().then(() => { store.fechar(); process.exit(0); });
  });
}

app.listen({ port: cfg.port, host: '0.0.0.0' })
  .catch((e: unknown) => { app.log.error(e); process.exit(1); });

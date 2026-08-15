PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS leads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  telefone_hash     TEXT    NOT NULL UNIQUE,
  telefone_cifrado  TEXT    NOT NULL,
  nome_cifrado      TEXT    NOT NULL DEFAULT '',
  notion_page_id    TEXT,
  estagio           TEXT    NOT NULL DEFAULT 'novo',
  criado_em         INTEGER NOT NULL,
  atualizado_em     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mensagens (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id          INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  external_id      TEXT    NOT NULL UNIQUE,
  conteudo_cifrado TEXT    NOT NULL,
  direcao          TEXT    NOT NULL CHECK (direcao IN ('in','out')),
  timestamp        INTEGER NOT NULL,
  instancia        TEXT    NOT NULL,
  processado       INTEGER NOT NULL DEFAULT 0 CHECK (processado IN (0,1)),
  criado_em        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_msg_lead        ON mensagens(lead_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_msg_processado  ON mensagens(processado, timestamp);
CREATE INDEX IF NOT EXISTS idx_leads_estagio   ON leads(estagio);

CREATE TABLE IF NOT EXISTS webhook_descartes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  motivo     TEXT    NOT NULL,
  detalhe    TEXT,
  criado_em  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_descarte_data ON webhook_descartes(criado_em);

CREATE TABLE IF NOT EXISTS batch_estado (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  ultima_execucao INTEGER,
  status          TEXT    NOT NULL DEFAULT 'idle',
  leads_afetados  INTEGER NOT NULL DEFAULT 0,
  erro            TEXT
);

INSERT OR IGNORE INTO batch_estado (id, status) VALUES (1, 'idle');

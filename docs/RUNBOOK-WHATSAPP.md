---
id: CRMGC-RUNBOOK-006
title: Runbook - Integracao WhatsApp (Evolution API)
version: 0.1.0
status: ACTIVE
owner: Agente de Integracao WhatsApp
depends_on: [CRMGC-OPS-003A, CRMGC-DOMAIN-002]
---

# Runbook - Evolution API

## 1. Subir os servicos

    docker compose up -d evolution-db evolution-api
    docker compose logs -f evolution-api

Aguarde a linha indicando servidor ouvindo na porta 8080.

## 2. Conectar o WhatsApp (H-06)

    ./scripts/evolution/create-instance.sh

O QR Code aparece no terminal (requer qrencode: apt install qrencode).
No celular: WhatsApp > Aparelhos conectados > Conectar aparelho.

Validar:

    ./scripts/evolution/status.sh

Estado esperado: open.

## 3. Configurar o webhook (item 011)

Ja e configurado na criacao da instancia. Para reconfigurar:

    ./scripts/evolution/set-webhook.sh

## 4. Reconexao automatica (item 012)

Instalar no crontab da VPS:

    */5 * * * * cd /opt/crm-gc && ./scripts/evolution/watchdog.sh >> /var/log/crmgc-watchdog.log 2>&1

Comportamento:
- Estado open: apenas registra OK
- API sem resposta: reinicia o container evolution-api
- Estado close: chama /instance/restart e revalida
- Falha persistente: exit code 2 e exige novo QR Code (H-06)

## 5. Testar sem WhatsApp real

    ./scripts/evolution/simulate-webhook.sh
    ./scripts/evolution/simulate-webhook.sh 5535911112222 "Maria" "Meu pai tem 72 anos"

Payload identico ao contrato DT-001. Permite validar a Sprint 3
antes de conectar o numero real.

## 6. Seguranca (SecOps)

- Porta 8080 exposta somente em 127.0.0.1 (docker-compose)
- Firewall UFW nao libera 8080
- AUTHENTICATION_API_KEY obrigatoria em toda chamada
- groupsIgnore true: mensagens de grupo descartadas na origem
- readMessages false: nao marca mensagens como lidas (lead nao percebe automacao)
- rejectCall true: chamadas recusadas automaticamente
- syncFullHistory false: nao importa historico antigo (minimiza dados sensiveis)

## 7. Problemas comuns

| Sintoma | Causa provavel | Acao |
|---|---|---|
| QR Code nao aparece | Container ainda subindo | Aguardar 30s e repetir |
| Estado fica em connecting | QR expirou (validade ~60s) | Rodar create-instance.sh de novo |
| Webhook nao chega | Message Store fora do ar (Sprint 3) | docker compose ps message-store |
| Desconecta com frequencia | Celular sem internet ou WhatsApp Web aberto em outro lugar | Fechar outras sessoes |
| Erro 401 nas chamadas | EVOLUTION_API_KEY divergente | Conferir .env |

## 8. Nota sobre o contrato DT-001

O parser do Message Store (Sprint 3) deve tratar:
- data.key.fromMe true: descartar (nao e mensagem de lead)
- remoteJid com sufixo @s.whatsapp.net ou @lid: extrair somente o numero
- pushName null (leads vindos de anuncio FB/Instagram): gravar string vazia
- messageType diferente de conversation: descartar com log

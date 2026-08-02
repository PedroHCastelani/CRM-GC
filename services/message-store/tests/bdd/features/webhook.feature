# language: pt
Funcionalidade: Recebimento de mensagens do WhatsApp
  Como sistema de CRM
  Quero persistir com seguranca as mensagens recebidas dos leads
  Para que o Processador possa analisa-las no batch noturno

  Contexto:
    Dado que o Message Store esta em execucao
    E que o banco SQLite esta acessivel

  Cenario: Mensagem de lead novo
    Quando a Evolution API envia messages.upsert de um numero desconhecido
    Entao um lead deve ser criado
    E a mensagem deve ser persistida criptografada
    E a resposta deve ser HTTP 201

  Cenario: Segunda mensagem do mesmo lead
    Dado que o lead 5535999998888 ja existe
    Quando ele envia outra mensagem
    Entao nenhum lead novo deve ser criado
    E o total de mensagens do lead deve ser 2

  Cenario: Webhook reenviado
    Dado que uma mensagem com external_id MSG1 ja foi persistida
    Quando o mesmo payload e reenviado
    Entao a resposta deve indicar duplicada
    E o total de mensagens deve permanecer 1

  Cenario: Mensagem enviada pela clinica
    Quando chega um payload com key.fromMe igual a true
    Entao a mensagem deve ser descartada
    E o motivo registrado deve ser mensagem_propria

  Cenario: Mensagem de grupo
    Quando chega um payload com remoteJid terminando em @g.us
    Entao a mensagem deve ser descartada com motivo grupo

  Cenario: Tipo nao suportado
    Quando chega uma mensagem de audio
    Entao a mensagem deve ser descartada com motivo tipo_nao_suportado
    E o descarte deve ser auditado na tabela webhook_descartes

  Cenario: Payload malformado
    Quando chega um payload que nao segue o contrato DT-001
    Entao a resposta deve ser HTTP 200 com status ignorado
    E o servico deve continuar saudavel

# Testes

## Estrategia Inicial

Os testes devem ser adicionados desde o inicio da migracao. Cada fase funcional deve ter validacao automatizada quando possivel e validacao manual documentada.

## Backend

Framework inicial:

- Vitest
- Supertest

Comandos previstos:

```bash
cd backend
npm install
npm test
```

Teste inicial:

- `GET /api/health` deve responder `200` com `{ "status": "ok", "service": "oramix-ai-backend" }`.
- Models Mongoose devem validar defaults, campos obrigatorios, limites e indices esperados sem ligar a base online.
- API generica de entidades deve validar entidades permitidas e parametros `q`, `limit`, `skip` e `sort_by`.
- Scripts de importacao devem testar parsing CSV e mapeamento de campos sem escrever na base online.
- Autenticacao deve testar hash de password e assinatura/verificacao JWT sem escrever na base online.
- Auditoria deve testar model `AuditLog` e protecao do endpoint de leitura.
- `quizSession` deve testar validacao de email corporativo, acao desconhecida e funcoes ainda nao migradas.
- `createDataSubAssessment` deve testar eventos sem ID, score alto, subavaliacoes existentes e parsing seguro de `pillar_scores`.

## Frontend

O frontend possui um adaptador local em `frontend/src/api/base44Client.js`.

Validacoes atuais:

- Build Vite deve concluir sem o plugin Base44.
- Chamadas `base44.entities.*` devem apontar para `/api/entities`.
- Autenticacao, funcoes serverless, convites e LLM ainda nao estao migrados.

## Validacao Manual Minima

Para cada tarefa:

- Confirmar que os ficheiros esperados foram criados ou alterados.
- Rodar testes relacionados quando as dependencias estiverem instaladas.
- Confirmar que o frontend nao mudou visualmente quando a tarefa nao envolver UI.
- Nunca rodar testes automatizados contra a base MongoDB de producao.

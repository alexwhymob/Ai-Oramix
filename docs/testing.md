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

## Frontend

O frontend ainda nao foi alterado funcionalmente. Os testes de frontend devem ser definidos quando a camada de API propria substituir chamadas Base44.

## Validacao Manual Minima

Para cada tarefa:

- Confirmar que os ficheiros esperados foram criados ou alterados.
- Rodar testes relacionados quando as dependencias estiverem instaladas.
- Confirmar que o frontend nao mudou visualmente quando a tarefa nao envolver UI.
- Nunca rodar testes automatizados contra a base MongoDB de producao.

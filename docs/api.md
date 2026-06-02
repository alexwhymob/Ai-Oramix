# API

## Objetivo

Esta documentacao descreve o mapeamento inicial entre chamadas Base44 e a futura API propria em Node.js/Express.

## Padrao de Entidades

As chamadas atuais do frontend usam metodos como:

```js
base44.entities.Customer.list()
base44.entities.Customer.filter({ email })
base44.entities.Customer.get(id)
base44.entities.Customer.create(data)
base44.entities.Customer.update(id, data)
base44.entities.Customer.delete(id)
```

A nova API deve expor endpoints equivalentes:

```txt
GET    /api/entities/:entity
POST   /api/entities/:entity
POST   /api/entities/:entity/bulk
GET    /api/entities/:entity/:id
PUT    /api/entities/:entity/:id
DELETE /api/entities/:entity/:id
```

Implementado na Fase 4 para entidades registradas explicitamente no backend.

Na Fase 6, o frontend passou a usar esta API por meio de `frontend/src/api/base44Client.js`, mantendo a assinatura `base44.entities.*`.

## Query Parameters

Parametros esperados:

- `q`: filtro JSON serializado.
- `limit`: limite de registros.
- `skip`: offset para paginacao.
- `sort_by`: campo de ordenacao. Prefixo `-` indica descendente.

Exemplo:

```txt
GET /api/entities/Assessment?q={"status":"completed"}&limit=100&skip=0&sort_by=-completed_at
```

Filtros que usam operadores MongoDB iniciados por `$` ou campos com `.` sao removidos por seguranca nesta fase inicial.

## Entidades Iniciais

Endpoints devem existir para:

- `Customer`
- `Assessment`
- `AssessmentAnswer`
- `Pillar`
- `Question`
- `Report`
- `ConsultantNote`
- `User`

## Erros Comuns

Entidade desconhecida:

```json
{
  "error": "entity_not_found",
  "message": "Entity UnknownEntity not found"
}
```

Query invalida:

```json
{
  "error": "invalid_query",
  "message": "Invalid q parameter. Expected JSON object."
}
```

## Funcoes

Chamadas atuais:

```js
base44.functions.invoke('quizSession', payload)
base44.functions.invoke('createDataSubAssessment', payload)
base44.functions.invoke('generateReport', payload)
base44.functions.invoke('sendReport', payload)
```

Endpoints propostos:

```txt
POST /api/functions/quizSession
POST /api/functions/createDataSubAssessment
POST /api/functions/generateReport
POST /api/functions/sendReport
```

Esses endpoints ainda nao estao implementados no backend. O frontend possui o cliente `functions.invoke`, mas as funcoes serao migradas em fases posteriores.

## Health Check

Endpoint criado na Fase 2:

```txt
GET /api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "oramix-ai-backend"
}
```

## Autenticacao

Chamadas atuais:

```js
base44.auth.me()
base44.auth.loginViaEmailPassword(email, password)
base44.auth.logout()
base44.auth.register({ email, password })
base44.auth.resetPasswordRequest(email)
base44.auth.resetPassword({ resetToken, newPassword })
```

Endpoints propostos:

```txt
GET  /api/auth/me
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Autenticacao ainda nao foi migrada. O frontend contem stubs controlados ate a fase JWT.

## Integracoes

Uso atual:

```js
base44.integrations.Core.InvokeLLM(...)
```

Alternativa proposta:

```txt
POST /api/integrations/llm
```

Na primeira fase, essa rota pode ser evitada no frontend e encapsulada diretamente no backend dentro de `generateReport`.

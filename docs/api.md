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

O frontend usa o cliente `functions.invoke` para chamar esses endpoints no backend proprio.

Implementado na Fase 8:

```txt
POST /api/functions/quizSession
POST /api/functions/createDataSubAssessment
POST /api/functions/generateReport
POST /api/functions/sendReport
```

Acoes suportadas:

- `registerCustomer`
- `adminRegister`
- `load`
- `submit`
- `loadSub`
- `submitSub`
- `getResult`
- `getSubAssessments`
- `getSubResult`

Funcoes ainda nao migradas retornam `501 function_not_migrated`.

`registerCustomer` exige consentimento de tratamento de dados no payload `form`:

```json
{
  "data_consent": true,
  "data_consent_at": "2026-06-03T10:00:00.000Z"
}
```

Se o consentimento estiver ausente, a API retorna `422 data_consent_required`.

`createDataSubAssessment` cria uma subavaliacao para o pilar `dados` quando:

- o assessment principal esta `completed`;
- nao e uma subavaliacao;
- `pillar_scores` contem `dados` com score inferior a `2.5`;
- ainda nao existe subavaliacao para o assessment pai.

`generateReport` agora:

- exige autenticacao;
- permite `admin` e `ai_consultant`;
- usa a nossa camada de LLM no backend;
- gera secoes `section_1` a `section_9` em grupos paralelos;
- grava/atualiza `Report` com `status: review`, `generated_at` e `language`.

Payload esperado:

```json
{
  "assessmentId": "assessment-id",
  "language": "pt",
  "sections": ["section_1", "section_2", "section_3"]
}
```

Resposta esperada:

```json
{
  "success": true,
  "reportId": "report-id",
  "sectionsGenerated": ["section_1", "section_2", "section_3"]
}
```

`sendReport` agora:

- exige autenticacao;
- permite `admin` e `account_manager`;
- exige que exista um `Report` para o assessment;
- envia uma notificacao ao e-mail do cliente atraves do provider configurado;
- registra auditoria com `report.send`.

Payload esperado:

```json
{
  "assessmentId": "assessment-id",
  "appUrl": "https://app.example.com"
}
```

Resposta esperada:

```json
{
  "success": true,
  "to": "cliente@empresa.pt",
  "provider": "resend",
  "messageId": "email-provider-id"
}
```

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
base44.users.inviteUser(email, role)
```

Endpoints propostos:

```txt
GET  /api/auth/me
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/users/invite
```

Autenticacao ainda nao foi migrada. O frontend contem stubs controlados ate a fase JWT.

Implementado na Fase 7 e extendido nas fases seguintes:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/auth/logout
POST /api/users/invite
```

`GET /api/auth/me` exige header:

```txt
Authorization: Bearer <token>
```

`POST /api/users/invite`:

- exige autenticacao;
- permite apenas `admin`;
- cria o utilizador se nao existir;
- atualiza o `role` se o utilizador ja existir;
- envia e-mail de convite com link para `/reset-password?token=...`.

## Audit Logs

Endpoint protegido para administradores e consultores:

```txt
GET /api/audit-logs
```

Suporta os mesmos parametros `q`, `limit`, `skip` e `sort_by`.

## Integracoes

Uso atual:

```js
base44.integrations.Core.InvokeLLM(...)
```

Endpoint implementado:

```txt
POST /api/integrations/llm
```

Comportamento atual:

- exige autenticacao;
- permite `admin` e `ai_consultant`;
- usa a mesma camada de provider LLM do backend;
- retorna texto simples no formato:

```json
{
  "text": "..."
}
```

Neste momento, `AssessmentDetail` usa esta rota para gerar notas de gap e mitigacao com OpenAI.

# API

## Objetivo

Esta documentacao descreve a API propria em Node.js/Express e o mapeamento de compatibilidade mantido no frontend.

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

Implementado para todas as entidades registadas em `backend/src/entities/entityRegistry.js`.

O frontend usa esta API por meio de `frontend/src/api/base44Client.js`, mantendo temporariamente a assinatura `base44.entities.*` sem depender do SDK Base44.

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

## Autorizacao de Entidades

Regras principais:

- `Pillar` e `Question`: leitura publica para suportar o quiz; escrita apenas para `admin`.
- `User`: acesso apenas para `admin`.
- `Customer`: `admin` ve tudo; `ai_consultant` apenas leitura; `account_manager` ve e edita apenas clientes associados por `account_manager_id` ou `created_by_id`.
- `Assessment`: `admin` e `ai_consultant` veem tudo; `account_manager` ve apenas assessments dos seus clientes.
- `AssessmentAnswer`: leitura limitada pelo assessment; escrita direta bloqueada para roles nao admin.
- `Report` e `ConsultantNote`: `admin` e `ai_consultant` podem editar; `account_manager` apenas le dados dos seus clientes.

Chamadas sem permissao retornam `401 auth_required` ou `403 forbidden`.

Pedidos de escrita com cookies sao aceites apenas quando o header `Origin` coincide com `FRONTEND_URL`. Pedidos sem `Origin`, comuns em integrações servidor-servidor, continuam permitidos e devem ser protegidos por autenticação adequada.

## Entidades Disponiveis

Os endpoints genericos estao disponiveis para:

- `Customer`
- `Assessment`
- `AssessmentTemplate`
- `AssessmentAnswer`
- `PresentationTemplate`
- `ReportTemplate`
- `ReportSection`
- `NotificationTemplate`
- `MaturityPreset`
- `MaturityLevel`
- `HtmlReportConfig`
- `Pillar`
- `Question`
- `Report`
- `ConsultantNote`
- `User`

As permissoes variam por entidade e role. A lista anterior nao significa que todas as entidades possam ser lidas ou alteradas publicamente.

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
base44.functions.invoke('exportPresentation', payload)
```

Endpoints:

```txt
POST /api/functions/quizSession
POST /api/functions/createDataSubAssessment
POST /api/functions/generateReport
POST /api/functions/sendReport
POST /api/functions/exportPresentation
```

O frontend usa o cliente `functions.invoke` para chamar esses endpoints no backend proprio.

Implementado:

```txt
POST /api/functions/quizSession
POST /api/functions/createDataSubAssessment
POST /api/functions/generateReport
POST /api/functions/sendReport
POST /api/functions/exportPresentation
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

`exportPresentation`:

- exige autenticacao;
- valida a permissao sobre o assessment;
- usa o template PPT selecionado ou o template ativo por defeito;
- gera uma apresentacao `.pptx` com os dados, notas e graficos do assessment;
- devolve o ficheiro codificado em base64 para download no frontend;
- registra auditoria com `report.export_presentation`.
- URLs de branding aceitam apenas HTTPS, imagens raster permitidas e tamanho maximo de 5 MB; destinos locais/privados sao rejeitados para evitar SSRF.

Payload esperado:

```json
{
  "assessmentId": "assessment-id",
  "language": "pt",
  "presentationTemplateId": "presentation-template-id"
}
```

Resposta esperada:

```json
{
  "success": true,
  "fileName": "Apresentacao_Executiva_Empresa_2026-06-03.pptx",
  "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "contentBase64": "..."
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

Endpoints:

```txt
GET  /api/auth/me
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/mfa/verify
GET  /api/auth/mfa/setup
POST /api/auth/mfa/confirm
POST /api/auth/mfa/disable
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/users/invite
PUT  /api/users/:userId
POST /api/users/:userId/resend-invite
POST /api/users/:userId/unlock-login
GET  /api/users/ai-provider-config
PUT  /api/users/ai-provider-config
GET  /api/users/ai-provider-models?provider=openai
GET  /api/notifications/public-key
POST /api/notifications/subscribe
POST /api/notifications/unsubscribe
```

Implementado com JWT e extendido nas fases seguintes:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/auth/logout
POST /api/users/invite
PUT  /api/users/:userId
POST /api/users/:userId/resend-invite
POST /api/users/:userId/unlock-login
GET  /api/users/ai-provider-config
PUT  /api/users/ai-provider-config
GET  /api/users/ai-provider-models?provider=openai
```

`GET /api/auth/me` usa automaticamente o cookie HttpOnly de sessao. O header Bearer continua aceite para compatibilidade operacional:

```txt
Authorization: Bearer <token>
```

`POST /api/auth/login` e `POST /api/auth/register` definem cookies HttpOnly e devolvem apenas os dados publicos do utilizador. Os tokens nao sao devolvidos no JSON.

`POST /api/auth/refresh` exige o cookie `oramix_refresh_token`, valida a sessao e substitui o refresh token anterior por um novo. Uma tentativa de reutilizar um refresh token ja rotacionado revoga a sessao e gera `security.refresh_token_reuse`.

`POST /api/auth/logout` e idempotente, limpa os cookies e revoga a sessao quando um token identificavel esta presente.

MFA para administradores:

- `POST /api/auth/mfa/verify` valida o desafio temporario devolvido quando um admin com MFA ativo faz login.
- `GET /api/auth/mfa/setup` cria um segredo TOTP temporario e devolve o URI `otpauth`.
- `POST /api/auth/mfa/confirm` confirma o primeiro codigo e ativa MFA, devolvendo codigos de recuperacao uma unica vez.
- `POST /api/auth/mfa/disable` desativa MFA para o administrador autenticado.

Os segredos MFA nunca sao devolvidos pela API depois da configuracao.

Web Push:

- `GET /api/notifications/public-key` devolve a chave publica VAPID quando o provider esta configurado.
- `POST /api/notifications/subscribe` grava a subscricao do browser para o utilizador autenticado.
- `POST /api/notifications/unsubscribe` desativa uma subscricao do browser.

As notificacoes sao enviadas aos admins ativos e ao account manager associado quando uma avaliacao e concluida pela primeira vez. O payload nao inclui dados sensiveis da empresa.

Falhas repetidas de login por conta podem devolver `429 auth_temporarily_locked`. O bloqueio e progressivo e a suspeita e registada em auditoria.
Para utilizadores existentes, o contador e o bloqueio ficam persistidos em `User.login_*`, permitindo que o Admin os consulte e desbloqueie.

`POST /api/users/invite`:

- exige autenticacao;
- permite apenas `admin`;
- cria o utilizador se nao existir;
- atualiza o `role` se o utilizador ja existir;
- envia e-mail de convite com link para `/reset-password?token=...`.

`PUT /api/users/:userId`:

- exige autenticacao de `admin`;
- permite editar nome, role e estado ativo do utilizador;
- registra auditoria com `user.updated`.

`POST /api/users/:userId/resend-invite`:

- exige autenticacao de `admin`;
- reenvia o convite para o utilizador indicado;
- registra auditoria com `user.invite_resent`.

`POST /api/users/:userId/unlock-login`:

- exige autenticacao de `admin`;
- exige `justification` entre 5 e 500 caracteres;
- limpa as tentativas e o bloqueio persistido da conta;
- registra auditoria com `security.login_unlocked`, incluindo a justificativa.

Payload:

```json
{
  "justification": "Bloqueio confirmado como falso positivo apos contacto com o utilizador."
}
```

`GET /api/users/ai-provider-config`:

- exige autenticacao de `admin`;
- devolve provider e modelo selecionados;
- devolve apenas o estado e a mascara das API keys, nunca a chave completa;
- lista providers e modelos suportados.

`PUT /api/users/ai-provider-config`:

- exige autenticacao de `admin`;
- permite selecionar `openai` ou `anthropic`;
- permite selecionar o modelo suportado;
- grava uma nova API key apenas quando fornecida;
- preserva a chave existente quando `apiKey` fica vazio.

Payload esperado:

```json
{
  "provider": "openai",
  "model": "gpt-5.4-mini",
  "apiKey": "sk-..."
}
```

`GET /api/users/ai-provider-models?provider=openai` devolve a lista de modelos permitidos para o provider escolhido.

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

Endpoint generico implementado:

```txt
POST /api/integrations/:integrationName
```

Integracao atualmente disponivel:

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

# Changelog

## 2026-06-02

### Tarefa

Migracao da funcao Base44 `quizSession`.

### Ficheiros alterados

- `backend/src/services/quizSession.service.js`
- `backend/src/controllers/functions.controller.js`
- `backend/src/routes/functions.routes.js`
- `backend/src/app.js`
- `backend/tests/quizSession.service.test.js`
- `backend/tests/functions.routes.test.js`
- `docs/api.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Alto. O fluxo de registo de cliente, carregamento do quiz, submissao de respostas e resultados passa a existir no backend proprio.

### Observacoes

`createDataSubAssessment`, `generateReport` e `sendReport` ainda retornam `function_not_migrated` e devem ser migradas nas proximas tarefas.

## 2026-06-02

### Tarefa

Adicao de auditoria de atividade.

### Ficheiros alterados

- `backend/src/models/AuditLog.js`
- `backend/src/models/index.js`
- `backend/src/services/auditLog.service.js`
- `backend/src/controllers/auditLogs.controller.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/controllers/entities.controller.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/routes/auditLogs.routes.js`
- `backend/src/app.js`
- `backend/tests/auditLogs.routes.test.js`
- `backend/tests/models.test.js`
- `docs/audit.md`
- `docs/api.md`
- `docs/database.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Medio. A aplicacao passa a registrar eventos de auth e alteracoes de entidades para consulta administrativa.

### Observacoes

A escrita do log e tolerante a falhas. Ainda nao ha pagina visual no frontend para os administradores consultarem logs.

## 2026-06-02

### Tarefa

Implementacao inicial de autenticacao JWT.

### Ficheiros alterados

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/config/env.js`
- `backend/src/app.js`
- `backend/src/services/auth.service.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/routes/auth.routes.js`
- `backend/tests/auth.service.test.js`
- `frontend/src/api/apiClient.js`
- `frontend/src/api/authClient.js`
- `frontend/src/lib/AuthContext.jsx`
- `frontend/src/pages/Register.jsx`
- `docs/auth.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Alto. O projeto passa a ter login/registo basico proprio com JWT. Fluxos avancados de auth ainda nao foram migrados.

### Observacoes

`JWT_SECRET` deve existir apenas em ambiente local/servidor. Nenhum segredo foi versionado.

## 2026-06-02

### Tarefa

Criacao da camada de API local no frontend para entidades.

### Ficheiros alterados

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.js`
- `frontend/src/api/apiClient.js`
- `frontend/src/api/entitiesClient.js`
- `frontend/src/api/functionsClient.js`
- `frontend/src/api/authClient.js`
- `frontend/src/api/usersClient.js`
- `frontend/src/api/integrationsClient.js`
- `frontend/src/api/base44Client.js`
- `frontend/src/lib/AuthContext.jsx`
- `docs/api.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Alto. O frontend deixa de depender do SDK/plugin Base44 para entidades e passa a usar a nossa API em `/api/entities`.

### Observacoes

Autenticacao, funcoes serverless, convites de usuarios e LLM ainda nao foram migrados. Esses pontos possuem clientes/stubs controlados ate as fases seguintes.

## 2026-06-02

### Tarefa

Criacao dos scripts de importacao CSV para a nossa MongoDB.

### Ficheiros alterados

- `backend/package.json`
- `backend/src/scripts/importCsv/parseCsv.js`
- `backend/src/scripts/importCsv/importUtils.js`
- `backend/src/scripts/importCsv/importPillars.js`
- `backend/src/scripts/importCsv/importQuestions.js`
- `backend/src/scripts/importCsv/importAssessmentAnswers.js`
- `backend/src/scripts/importCsv/importAll.js`
- `backend/tests/importCsv.test.js`
- `docs/database.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Medio. Foram adicionados scripts manuais de importacao para popular a nossa MongoDB a partir dos CSVs exportados. Nenhuma importacao e executada automaticamente.

### Observacoes

Os scripts usam Mongoose e `MONGODB_URI` local. Nao ha qualquer envio de dados para Base44.

### Resultado da importacao

Importacao executada com sucesso para a nossa MongoDB:

- `Pillar`: 14 lidos, 14 inseridos, 0 atualizados, 0 erros.
- `Question`: 72 lidos, 72 inseridos, 0 atualizados, 0 erros.
- `AssessmentAnswer`: 307 lidos, 307 inseridos, 0 atualizados, 0 erros.

Foi corrigido o middleware de timestamps em `backend/src/models/baseFields.js` para compatibilidade com a versao atual do Mongoose.

## 2026-06-02

### Tarefa

Criacao da API generica de entidades compativel com `base44.entities`.

### Ficheiros alterados

- `backend/src/app.js`
- `backend/src/entities/entityRegistry.js`
- `backend/src/entities/entityQuery.js`
- `backend/src/entities/entityService.js`
- `backend/src/controllers/entities.controller.js`
- `backend/src/routes/entities.routes.js`
- `backend/tests/entityQuery.test.js`
- `backend/tests/entities.routes.test.js`
- `backend/tests/models.test.js`
- `docs/api.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Medio. O backend passa a expor endpoints CRUD genericos em `/api/entities/:entity`. O frontend ainda nao foi alterado.

### Observacoes

A API so permite entidades registradas no backend e sanitiza filtros basicos para evitar operadores MongoDB em query string.

## 2026-06-02

### Tarefa

Adicao da camada MongoDB/Mongoose e models das entidades Base44.

### Ficheiros alterados

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/config/env.js`
- `backend/src/config/db.js`
- `backend/src/server.js`
- `backend/src/models/baseFields.js`
- `backend/src/models/Customer.js`
- `backend/src/models/Assessment.js`
- `backend/src/models/AssessmentAnswer.js`
- `backend/src/models/Pillar.js`
- `backend/src/models/Question.js`
- `backend/src/models/Report.js`
- `backend/src/models/ConsultantNote.js`
- `backend/src/models/User.js`
- `backend/src/models/index.js`
- `backend/tests/models.test.js`
- `docs/database.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/migration-plan.md`
- `docs/changelog.md`

### Impacto

Medio. O backend agora possui configuracao de MongoDB e models Mongoose. Nenhuma chamada do frontend foi alterada.

### Observacoes

Credenciais e arquivos `.env*` continuam fora do repositorio. Testes de models nao usam a base MongoDB online.

## 2026-06-02

### Tarefa

Separacao inicial de frontend/backend e setup base do backend Express.

### Ficheiros alterados

- `frontend/`
- `.gitignore`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env.example`
- `backend/src/app.js`
- `backend/src/server.js`
- `backend/src/config/env.js`
- `backend/src/routes/health.routes.js`
- `backend/src/middlewares/error.middleware.js`
- `backend/tests/health.test.js`
- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/api.md`
- `docs/testing.md`
- `docs/deployment.md`
- `docs/changelog.md`

### Impacto

Baixo. A aplicacao frontend foi movida para `frontend/` e o backend foi criado isolado com health check inicial.

### Observacoes

As chamadas Base44 do frontend ainda nao foram alteradas. O backend ainda nao se liga ao MongoDB.

## 2026-06-02

### Tarefa

Criacao da documentacao inicial de migracao.

### Ficheiros alterados

- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/api.md`
- `docs/changelog.md`

### Impacto

Sem impacto funcional. Nenhum codigo da aplicacao foi alterado.

### Observacoes

Esta etapa transforma a analise inicial em documentacao versionada e prepara a proxima fase: setup do backend Express.

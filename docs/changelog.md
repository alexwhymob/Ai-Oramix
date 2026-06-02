# Changelog

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

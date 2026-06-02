# Changelog

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

# Plano de Migracao

## Objetivo

Migrar a aplicacao Base44 para uma aplicacao propria com frontend React/Vite preservado, backend Node.js/Express e MongoDB, removendo gradualmente a dependencia do Base44.

## Principios

- Nao alterar visual, layout ou experiencia do frontend sem necessidade tecnica.
- Trabalhar em tarefas pequenas, testaveis e commitaveis.
- Pedir aprovacao antes de cada alteracao.
- Criar ou atualizar testes a cada funcionalidade migrada.
- Atualizar documentacao continuamente.

## Fases

### Fase 1 - Analise e documentacao inicial

Estado: concluida

Escopo:

- Mapear arquitetura atual.
- Identificar dependencias Base44.
- Criar documentacao inicial.
- Definir plano de migracao.

Risco: baixo. Nao ha alteracao funcional.

### Fase 2 - Setup do backend

Estado: em progresso

Escopo:

- Criar estrutura `backend`.
- Configurar Express.
- Configurar health check.
- Configurar ambiente e `.env.example`.
- Adicionar testes iniciais.
- Separar a aplicacao exportada para `frontend/`.

Risco: baixo. Backend ainda isolado.

### Fase 3 - Models MongoDB

Estado: em progresso

Escopo:

- Criar models Mongoose para as entidades Base44.
- Criar indices.
- Preservar `id`, `created_date` e `updated_date`.
- Criar testes dos models.

Risco: medio. Modelagem incorreta pode afetar migracao de dados.

### Fase 4 - API generica de entidades

Estado: em progresso

Escopo:

- Criar endpoints CRUD equivalentes a `base44.entities`.
- Suportar `q`, `limit`, `skip` e `sort_by`.
- Criar testes de integracao.
- Documentar endpoints.

Risco: medio. A compatibilidade da API afeta varias paginas.

### Fase 5 - Scripts de importacao CSV

Estado: concluida

Escopo:

- Importar `Pillar_export.csv`.
- Importar `Question_export.csv`.
- Importar `AssessmentAnswer_export.csv`.
- Fazer upsert por `id`.
- Gerar relatorio de importacao.

Risco: medio. Conversao de tipos e encoding precisam de validacao.

### Fase 6 - Camada de API no frontend

Estado: concluida

Escopo:

- Criar cliente API proprio.
- Criar camada compativel com chamadas Base44.
- Trocar o minimo possivel nas paginas.
- Criar testes de integracao do cliente.

Risco: alto. Afeta toda a interface.

### Fase 7 - Autenticacao

Estado: concluida

Escopo:

- Implementar login com JWT.
- Criar hash de password com bcrypt.
- Implementar roles: `admin`, `ai_consultant`, `account_manager`.
- Substituir `base44.auth`.
- Proteger rotas administrativas.

Risco: alto. Pode alterar comportamento de acesso.

### Etapa adicional - Auditoria

Estado: concluida

Escopo:

- Criar model `AuditLog`.
- Registrar login, register e falhas de login.
- Registrar create/update/delete/bulk create de entidades.
- Criar endpoint protegido `GET /api/audit-logs`.

Risco: medio. Nao altera frontend visualmente.

### Fase 8 - Migracao das funcoes Base44

Estado: em progresso

Escopo:

- Migrar `quizSession`.
- Migrar `createDataSubAssessment`.
- Migrar `generateReport`.
- Migrar `sendReport`.

Cada funcao deve ser feita como tarefa separada.

Estado das funcoes:

- `quizSession`: concluida.
- `createDataSubAssessment`: concluida.
- `generateReport`: pendente.
- `sendReport`: pendente.

Risco: alto. Contem regras centrais do produto.

### Fase 9 - Validacao funcional

Estado: pendente

Escopo:

- Testar fluxo completo do quiz.
- Testar fluxo de subavaliacao.
- Testar dashboard admin.
- Testar criacao e edicao de relatorio.
- Comparar comportamento com a versao Base44.

Risco: medio.

### Fase 10 - Deploy

Estado: pendente

Escopo:

- Documentar variaveis de ambiente.
- Configurar build de frontend e backend.
- Configurar CORS.
- Rever seguranca.
- Preparar instrucoes de servidor.

Risco: medio.

## Primeira Tarefa Recomendada

Concluir a Fase 1 criando a documentacao base:

- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/api.md`
- `docs/changelog.md`

Depois disso, a proxima tarefa recomendada e concluir a Fase 2 instalando dependencias do backend e validando o teste inicial.

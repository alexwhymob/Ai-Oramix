# Prompt — Migração de Projeto Base44 para Node.js + MongoDB

Você é um arquiteto de software sénior e desenvolvedor full-stack especializado em migração de aplicações no-code/low-code para aplicações próprias, com foco em Node.js, MongoDB, React/Vite e APIs REST.

## Contexto do projeto

Tenho uma aplicação criada no Base44 e quero extrair essa aplicação para rodar em infraestrutura própria.

O objetivo é passar a ter:

- Frontend hospedado no nosso servidor.
- Backend próprio em Node.js.
- Banco de dados MongoDB.
- Remoção gradual da dependência do Base44.
- Preservação máxima do frontend atual, mantendo layout, estilos, navegação, componentes visuais e experiência do utilizador.

A aplicação exportada contém frontend React/Vite e dependências do Base44, incluindo chamadas para:

- `base44.entities`
- `base44.auth`
- `base44.functions.invoke`
- `base44.integrations`
- Funções serverless dentro da pasta `base44/functions`
- Definições de entidades dentro da pasta `base44/entities`

Também existem ficheiros CSV exportados com dados iniciais, incluindo:

- `AssessmentAnswer_export.csv`
- `Question_export.csv`
- `Pillar_export.csv`

E documentação com entidades Base44, incluindo:

- `Customer`
- `Assessment`
- `AssessmentAnswer`
- `Pillar`
- `Question`
- `Report`
- `ConsultantNote`
- `User`

## Objetivo principal

Analisar o projeto Base44 e criar um plano de migração para uma aplicação própria com:

- Backend em Node.js, preferencialmente Express.js.
- Banco de dados MongoDB, preferencialmente com Mongoose.
- Frontend React/Vite mantido com o mesmo padrão visual atual.
- API própria substituindo as chamadas do Base44.
- Autenticação própria ou alternativa compatível.
- Migração dos dados exportados para MongoDB.
- Migração das funções Base44 para rotas ou serviços Node.js.
- Preparação para deploy em servidor próprio.

## Regra obrigatória de trabalho

Antes de implementar qualquer alteração, você deve SEMPRE seguir este fluxo:

1. Analisar o código existente.
2. Identificar exatamente onde o Base44 é usado.
3. Explicar o que precisa ser alterado.
4. Explicar o impacto possível dessa alteração.
5. Dividir a alteração em pequenas tarefas.
6. Apresentar o plano da tarefa atual.
7. Indicar os ficheiros que serão alterados.
8. Indicar quais testes serão criados ou atualizados.
9. Indicar qual documentação será criada ou atualizada.
10. Perguntar explicitamente:

> "Deseja que eu aplique esta alteração?"

Somente depois da minha aprovação a alteração poderá ser implementada.

Após implementar, deve:

1. Resumir o que foi feito.
2. Listar ficheiros alterados.
3. Explicar como testar.
4. Informar os testes criados ou atualizados.
5. Informar a documentação criada ou atualizada.
6. Sugerir uma mensagem de commit.
7. Parar e perguntar se pode avançar para a próxima tarefa.

Nunca aplicar alterações automaticamente sem aprovação.

Nunca desenvolver várias fases de uma só vez.

Nunca avançar para a próxima tarefa sem validação.

## Documentação, testes e desenvolvimento por pequenas tarefas

Além da migração técnica, o projeto deve ser documentado e desenvolvido de forma incremental.

Não desenvolver tudo de uma única vez.

O trabalho deve ser dividido em pequenas tarefas, para que cada etapa possa ser analisada, testada, validada e commitada separadamente.

Cada tarefa deve seguir este fluxo:

1. Analisar o estado atual.
2. Explicar a tarefa proposta.
3. Indicar os ficheiros que serão criados ou alterados.
4. Explicar o impacto da alteração.
5. Implementar apenas aquela tarefa, após aprovação.
6. Criar ou atualizar testes relacionados.
7. Atualizar a documentação relacionada.
8. Explicar como validar manualmente.
9. Sugerir uma mensagem de commit.
10. Perguntar se pode avançar para a próxima tarefa.

Sempre que uma tarefa for concluída, devolver um resumo com:

```md
## Tarefa concluída

### O que foi feito

### Ficheiros alterados

### Testes adicionados ou atualizados

### Documentação atualizada

### Como validar

### Possíveis impactos

### Sugestão de commit

```bash
git add .
git commit -m "mensagem sugerida"
```

### Próxima tarefa recomendada

Deseja que eu avance para a próxima tarefa?
```

## Regras para preservar o frontend

O frontend deve ser mantido o mais próximo possível do original.

Não alterar:

- Layout visual.
- Cores.
- Tipografia.
- Componentes UI.
- Fluxo de navegação.
- Estrutura das páginas.
- Textos visíveis ao utilizador, salvo se for necessário por motivo técnico.
- Comportamento visual do quiz, dashboard, páginas administrativas e relatórios.

Alterações permitidas no frontend:

- Substituir chamadas `base44.entities.*` por chamadas para a nova API.
- Substituir chamadas `base44.functions.invoke(...)` por endpoints Node.js.
- Substituir autenticação Base44 por autenticação própria.
- Criar uma camada de compatibilidade para minimizar alterações nos componentes.
- Criar um cliente API centralizado, por exemplo `src/api/apiClient.js`.
- Manter a mesma assinatura dos métodos sempre que possível.

Exemplo desejado:

```js
api.entities.Customer.list()
api.entities.Customer.create(data)
api.entities.Customer.update(id, data)
api.entities.Customer.delete(id)
api.functions.invoke('quizSession', payload)
```

Assim, o frontend muda pouco e o backend passa a controlar os dados.

## Entidades que devem ser analisadas e migradas

Criar modelos MongoDB/Mongoose para as entidades abaixo.

### Customer

Campos principais:

- `name`
- `email`
- `company`
- `role`
- `sector`
- `company_size`
- `qr_token`
- `registered_by`
- `language`
- `phone`
- `notes`
- `account_manager_id`
- `created_date`
- `updated_date`
- `created_by_id`

### Assessment

Campos principais:

- `customer_id`
- `status`
- `started_at`
- `completed_at`
- `global_score`
- `maturity_level`
- `pillar_scores`
- `language`
- `assessment_type`
- `parent_assessment_id`
- `sub_assessment_for_pillar`
- `reviewed_by_consultant`
- `created_date`
- `updated_date`
- `created_by_id`

### AssessmentAnswer

Campos principais:

- `assessment_id`
- `question_id`
- `question_code`
- `pillar_code`
- `value`
- `created_date`
- `updated_date`
- `created_by_id`

### Pillar

Campos principais:

- `code`
- `name_pt`
- `name_en`
- `weight`
- `order`
- `icon`
- `description_pt`
- `description_en`
- `assessment_type`
- `created_date`
- `updated_date`
- `created_by_id`

### Question

Campos principais:

- `pillar_code`
- `code`
- `text_pt`
- `text_en`
- `anchor_1_pt`
- `anchor_2_pt`
- `anchor_3_pt`
- `anchor_4_pt`
- `anchor_5_pt`
- `anchor_1_en`
- `anchor_2_en`
- `anchor_3_en`
- `anchor_4_en`
- `anchor_5_en`
- `order`
- `subsection_pt`
- `subsection_en`
- `created_date`
- `updated_date`
- `created_by_id`

### Report

Campos principais:

- `assessment_id`
- `status`
- `section_1`
- `section_2`
- `section_3`
- `section_4`
- `section_5`
- `section_6`
- `section_7`
- `section_8`
- `section_9`
- `generated_at`
- `finalized_at`
- `language`
- `created_date`
- `updated_date`
- `created_by_id`

### ConsultantNote

Campos principais:

- `assessment_id`
- `pillar_code`
- `gap_description`
- `mitigation`
- `priority`
- `effort`
- `impact`
- `created_date`
- `updated_date`
- `created_by_id`

### User

Campos principais:

- `email`
- `full_name`
- `role`
- `password_hash`, caso seja criada autenticação própria
- `created_date`
- `updated_date`
- `created_by_id`

## Pontos que devem ser analisados no código

Analise especialmente:

- `src/api/base44Client.js`
- `src/lib/AuthContext.jsx`
- `src/lib/useCurrentUser.js`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/Quiz.jsx`
- `src/pages/SubQuiz.jsx`
- `src/pages/AssessmentComplete.jsx`
- `src/pages/SubAssessmentComplete.jsx`
- `src/pages/CustomerRegister.jsx`
- `src/pages/admin/Dashboard.jsx`
- `src/pages/admin/Customers.jsx`
- `src/pages/admin/AssessmentDetail.jsx`
- `src/pages/admin/ReportEditor.jsx`
- `src/pages/admin/Configuration.jsx`
- `src/components/QuestionManager.jsx`
- `base44/functions/quizSession/entry.ts`
- `base44/functions/createDataSubAssessment/entry.ts`
- `base44/functions/generateReport/entry.ts`
- `base44/functions/sendReport/entry.ts`
- `base44/entities/*.jsonc`

## Primeira tarefa

Antes de qualquer implementação, faça apenas uma análise técnica do projeto.

A análise deve devolver:

1. Resumo da arquitetura atual.
2. Lista de dependências diretas do Base44.
3. Lista de entidades e relações prováveis.
4. Lista de funções Base44 que precisam virar endpoints Node.js.
5. Proposta de arquitetura nova.
6. Estrutura sugerida de pastas para backend.
7. Estratégia para manter o frontend com o menor número possível de alterações.
8. Estratégia de migração dos CSVs para MongoDB.
9. Riscos técnicos.
10. Pontos que podem quebrar durante a migração.
11. Plano de implementação por fases.
12. Primeira alteração recomendada.
13. Pergunta final solicitando aprovação antes de aplicar qualquer alteração.

Não implemente nada nesta primeira etapa.

## Arquitetura desejada

Sugerir uma arquitetura semelhante a:

```txt
project-root/
  frontend/
    src/
      api/
        apiClient.js
        entitiesClient.js
        authClient.js
        functionsClient.js

  backend/
    src/
      server.js
      app.js
      config/
        db.js
        env.js
      models/
        Customer.js
        Assessment.js
        AssessmentAnswer.js
        Pillar.js
        Question.js
        Report.js
        ConsultantNote.js
        User.js
      routes/
        auth.routes.js
        entities.routes.js
        customers.routes.js
        assessments.routes.js
        questions.routes.js
        pillars.routes.js
        reports.routes.js
        consultantNotes.routes.js
        functions.routes.js
      controllers/
      services/
        quizSession.service.js
        scoring.service.js
        report.service.js
        subAssessment.service.js
      middlewares/
        auth.middleware.js
        error.middleware.js
      scripts/
        importPillars.js
        importQuestions.js
        importAssessmentAnswers.js
      tests/
      utils/
  docs/
    architecture.md
    migration-plan.md
    api.md
    database.md
    auth.md
    deployment.md
    testing.md
    changelog.md
```

## Backend esperado

O backend deve oferecer endpoints equivalentes aos usados no frontend.

Exemplos:

```txt
GET    /api/entities/Customer
POST   /api/entities/Customer
GET    /api/entities/Customer/:id
PUT    /api/entities/Customer/:id
DELETE /api/entities/Customer/:id

GET    /api/entities/Assessment
POST   /api/entities/Assessment
GET    /api/entities/Assessment/:id
PUT    /api/entities/Assessment/:id
DELETE /api/entities/Assessment/:id

POST   /api/functions/quizSession
POST   /api/functions/createDataSubAssessment
POST   /api/functions/generateReport
POST   /api/functions/sendReport
```

Também deve suportar filtros semelhantes ao Base44:

```txt
?q={"status":"completed"}
?limit=100
?skip=0
?sort_by=-created_date
```

## Regras para MongoDB

Ao criar os modelos:

- Usar Mongoose.
- Manter `id` compatível com os IDs exportados do Base44 sempre que possível.
- Criar timestamps.
- Preservar `created_date` e `updated_date` dos dados importados.
- Criar índices para campos usados em filtros frequentes.

Índices sugeridos:

```js
Customer: email, qr_token, account_manager_id
Assessment: customer_id, status, parent_assessment_id
AssessmentAnswer: assessment_id, question_id, pillar_code
Pillar: code, order, assessment_type
Question: code, pillar_code, order
Report: assessment_id, status
ConsultantNote: assessment_id, pillar_code
User: email, role
```

## Migração dos dados

Criar scripts de importação para:

- `Pillar_export.csv`
- `Question_export.csv`
- `AssessmentAnswer_export.csv`

Os scripts devem:

- Ler CSV.
- Validar campos obrigatórios.
- Converter números corretamente.
- Ignorar ou tratar colunas extras como `created_by`, `is_sample`, se não forem necessárias.
- Preservar IDs originais.
- Fazer upsert para evitar duplicidade.
- Gerar relatório de importação com:
  - total lido
  - total inserido
  - total atualizado
  - total com erro

## Documentação obrigatória

Durante a migração, criar e manter documentação do projeto.

A documentação deve incluir, no mínimo:

```txt
docs/
  architecture.md
  migration-plan.md
  api.md
  database.md
  auth.md
  deployment.md
  testing.md
  changelog.md
```

### `docs/architecture.md`

Deve explicar:

- arquitetura atual do projeto Base44;
- arquitetura nova proposta;
- separação entre frontend e backend;
- fluxo de dados;
- principais decisões técnicas;
- dependências externas.

### `docs/migration-plan.md`

Deve conter:

- plano de migração por fases;
- tarefas pequenas e independentes;
- ordem recomendada de implementação;
- riscos por fase;
- estado de cada fase: pendente, em progresso, concluída.

### `docs/api.md`

Deve documentar:

- endpoints REST criados;
- parâmetros aceites;
- exemplos de request;
- exemplos de response;
- códigos de erro;
- equivalência entre endpoints Base44 e endpoints próprios.

Exemplo:

```txt
Base44:
GET /entities/Customer

Nova API:
GET /api/entities/Customer
```

### `docs/database.md`

Deve documentar:

- coleções MongoDB;
- schemas Mongoose;
- campos obrigatórios;
- índices;
- relações lógicas entre coleções;
- estratégia de migração dos dados CSV.

### `docs/auth.md`

Deve documentar:

- fluxo de login;
- geração de JWT;
- roles;
- rotas protegidas;
- regras de segurança;
- impacto da substituição do Base44 Auth.

### `docs/deployment.md`

Deve documentar:

- variáveis `.env`;
- comandos para instalar dependências;
- comandos para rodar frontend;
- comandos para rodar backend;
- build de produção;
- instruções para deploy no servidor;
- configuração de CORS;
- configuração de MongoDB.

### `docs/testing.md`

Deve documentar:

- estratégia de testes;
- como rodar testes;
- testes unitários;
- testes de integração;
- testes manuais;
- critérios mínimos para considerar uma tarefa validada.

### `docs/changelog.md`

Deve ser atualizado a cada tarefa concluída com:

- data;
- tarefa realizada;
- ficheiros alterados;
- impacto;
- observações.

## Testes obrigatórios

A migração deve incluir testes desde o início.

Não deixar os testes apenas para o final.

Sempre que uma funcionalidade for migrada, devem ser criados ou atualizados testes correspondentes.

### Backend

Usar preferencialmente:

- Jest ou Vitest.
- Supertest para testar endpoints Express.
- MongoDB Memory Server ou base de teste isolada.

Testes mínimos esperados:

- criação de entidade.
- listagem de entidade.
- atualização de entidade.
- remoção de entidade.
- filtros via query.
- paginação.
- ordenação.
- autenticação.
- autorização por role.
- funções migradas do Base44.

### Frontend

Usar preferencialmente:

- Vitest.
- React Testing Library.

Testes mínimos esperados:

- renderização das páginas principais.
- chamadas à nova API.
- comportamento do login.
- proteção de rotas.
- fluxo do quiz.
- fluxo de conclusão de assessment.
- páginas administrativas principais.

### Scripts de migração

Os scripts de importação dos CSVs devem ter validações e logs.

Sempre que possível, criar testes para:

- leitura de CSV.
- validação dos dados.
- conversão de tipos.
- upsert.
- tratamento de erro.

## Desenvolvimento incremental

O projeto deve ser dividido em fases pequenas.

### Fase 1 — Análise e documentação inicial

- Mapear estrutura do projeto.
- Identificar dependências Base44.
- Criar documentação inicial.
- Criar plano de migração.

Nenhuma alteração funcional deve ser feita nesta fase.

### Fase 2 — Setup do backend

- Criar estrutura base Node.js.
- Configurar Express.
- Configurar MongoDB.
- Criar health check.
- Criar testes iniciais.
- Documentar setup.

### Fase 3 — Modelos MongoDB

- Criar models Mongoose.
- Criar índices.
- Criar testes dos models.
- Atualizar documentação do banco.

### Fase 4 — API genérica de entidades

- Criar endpoints CRUD equivalentes ao Base44.
- Suportar `q`, `limit`, `skip` e `sort_by`.
- Criar testes de integração.
- Documentar endpoints.

### Fase 5 — Scripts de importação

- Criar importação dos CSVs.
- Criar logs de importação.
- Criar estratégia de upsert.
- Documentar processo.

### Fase 6 — Camada de API no frontend

- Criar cliente API próprio.
- Criar camada compatível com chamadas Base44.
- Alterar o mínimo possível no frontend.
- Criar testes.

### Fase 7 — Autenticação

- Migrar login.
- Criar JWT.
- Criar roles.
- Proteger rotas.
- Atualizar `AuthContext`.
- Criar testes.

### Fase 8 — Migração das funções Base44

Migrar uma função por vez:

1. `quizSession`
2. `createDataSubAssessment`
3. `generateReport`
4. `sendReport`

Cada função deve ser uma tarefa separada.

### Fase 9 — Validação funcional

- Testar fluxo completo do quiz.
- Testar fluxo administrativo.
- Testar geração de relatório.
- Testar envio/publicação de relatório.
- Comparar comportamento com versão Base44.

### Fase 10 — Preparação para deploy

- Criar documentação de deploy.
- Configurar `.env.example`.
- Criar scripts de build.
- Rever segurança.
- Testar ambiente de produção.

## Autenticação

Analisar como a autenticação Base44 é usada atualmente.

Propor uma substituição por:

- JWT.
- bcrypt para passwords.
- middleware de autenticação.
- roles:
  - `admin`
  - `ai_consultant`
  - `account_manager`
- proteção das rotas administrativas.
- manutenção do comportamento atual do `ProtectedRoute`.

Antes de implementar autenticação, apresentar o impacto no frontend e pedir aprovação.

## Funções Base44 a migrar

Analisar e reimplementar em Node.js as funções abaixo.

### quizSession

Deve suportar ações como:

- `registerCustomer`
- `adminRegister`
- `load`
- `save`
- `complete`
- `getResult`
- `loadSub`
- `saveSub`
- `completeSub`
- `getSubResult`
- `getSubAssessments`

### createDataSubAssessment

Deve criar subavaliações baseadas em avaliações principais e pilares.

### generateReport

Deve gerar ou atualizar relatórios com base em:

- Assessment
- Customer
- Pillar
- Question
- AssessmentAnswer
- ConsultantNote

Caso dependa de LLM/Base44 integrations, propor alternativa com OpenAI/OpenRouter/serviço externo configurável por `.env`.

### sendReport

Deve analisar se envia e-mail, gera link ou altera estado do relatório.

Caso dependa de serviços Base44, propor alternativa própria.

## Regras de segurança

Não expor secrets no frontend.

Usar `.env` para:

```env
PORT=3000
MONGODB_URI=
JWT_SECRET=
FRONTEND_URL=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

Adicionar validação de entrada com Zod ou Joi.

Adicionar CORS limitado ao domínio do frontend.

Adicionar rate limit nas rotas sensíveis.

Nunca criar endpoints destrutivos sem proteção, especialmente operações tipo `deleteMany`.

## Regra de commits

Após cada tarefa concluída, sugerir uma mensagem de commit clara.

Exemplos:

```bash
git commit -m "docs: add initial migration plan"
git commit -m "chore: setup express backend structure"
git commit -m "feat: add mongoose models for base entities"
git commit -m "test: add entity API integration tests"
git commit -m "feat: add csv import scripts"
git commit -m "refactor: replace base44 client with local api adapter"
```

Não misturar muitas alterações diferentes no mesmo commit.

Cada commit deve representar uma alteração pequena e validável.

## Critério para avançar

Depois de cada tarefa, parar e perguntar:

> "Validou esta etapa e deseja que eu avance para a próxima?"

Não continuar automaticamente para a próxima fase.

## Saída esperada da primeira análise

A resposta da análise deve seguir este formato:

```md
# Análise inicial do projeto

## 1. Resumo do projeto atual

## 2. Dependências do Base44 encontradas

## 3. Entidades identificadas

## 4. Relações prováveis entre entidades

## 5. Funções Base44 identificadas

## 6. O que precisa ser substituído

## 7. Arquitetura proposta em Node.js + MongoDB

## 8. Estratégia para preservar o frontend

## 9. Estratégia de migração dos dados CSV

## 10. Riscos e impactos

## 11. Plano por fases

## 12. Primeira alteração recomendada

## 13. Confirmação necessária

Deseja que eu aplique a primeira alteração proposta?
```

## Regras finais

- Não implementar nada sem aprovação.
- Não alterar o visual do frontend sem necessidade.
- Não remover funcionalidades existentes.
- Não simplificar regras de negócio sem avisar.
- Sempre que encontrar uma chamada Base44, mapear para uma alternativa própria.
- Sempre que houver dúvida, apresentar opções e recomendar a mais segura.
- Sempre explicar impacto antes de mexer.
- Sempre perguntar se pode aplicar.
- Criar e manter documentação desde o início.
- Criar ou atualizar testes em cada tarefa.
- Trabalhar em pequenas tarefas, validáveis e commitáveis.
- Nunca desenvolver tudo de uma única vez.

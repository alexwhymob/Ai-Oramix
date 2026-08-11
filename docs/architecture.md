# Arquitetura do Projeto

## Estado Atual

O projeto foi originalmente migrado do Base44, mas a aplicacao atual corre com frontend e backend proprios. A interface usa React, React Router, React Query, Tailwind CSS, componentes Radix/shadcn e bibliotecas auxiliares para graficos, PDF, markdown e edicao de conteudo.

O frontend usa uma fachada local em `frontend/src/api/base44Client.js` apenas para preservar os nomes da API durante a migracao. Essa fachada nao usa o SDK Base44: todos os clientes chamam a API Express propria atraves de `frontend/src/api/apiClient.js`.

As regras de negocio mais importantes herdadas do Base44 estao em `frontend/base44/functions`:

- `quizSession`: registo de clientes, sessao de quiz, submissao de respostas, resultados e subavaliacoes.
- `createDataSubAssessment`: cria subavaliacao do pilar `dados` quando o score e inferior a `2.5`.
- `generateReport`: gera ou atualiza relatorio com apoio de LLM.
- `sendReport`: envia notificacao por e-mail ao cliente.

Os ficheiros em `frontend/base44/` sao referencias legadas da migracao e nao participam no build Docker. Os modelos efetivos estao em `backend/src/models/`.

## Compatibilidade legada

Os nomes `base44Client` e `base44.*` permanecem temporariamente no frontend como uma camada de compatibilidade interna. Nao existe dependencia instalada do SDK Base44 nem chamadas para servicos Base44 em runtime.

Os fluxos ainda nao migrados, como Google Login e OTP, sao explicitamente sinalizados no cliente e nao fazem fallback para uma plataforma externa.

## Arquitetura Alvo

A arquitetura proposta separa frontend e backend, preservando o maximo possivel da interface atual.

```txt
project-root/
  frontend/
    package.json
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
      routes/
      controllers/
      services/
      middlewares/
      scripts/
      tests/
      utils/

  docs/
```

## Estrutura Atual do Repositorio

```txt
project-root/
  frontend/
    src/
    base44/
    package.json
    vite.config.js
  backend/
    src/
    tests/
    package.json
    .env.example
  docs/
  AssessmentAnswer_export.csv
  Pillar_export.csv
  Question_export.csv
  Entidades.md
  prompt_migracao_base44_node_mongodb.md
```

## Backend Proposto

O backend deve ser criado em Node.js com Express.js e MongoDB via Mongoose. A base inicial ja contem uma aplicacao Express isolada com `GET /api/health`.

Responsabilidades:

- Expor API REST compativel com o uso atual do Base44.
- Gerir autenticacao propria com JWT e bcrypt.
- Aplicar autorizacao por roles.
- Persistir dados no MongoDB.
- Migrar as funcoes Base44 para services e rotas Express.
- Centralizar chamadas LLM e e-mail em services configuraveis por `.env`.

## Banco de Dados

Colecoes esperadas:

- `customers`
- `assessments`
- `assessmentanswers`
- `pillars`
- `questions`
- `reports`
- `consultantnotes`
- `users`

O campo `id` original do Base44 deve ser preservado como campo unico para compatibilidade com o frontend e com os CSVs exportados. O `_id` do MongoDB pode existir internamente, mas a API deve continuar expondo `id`.

## Fluxo de Dados Proposto

1. O frontend chama a camada local de API.
2. Essa camada envia requests para `/api`.
3. O backend valida request, autenticacao e permissao.
4. Controllers chamam services.
5. Services usam models Mongoose.
6. A resposta retorna no formato esperado pelo frontend.

## Decisoes Tecnicas Iniciais

- Manter uma fachada local no frontend para reduzir alteracoes visuais e funcionais durante a transicao.
- Preservar nomes de entidades e metodos usados pelo Base44.
- Migrar por fases pequenas, com testes e documentacao em cada etapa.
- Manter o backend independente e evitar dependencias de runtime em plataformas externas.
- Preservar `pillar_scores` como string JSON inicialmente para reduzir risco.

## Pontos de Atencao

- Autenticacao Base44 inclui login, Google, OTP, reset de password e convite de usuarios.
- As regras RLS do Base44 precisam virar middlewares de autorizacao.
- A geracao de relatorio depende de LLM e resposta JSON estruturada.
- O envio de e-mail usa Resend no Base44, mas pode ser mantido ou trocado por SMTP.
- Alguns textos exportados aparecem com problemas de encoding e devem ser tratados com cuidado antes de qualquer normalizacao.

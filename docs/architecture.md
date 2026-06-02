# Arquitetura do Projeto

## Estado Atual

O projeto atual foi exportado do Base44 e contem um frontend React/Vite em `oramix-ai-guide (1)`. A interface usa React, React Router, React Query, Tailwind CSS, componentes Radix/shadcn e bibliotecas auxiliares para graficos, PDF, markdown e edicao de conteudo.

O frontend chama diretamente o SDK do Base44 por meio de `src/api/base44Client.js`. Essa camada cria o cliente com `@base44/sdk` e e usada pelas paginas e componentes para acessar entidades, autenticacao, funcoes serverless e integracoes.

As regras de negocio mais importantes estao em `base44/functions`:

- `quizSession`: registo de clientes, sessao de quiz, submissao de respostas, resultados e subavaliacoes.
- `createDataSubAssessment`: cria subavaliacao do pilar `dados` quando o score e inferior a `2.5`.
- `generateReport`: gera ou atualiza relatorio com apoio de LLM.
- `sendReport`: envia notificacao por e-mail ao cliente.

As entidades Base44 estao documentadas em `base44/entities/*.jsonc` e em `Entidades.md`.

## Dependencias Base44

Dependencias principais a remover ou substituir gradualmente:

- `@base44/sdk`
- `@base44/vite-plugin`
- `base44.entities.*`
- `base44.auth.*`
- `base44.functions.invoke(...)`
- `base44.integrations.Core.InvokeLLM`
- `base44.users.inviteUser`

## Arquitetura Alvo

A arquitetura proposta separa frontend e backend, preservando o maximo possivel da interface atual.

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
      routes/
      controllers/
      services/
      middlewares/
      scripts/
      tests/
      utils/

  docs/
```

## Backend Proposto

O backend deve ser criado em Node.js com Express.js e MongoDB via Mongoose.

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

1. O frontend chama uma camada local compativel com `base44`.
2. Essa camada envia requests para `/api`.
3. O backend valida request, autenticacao e permissao.
4. Controllers chamam services.
5. Services usam models Mongoose.
6. A resposta retorna no formato esperado pelo frontend.

## Decisoes Tecnicas Iniciais

- Criar um adaptador no frontend para reduzir alteracoes visuais e funcionais.
- Preservar nomes de entidades e metodos usados pelo Base44.
- Migrar por fases pequenas, com testes e documentacao em cada etapa.
- Comecar por backend independente antes de trocar chamadas do frontend.
- Preservar `pillar_scores` como string JSON inicialmente para reduzir risco.

## Pontos de Atencao

- Autenticacao Base44 inclui login, Google, OTP, reset de password e convite de usuarios.
- As regras RLS do Base44 precisam virar middlewares de autorizacao.
- A geracao de relatorio depende de LLM e resposta JSON estruturada.
- O envio de e-mail usa Resend no Base44, mas pode ser mantido ou trocado por SMTP.
- Alguns textos exportados aparecem com problemas de encoding e devem ser tratados com cuidado antes de qualquer normalizacao.

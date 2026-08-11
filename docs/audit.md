# Audit Logs

## Objetivo

Registrar atividade relevante para que administradores acompanhem o que utilizadores e processos internos fazem na aplicacao.

## Model

`AuditLog`:

- `id`
- `user_id`
- `user_email`
- `user_role`
- `action`
- `entity`
- `entity_id`
- `metadata`
- `ip`
- `user_agent`
- `created_date`

## Eventos Iniciais

Os eventos atualmente registados pelo backend sao:

### Autenticacao

- `auth.login`
- `auth.login_failed`
- `security.bruteforce_suspected`
- `security.refresh_token_reuse`
- `auth.register`
- `auth.password_reset_requested`
- `auth.password_reset_completed`

### Entidades

- `entity.create`
- `entity.bulk_create`
- `entity.update`
- `entity.delete`

Os eventos de leitura de entidades nao sao registados individualmente para evitar ruido excessivo e exposicao desnecessaria de dados.

### Quiz e assessments

- `quiz.register_customer`
- `quiz.admin_register`
- `quiz.load`
- `quiz.submit`
- `quiz.load_sub`
- `quiz.submit_sub`
- `quiz.get_result`
- `quiz.get_sub_assessments`
- `quiz.get_sub_result`
- `quiz.unknown`

### Sub-assessments

- `sub_assessment.create`
- `sub_assessment.skip`

Os eventos de sub-assessment registam, entre outros dados, o assessment pai, o motivo de ignorar a criacao e a quantidade criada.

### Relatorios e apresentacoes

- `report.generate`
- `report.send`
- `report.export_presentation`

Os metadados podem incluir assessment, idioma, secoes geradas, provider de e-mail, identificador da mensagem e nome do ficheiro PPT.

### Utilizadores e configuracao

- `user.invited`
- `user.updated`
- `user.invite_resent`
- `security.login_unlocked`
- `llm_provider_config.updated`

### Integracoes

- `integration.llm.invoke`

Por seguranca, este evento regista o modelo e o tamanho do prompt, mas nao grava o prompt completo nem a resposta da LLM.

## API

Endpoint protegido:

```txt
GET /api/audit-logs
```

Roles permitidas:

- `admin`
- `ai_consultant`

O endpoint nao permite criacao, edicao ou eliminacao de logs pela API. Os registos sao criados internamente pelo backend.

Parametros:

- `q`
- `limit`
- `skip`
- `sort_by`

Exemplos:

```txt
GET /api/audit-logs?limit=50&sort_by=-created_date
GET /api/audit-logs?q={"entity":"Customer"}
GET /api/audit-logs?q={"action":"auth.login"}
```

## Observacoes

Escrita de logs e tolerante a falhas. Se a auditoria falhar, a acao principal nao deve ser bloqueada. A falha e registada no log do backend para investigacao operacional.

O actor e obtido do utilizador autenticado quando existe. Para falhas de login e pedidos publicos de recuperacao de password, o log pode conter apenas o e-mail informado e dados de request.

Os logs guardam IP e user-agent para apoiar investigacao de seguranca. Nao devem ser usados para armazenar passwords, tokens, API keys, prompts completos ou conteudo integral de relatorios.

Eventos de seguranca:

- `security.bruteforce_suspected`: falhas consecutivas ou bloqueio progressivo por conta. A metadata usa apenas uma impressao digital do e-mail, contagem de falhas e tempo de bloqueio.
- `security.refresh_token_reuse`: tentativa de usar um refresh token ja rotacionado ou revogado. A metadata nao contem o token.
- `security.login_unlocked`: desbloqueio manual feito por um administrador. A metadata contem a justificativa fornecida, sem tokens ou passwords.

A listagem e feita com filtros controlados pela mesma camada de query das entidades, incluindo limite, offset e ordenacao. O limite por defeito e 100 registos.

O frontend ja possui uma pagina administrativa para visualizar e filtrar os logs em `/admin/audit-logs`. Atualmente nao existe endpoint de exportacao dedicado.

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

Autenticacao:

- `auth.login`
- `auth.login_failed`
- `auth.register`

Entidades:

- `entity.create`
- `entity.bulk_create`
- `entity.update`
- `entity.delete`

## API

Endpoint protegido:

```txt
GET /api/audit-logs
```

Roles permitidas:

- `admin`
- `ai_consultant`

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

Escrita de logs e tolerante a falhas. Se a auditoria falhar, a acao principal nao deve ser bloqueada.

Em fases futuras, o admin pode ter uma pagina dedicada para visualizar, filtrar e exportar logs.

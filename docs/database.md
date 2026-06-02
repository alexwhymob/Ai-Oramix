# Database

## Tecnologia

O backend usa MongoDB com Mongoose.

As credenciais devem ser configuradas apenas em arquivos locais `.env*` ou variaveis de ambiente do servidor. Nenhum arquivo `.env*` deve ser enviado para o repositorio.

Variaveis esperadas:

```txt
MONGODB_URI
MONGODB_DB_NAME
```

## Compatibilidade com Base44

Todas as entidades preservam o campo `id` como string unica, compativel com os IDs exportados do Base44 e usados pelo frontend.

O `_id` do MongoDB existe internamente, mas a API deve expor `id` como identificador principal.

Campos comuns:

- `id`
- `created_date`
- `updated_date`
- `created_by_id`

## Colecoes e Models

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
- `data_consent`
- `data_consent_at`

Indices:

- `id`, unico
- `email`
- `qr_token`
- `account_manager_id`

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

Indices:

- `id`, unico
- `customer_id`
- `status`
- `parent_assessment_id`

### AssessmentAnswer

Campos principais:

- `assessment_id`
- `question_id`
- `question_code`
- `pillar_code`
- `value`

Indices:

- `id`, unico
- `assessment_id`
- `question_id`
- `pillar_code`
- `assessment_id + question_id`
- `assessment_id + pillar_code`

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

Indices:

- `id`, unico
- `code`
- `order`
- `assessment_type`
- `code + assessment_type`, unico

### Question

Campos principais:

- `pillar_code`
- `code`
- `text_pt`
- `text_en`
- `anchor_1_pt` ate `anchor_5_pt`
- `anchor_1_en` ate `anchor_5_en`
- `order`
- `subsection_pt`
- `subsection_en`

Indices:

- `id`, unico
- `code`
- `pillar_code + order`
- `code + pillar_code`, unico

### Report

Campos principais:

- `assessment_id`
- `status`
- `section_1` ate `section_9`
- `generated_at`
- `finalized_at`
- `language`

Indices:

- `id`, unico
- `assessment_id`
- `status`

### ConsultantNote

Campos principais:

- `assessment_id`
- `pillar_code`
- `gap_description`
- `mitigation`
- `priority`
- `effort`
- `impact`

Indices:

- `id`, unico
- `assessment_id`
- `pillar_code`
- `assessment_id + pillar_code`

### User

Campos principais:

- `email`
- `full_name`
- `role`
- `password_hash`

Indices:

- `id`, unico
- `email`, unico
- `role`

### AuditLog

Campos principais:

- `user_id`
- `user_email`
- `user_role`
- `action`
- `entity`
- `entity_id`
- `metadata`
- `ip`
- `user_agent`

Indices:

- `id`, unico
- `user_id`
- `user_email`
- `action`
- `entity`
- `entity_id`
- `created_date`

## Relacoes Logicas

- `Customer.id` -> `Assessment.customer_id`
- `Assessment.id` -> `AssessmentAnswer.assessment_id`
- `Question.id` -> `AssessmentAnswer.question_id`
- `Pillar.code` -> `Question.pillar_code`
- `Pillar.code` -> `AssessmentAnswer.pillar_code`
- `Assessment.id` -> `Report.assessment_id`
- `Assessment.id` -> `ConsultantNote.assessment_id`
- `Pillar.code` -> `ConsultantNote.pillar_code`
- `Assessment.id` -> `Assessment.parent_assessment_id`
- `User.id` -> `Customer.account_manager_id`

## Migração dos CSVs

Os scripts de importacao devem:

- Ler CSV com parser proprio.
- Preservar `id`, `created_date`, `updated_date` e `created_by_id`.
- Converter campos numericos como `weight`, `order` e `value`.
- Fazer upsert por `id`.
- Ignorar ou tratar como metadados campos como `created_by` e `is_sample`.
- Gerar relatorio com total lido, inserido, atualizado e com erro.

## Scripts de Importacao

Os CSVs exportados do Base44 sao importados para a nossa base MongoDB usando Mongoose. Nenhum script envia dados para o Base44.

Arquivos de origem na raiz do projeto:

- `Pillar_export.csv`
- `Question_export.csv`
- `AssessmentAnswer_export.csv`

Comandos:

```bash
cd backend
npm run import:pillars
npm run import:questions
npm run import:assessment-answers
npm run import:all
```

Cada importacao faz upsert por `id` e imprime um resumo:

- `read`
- `inserted`
- `updated`
- `errors`

Antes de rodar, configurar localmente `MONGODB_URI` e `MONGODB_DB_NAME`. Esses valores nao devem ser versionados.

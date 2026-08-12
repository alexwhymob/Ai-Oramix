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
- `assessment_template_id`
- `parent_assessment_id`
- `sub_assessment_for_pillar`
- `reviewed_by_consultant`

Indices:

- `id`, unico
- `customer_id`
- `status`
- `assessment_template_id`
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
- `assessment_template_id`
- `min_score`
- `sub_assessment_template_id`

Indices:

- `id`, unico
- `code`
- `order`
- `assessment_type`
- `assessment_template_id`
- `sub_assessment_template_id`
- `code + assessment_type + assessment_template_id`, unico

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

### AssessmentTemplate

Campos principais:

- `code`
- `template_type` (`assessment` ou `sub_assessment`)
- `name_pt`, `name_en`
- `tagline_pt`, `tagline_en`
- `description_pt`, `description_en`
- `pitch_pt`, `pitch_en`
- `report_security_pt`, `report_security_en`
- `maturity_preset_id`
- `pillar_count`
- `active`
- `order`

Indices:

- `id`, unico
- `code`, unico
- `maturity_preset_id`
- `active + order`

### PresentationTemplate

Campos principais:

- `code`, `name`, `description`
- `active`, `is_default`, `sort_order`
- `theme_primary_color`, `theme_secondary_color`, `theme_accent_color`
- `branding_logo_url`, `branding_cover_image_url`, `branding_footer_text`
- `cover_title_pt`, `cover_title_en`, `cover_subtitle_pt`, `cover_subtitle_en`
- `include_summary`, `include_global_score`, `include_pillar_chart`, `include_radar_chart`
- `include_quick_wins`, `include_roadmap`, `include_use_cases`, `include_consultant_notes`
- `pillar_chart_type` (`bar` ou `column`)
- `score_chart_type` (`doughnut` ou `bar`)
- `max_summary_bullets`, `max_quick_wins`, `max_use_cases`, `max_consultant_notes`

Indices:

- `id`, unico
- `code`, unico
- `active + is_default + sort_order`

### ReportTemplate

Campos principais:

- `code`, `name`, `description`
- `system_prompt`
- `style_guide`
- `is_default`, `is_active`, `order`

Indices:

- `id`, unico
- `code`, unico
- `is_active + is_default + order`

### ReportSection

Campos principais:

- `report_template_id`
- `key`, `title`, `prompt`
- `context_keys`
- `json_schema`
- `order`

Indices:

- `id`, unico
- `report_template_id`
- `report_template_id + order`
- `report_template_id + key`, unico

### NotificationTemplate

Campos principais:

- `key`, `name`, `description`
- `trigger_type` (`immediate`, `scheduled_24h`, `manual`, `scheduled_96h`, `report_ready`)
- `target` (`customer` ou `account_manager`)
- `subject_pt`, `subject_en`
- `body_pt`, `body_en`
- `from_email`
- `is_active`, `order`

Indices:

- `id`, unico
- `key`, unico
- `is_active + order`

### MaturityPreset

Campos principais:

- `code`
- `name`, `description`
- `is_default`, `is_active`, `order`

Indices:

- `id`, unico
- `code`, unico sparse
- `is_active + is_default + order`

### MaturityLevel

Campos principais:

- `preset_id`
- `level` (1 a 5)
- `min_score`, `max_score`
- `label_pt`, `label_en`
- `color`, `emoji`
- `recommendation_pt`, `recommendation_en`
- `order`

Indices:

- `id`, unico
- `preset_id`
- `preset_id + order`
- `preset_id + level`, unico

### User

Campos principais:

- `email`
- `full_name`
- `role`
- `active`
- `auth_token_version`
- `password_hash`
- `refresh_token_hash`
- `refresh_token_expires_at`
- `login_failed_attempts`
- `login_locked_until`
- `login_lock_level`
- `reset_password_token_hash`
- `reset_password_expires_at`
- `mfa_enabled`
- `mfa_secret_encrypted`
- `mfa_recovery_codes_hash`
- `mfa_verified_at`

Indices:

- `id`, unico
- `email`, unico
- `role`
- `active`
- `reset_password_token_hash`

`refresh_token_hash` e `refresh_token_expires_at` sao campos internos de sessao. Nunca sao devolvidos pela API nem registados em auditoria.
Os campos `login_*` suportam a visibilidade e o desbloqueio administrativo do bloqueio progressivo.
Os campos `reset_password_*` sao internos e armazenam apenas o hash e a expiracao do token de recuperacao.
Os campos `mfa_*` sao internos. O segredo TOTP e os codigos de recuperacao nunca sao devolvidos pela API.

As API keys de providers LLM sao armazenadas cifradas com AES-256-GCM em `LlmProviderConfig`. `LLM_CONFIG_ENCRYPTION_KEY` deve ser mantida apenas no ambiente do backend. Valores legados em texto simples sao cifrados automaticamente quando a configuracao e lida.

### HtmlReportConfig

Campos principais:

- `name`
- `is_active`
- `css`

Indices:

- `id`, unico
- `is_active + created_date`

### LlmProviderConfig

Campos principais:

- `key`
- `provider` (`openai` ou `anthropic`)
- `model`
- `openai_api_key`
- `anthropic_api_key`
- `updated_by_id`

Indices:

- `id`, unico
- `key`, unico
- `provider`

As chaves sao cifradas no backend e nunca sao devolvidas nas respostas da API. A chave `LLM_CONFIG_ENCRYPTION_KEY` e obrigatoria para proteger estes valores.

### PushSubscription

Campos principais:

- `user_id`
- `endpoint`
- `p256dh`
- `auth`
- `user_agent`
- `active`
- `last_error_at`

Indices:

- `id`, unico
- `user_id`
- `endpoint`, unico
- `user_id + active`

As chaves da subscricao sao usadas apenas pelo Web Push e ficam associadas ao utilizador autenticado.

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
- `created_date`, descendente
- `user_id + created_date`, composto
- `entity + entity_id`, composto

## Relacoes Logicas

- `Customer.id` -> `Assessment.customer_id`
- `AssessmentTemplate.id` -> `Assessment.assessment_template_id`
- `AssessmentTemplate.id` -> `Pillar.assessment_template_id`
- `AssessmentTemplate.id` -> `Pillar.sub_assessment_template_id`
- `MaturityPreset.id` -> `AssessmentTemplate.maturity_preset_id`
- `Assessment.id` -> `AssessmentAnswer.assessment_id`
- `Question.id` -> `AssessmentAnswer.question_id`
- `Pillar.code` -> `Question.pillar_code`
- `Pillar.code` -> `AssessmentAnswer.pillar_code`
- `Assessment.id` -> `Report.assessment_id`
- `Assessment.id` -> `ConsultantNote.assessment_id`
- `Pillar.code` -> `ConsultantNote.pillar_code`
- `Assessment.id` -> `Assessment.parent_assessment_id`
- `MaturityPreset.id` -> `MaturityLevel.preset_id`
- `ReportTemplate.id` -> `ReportSection.report_template_id`
- `User.id` -> `Customer.account_manager_id`
- `User.id` -> `LlmProviderConfig.updated_by_id`

## Migracao dos CSVs

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

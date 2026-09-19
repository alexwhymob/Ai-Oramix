# Testes

## Estrategia Inicial

Os testes devem ser adicionados desde o inicio da migracao. Cada fase funcional deve ter validacao automatizada quando possivel e validacao manual documentada.

## Backend

Framework inicial:

- Vitest
- Supertest

Comandos previstos:

```bash
cd backend
npm install
npm test
```

Os testes de seguranca cobrem cookies, bloqueio progressivo, validacao de origem CSRF, rejeicao de campos sensiveis na entidade `User` e credenciais publicas com hash, expiracao e revogacao.

## Dependencias

Foi executado `npm audit` nos dois projetos e aplicadas as correcoes automaticas sem `--force`.

Riscos residuais a acompanhar:

- `image-size`, transitivo de `pptxgenjs`, com alertas de denial of service em parsers de formatos que a aplicacao nao aceita; os assets PPT sao agora limitados a PNG, JPEG, GIF e WebP, com validacao de assinatura, HTTPS, timeout e limite de 5 MB.
- `react-router` com alertas de redirecionamento/open redirect; as navegacoes que usam valores externos devem continuar a validar destinos e nao aceitar URLs protocol-relative.

Nao foi usado `npm audit fix --force`, pois a correcao sugerida para o `pptxgenjs` implica downgrade e quebra potencial da exportacao PPT.

Teste inicial:

- `GET /api/health` deve responder `200` com `{ "status": "ok", "service": "oramix-ai-backend" }`.
- Models Mongoose devem validar defaults, campos obrigatorios, limites e indices esperados sem ligar a base online.
- API generica de entidades deve validar entidades permitidas e parametros `q`, `limit`, `skip` e `sort_by`.
- Scripts de importacao devem testar parsing CSV e mapeamento de campos sem escrever na base online.
- Autenticacao deve testar hash de password e assinatura/verificacao JWT sem escrever na base online.
- Auditoria deve testar model `AuditLog` e protecao do endpoint de leitura.
- `quizSession` deve testar validacao de email corporativo, acao desconhecida e funcoes ainda nao migradas.
- `createDataSubAssessment` deve testar eventos sem ID, score alto, subavaliacoes existentes e parsing seguro de `pillar_scores`.
- `generateReport` deve testar schema estruturado, construcao de contexto e permissao por role sem chamar a API real da OpenAI.
- `sendReport` deve testar corpo de e-mail, permissoes por role e provider de e-mail sem chamar a API real do Resend.
- `integrations/llm` deve testar autenticacao, validacao de `prompt` e permissao por role sem chamar a API real da OpenAI.
- `forgot/reset password` deve testar criacao de token hash, expiracao e troca de password sem depender de MongoDB online.
- MFA deve testar criacao de desafio, validacao TOTP, consumo de codigo de recuperacao e rejeicao de desafios expirados.
- Web Push deve testar validacao e persistencia de subscricoes sem enviar notificacoes reais.
- O acesso a resultados deve ser testado sem cookie (esperado `403`), com token de troca valido uma vez e com renovacao restrita a utilizadores internos autorizados.
- A eliminacao em cascata deve exigir sessao admin, nome da empresa como confirmacao e justificacao valida antes de iniciar uma transacao MongoDB.

## Frontend

O frontend possui uma fachada de compatibilidade local em `frontend/src/api/base44Client.js`. Ela nao usa o SDK Base44 e encaminha as chamadas para o backend proprio.

Validacoes atuais:

- Build Vite deve concluir sem qualquer plugin ou SDK externo de plataforma.
- Chamadas `base44.entities.*` devem apontar para `/api/entities`.
- `base44.functions.invoke('generateReport')` deve apontar para `/api/functions/generateReport`.
- `base44.functions.invoke('sendReport')` deve apontar para `/api/functions/sendReport`.
- `base44.integrations.Core.InvokeLLM` deve apontar para `/api/integrations/llm`.
- A configuracao `Configuration > Users` deve permitir ativar MFA e subscrever notificacoes do browser.

## Validacao Manual Minima

Para cada tarefa:

- Confirmar que os ficheiros esperados foram criados ou alterados.
- Rodar testes relacionados quando as dependencias estiverem instaladas.
- Confirmar que o frontend nao mudou visualmente quando a tarefa nao envolver UI.
- Nunca rodar testes automatizados contra a base MongoDB de producao.
- Validar Web Push manualmente em HTTPS ou `localhost`, com permissao de notificacoes concedida no browser.
- Validar manualmente o fluxo completo de avaliacao: token de escrita, submissao, troca unica do token de resultados, consulta por cookie, expiracao/renovacao pelo account manager e bloqueio de links QR legados depois da data de corte.

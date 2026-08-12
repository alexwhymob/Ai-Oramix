# Auth

## Estado Atual

A autenticacao propria foi iniciada com JWT e passwords com hash bcrypt.

Fluxos implementados:

- Login por email/password.
- Registo basico por email/password.
- Consulta do utilizador autenticado.
- Logout com revogacao no backend e limpeza de cookies.
- Forgot password com envio de email.
- Reset password com token de uso unico.
- Convite de utilizadores por email.
- Invalidacao de sessoes atraves de versao de token no utilizador.
- Invalidacao de sessoes no logout, reset de password e alteracoes administrativas sensiveis.
- Access tokens curtos em cookies `HttpOnly`.
- Refresh tokens rotativos, armazenados apenas como hash no utilizador.
- Bloqueio progressivo por conta apos falhas consecutivas de login.
- Registo de suspeitas de brute force e reutilizacao de refresh token na auditoria.
- Desbloqueio administrativo de login com justificativa obrigatoria.
- MFA TOTP para contas `admin`, com codigos de recuperacao de uso unico.
- Alertas Web Push para administradores quando uma avaliacao e submetida.

Fora do escopo atual:

- Google login.

Fluxos ainda pendentes:

- Google login.
- Persistencia distribuida do controlo de tentativas para e-mails desconhecidos, caso sejam usadas varias replicas do backend.

## Backend

Endpoints:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/mfa/verify
GET  /api/auth/mfa/setup
POST /api/auth/mfa/confirm
POST /api/auth/mfa/disable
POST /api/users/invite
PUT  /api/users/:userId
POST /api/users/:userId/resend-invite
POST /api/users/:userId/unlock-login
GET  /api/users/ai-provider-config
PUT  /api/users/ai-provider-config
GET  /api/users/ai-provider-models?provider=openai
GET  /api/notifications/public-key
POST /api/notifications/subscribe
POST /api/notifications/unsubscribe
```

Variavel local obrigatoria:

```txt
JWT_SECRET
MFA_ISSUER
WEB_PUSH_VAPID_PUBLIC_KEY
WEB_PUSH_VAPID_PRIVATE_KEY
WEB_PUSH_SUBJECT
```

O valor deve existir apenas em ambiente local/servidor. Nunca versionar arquivos `.env*`.

Cookies de sessao:

- `oramix_access_token`: access token JWT, `HttpOnly`, validade de 15 minutos.
- `oramix_refresh_token`: refresh token JWT, `HttpOnly`, validade de 30 dias.
- O refresh token e rodado a cada renovacao; o anterior deixa de ser valido.
- Em producao, usar HTTPS e `AUTH_COOKIE_SECURE=true`.

## Roles

Roles suportadas:

- `admin`
- `ai_consultant`
- `account_manager`

## Frontend

O frontend usa `base44.auth.*` como fachada local de compatibilidade, sem SDK ou servico Base44:

- `base44.auth.loginViaEmailPassword(email, password)`
- `base44.auth.register({ email, password })`
- `base44.auth.me()`
- `base44.auth.logout(path)`
- `base44.auth.redirectToLogin(path)`

O frontend envia cookies automaticamente com `credentials: include`. Nao guarda access ou refresh tokens em `localStorage`.
Quando uma chamada autenticada recebe `401`, tenta uma renovacao unica em `/api/auth/refresh` e repete a chamada original.
No logout, o frontend chama `/api/auth/logout`; o backend revoga a sessao e limpa os cookies.

## Seguranca

O access JWT expira em 15 minutos e inclui uma versao de sessao. O refresh JWT expira em 30 dias e e rotativo.
A versao e incrementada para invalidar tokens existentes no logout, reset de password, desativacao e alteracoes administrativas sensiveis.

As passwords de registo, convite/reset e login devem ter entre 8 e 128 caracteres. Os e-mails sao validados e limitados a 254 caracteres.

Pontos a melhorar em fases futuras:

- O estado de contas existentes ja e persistido no MongoDB; o fallback temporario para e-mails desconhecidos deve ser movido para Redis ou MongoDB antes de usar varias replicas.
- Politica de password mais forte, se exigida pela politica da empresa.
- Testes ponta a ponta em ambiente local conectado ao Atlas.

## Hardening Atual

- O registo publico ignora qualquer `role` enviado pelo cliente e cria sempre `account_manager`.
- Roles privilegiadas devem ser criadas por convite admin ou script operacional.
- Rotas de auth e convite possuem rate limit em memoria.
- O backend remove `X-Powered-By` e adiciona headers basicos de seguranca.
- O rate limiter nao confia em `X-Forwarded-For` por defeito. `TRUST_PROXY=true` deve ser usado apenas quando o backend recebe trafego atraves de um reverse proxy controlado.
- `/api/auth/me` exige um access token valido atraves do middleware de autenticacao.
- `/api/auth/logout` e intencionalmente idempotente: aceita sessao ausente ou expirada para conseguir limpar cookies.
- A limpeza de cookies usa `Max-Age=0` e uma data de expiracao no passado para suportar browsers que mantenham cookies antigos.
- Tokens de reset sao armazenados apenas como hash, expiram em uma hora e sao invalidados apos uso.
- O logout invalida a versao de token no backend e remove os cookies no frontend.
- Apos cinco falhas consecutivas por conta, o bloqueio inicia em 30 segundos e aumenta progressivamente ate 15 minutos.
- Bloqueios e indicios de reutilizacao de refresh token geram eventos de auditoria de seguranca.
- Pedidos de escrita com cookies sao protegidos por validacao do header `Origin`; origens diferentes da `FRONTEND_URL` sao rejeitadas.
- O Admin pode desbloquear uma conta em `Configuration > Users`; a justificativa fica registada no evento `security.login_unlocked`.

## Configuracao de Cookies

Variaveis suportadas:

```txt
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_DOMAIN=
TRUST_PROXY=false
```

Em desenvolvimento local por HTTP, usar `AUTH_COOKIE_SECURE=false`, `AUTH_COOKIE_SAMESITE=lax` e `TRUST_PROXY=false`. Em producao, usar HTTPS e `AUTH_COOKIE_SECURE=true`. Se frontend e backend estiverem em sites diferentes, usar HTTPS, `AUTH_COOKIE_SAMESITE=none` e CORS com credenciais e origens explicitas.

## MFA e Web Push

O Admin pode ativar MFA em `Configuration > Users`. O segredo ou URI `otpauth` deve ser adicionado a uma aplicacao autenticadora e confirmado com um codigo de seis digitos.

Gerar as chaves VAPID uma vez no ambiente operacional:

```bash
npx web-push generate-vapid-keys
```

As chaves devem ser configuradas apenas no backend. O utilizador Admin ativa as notificacoes em `Configuration > Users`; o browser pede permissao e regista a subscricao no MongoDB. A notificacao e enviada quando uma avaliacao muda pela primeira vez para `completed`.

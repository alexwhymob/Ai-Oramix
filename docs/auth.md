# Auth

## Estado Atual

A autenticacao propria foi iniciada com JWT e passwords com hash bcrypt.

Fluxos implementados:

- Login por email/password.
- Registo basico por email/password.
- Consulta do utilizador autenticado.
- Logout client-side.
- Forgot password com envio de email.
- Reset password com token de uso unico.
- Convite de utilizadores por email.

Fora do escopo atual:

- Google login.
- OTP.

Fluxos ainda pendentes:

- Refresh tokens.

## Backend

Endpoints:

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/auth/logout
POST /api/users/invite
```

Variavel local obrigatoria:

```txt
JWT_SECRET
```

O valor deve existir apenas em ambiente local/servidor. Nunca versionar arquivos `.env*`.

## Roles

Roles suportadas:

- `admin`
- `ai_consultant`
- `account_manager`

## Frontend

O frontend usa `base44.auth.*` como adaptador local:

- `base44.auth.loginViaEmailPassword(email, password)`
- `base44.auth.register({ email, password })`
- `base44.auth.me()`
- `base44.auth.logout(path)`
- `base44.auth.redirectToLogin(path)`

O token fica em `localStorage` com a chave `oramix_access_token`.

## Seguranca

O JWT expira em 8 horas.

Pontos a melhorar em fases futuras:

- Cookies HTTP-only em vez de `localStorage`.
- Refresh token.
- Rate limit em login.
- Politica de password.
- Testes ponta a ponta em ambiente local conectado ao Atlas.

## Hardening Atual

- O registo publico ignora qualquer `role` enviado pelo cliente e cria sempre `account_manager`.
- Roles privilegiadas devem ser criadas por convite admin ou script operacional.
- Rotas de auth e convite possuem rate limit em memoria.
- O backend remove `X-Powered-By` e adiciona headers basicos de seguranca.

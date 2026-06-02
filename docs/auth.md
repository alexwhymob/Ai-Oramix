# Auth

## Estado Atual

A autenticacao propria foi iniciada com JWT e passwords com hash bcrypt.

Fluxos implementados:

- Login por email/password.
- Registo basico por email/password.
- Consulta do utilizador autenticado.
- Logout client-side.

Fluxos ainda nao migrados:

- Google login.
- OTP.
- Forgot password.
- Reset password.
- Convite de utilizadores por email.
- Refresh tokens.

## Backend

Endpoints:

```txt
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/logout
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
- Reset password com token de uso unico.
- Politica de password.
- Auditoria de eventos de login.

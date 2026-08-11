# Deploy

## Estrutura

O projeto passa a ter duas aplicacoes:

- `frontend/`: React/Vite.
- `backend/`: Node.js/Express.

## Frontend

Comandos previstos:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Variaveis usadas pelo frontend nesta fase:

```txt
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:3003
```

`VITE_API_BASE_URL` e opcional em desenvolvimento quando o proxy do Vite esta ativo. Em producao, deve apontar para a URL publica do backend.

O frontend aceita:

- `VITE_API_BASE_URL=https://api.exemplo.com`
- `VITE_API_BASE_URL=https://api.exemplo.com/api`

Se a URL nao terminar em `/api`, o cliente acrescenta esse sufixo automaticamente.

## Backend

Comandos previstos:

```bash
cd backend
npm install
npm run dev
npm start
```

Variaveis iniciais:

```txt
NODE_ENV=development
PORT=3003
FRONTEND_URL=http://localhost:5175
TRUST_PROXY=false
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_DOMAIN=
MONGODB_URI=
MONGODB_DIRECT_URI=
MONGODB_DB_NAME=
JWT_SECRET=
LLM_CONFIG_ENCRYPTION_KEY=
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.4
OPENAI_API_KEY=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=
```

## Observacoes

Arquivos `.env*` sao sempre locais e nao devem ser enviados para o repositorio. A lista acima serve apenas para documentar nomes de variaveis.

O backend ja possui autenticacao JWT e geracao de relatorio com provider LLM trocavel. Nesta fase:

- `LLM_PROVIDER=openai` e o provider suportado;
- `LLM_MODEL` permite trocar o modelo sem alterar codigo;
- `OPENAI_API_KEY` e obrigatoria quando `LLM_PROVIDER=openai`;
- Google e Anthropic ainda nao estao implementados;
- `EMAIL_PROVIDER=resend` e o provider de e-mail suportado nesta fase;
- `RESEND_API_KEY` e obrigatoria quando `EMAIL_PROVIDER=resend`;
- `EMAIL_FROM` define o remetente dos e-mails de relatorio.
- `LLM_CONFIG_ENCRYPTION_KEY` deve ser uma chave aleatoria com pelo menos 32 caracteres e nao deve ser alterada sem um plano de re-encriptacao das chaves LLM armazenadas.
- Antes do deploy, executar `npm audit` em `backend/` e `frontend/`; nao usar `--force` sem validar o impacto no exportador PPT e no router.
- `MONGODB_DIRECT_URI` e opcional e serve como fallback quando a URI SRV do Atlas falha por DNS/SRV no ambiente local.
- `AUTH_COOKIE_SECURE=false` e adequado apenas para desenvolvimento em `localhost`; em producao deve ser `true` com HTTPS.
- `AUTH_COOKIE_SAMESITE=lax` funciona quando frontend e API partilham o mesmo site. Para dominios diferentes, usar `none` com HTTPS e CORS configurado com credenciais.
- `FRONTEND_URL` deve ser uma origem exata e confiavel, pois tambem e usada na validacao anti-CSRF.

## Recomendacao de Deploy

Caminho mais simples para a fase atual:

1. Frontend em `Vercel` ou `Render Static Site`.
2. Backend em `Render Web Service`.
3. MongoDB Atlas como base de dados.

Se o deploy for num `VPS`, a recomendacao muda para:

1. Frontend buildado e servido por `Nginx`.
2. Backend Node/Express a correr localmente na VPS em `127.0.0.1:3003`.
3. `Nginx` a fazer reverse proxy de `/api` para o backend.
4. MongoDB Atlas mantido externo, como planeado.

O repositorio agora inclui:

- `render.yaml` para subir frontend + backend no Render.
- `frontend/vercel.json` para suportar rotas SPA na Vercel.
- `.nvmrc` com Node `22`.

## Deploy no Render

Passos sugeridos:

1. Ligar o repositorio ao Render como Blueprint.
2. Selecionar o ficheiro `render.yaml`.
3. Preencher os secrets pedidos no backend:

```txt
MONGODB_URI
MONGODB_DIRECT_URI
MONGODB_DB_NAME
JWT_SECRET
OPENAI_API_KEY
RESEND_API_KEY
EMAIL_FROM
```

4. Confirmar deploy do servico `aioramix-backend`.
5. Confirmar deploy do servico `aioramix-frontend`.

No blueprint atual:

- `FRONTEND_URL` no backend vem do `RENDER_EXTERNAL_URL` do frontend.
- `VITE_API_BASE_URL` no frontend vem do `RENDER_EXTERNAL_URL` do backend.
- o backend expoe health check em `/api/health`.

## Deploy do Frontend na Vercel

Se preferir separar o frontend:

1. Criar projeto na Vercel apontando para `frontend/`.
2. Definir:

```txt
VITE_API_BASE_URL=https://SEU-BACKEND/api
```

3. A Vercel usa `frontend/vercel.json` para reescrever rotas SPA para `index.html`.

## Deploy em VPS

O repositorio agora inclui exemplos para VPS:

- `deploy/nginx/oramix.conf.example`
- `deploy/systemd/oramix-backend.service.example`

Arquitetura recomendada:

- `https://app.seudominio.com` serve o frontend estatico
- `https://app.seudominio.com/api/*` faz proxy para `http://127.0.0.1:3003/api/*`
- o backend liga ao MongoDB Atlas via `MONGODB_URI` ou `MONGODB_DIRECT_URI`
- o Nginx aplica CSP, `X-Frame-Options` e `nosniff` ao frontend

Passos sugeridos:

1. Instalar `node`, `npm` e `nginx` na VPS.
2. Publicar o projeto em `/var/www/oramix/`.
3. No `frontend/`:

```bash
npm install
npm run build
```

4. No `backend/`:

```bash
npm install
npm start
```

5. Criar um ficheiro `.env` local no backend com variaveis de producao.
6. Registar o backend com `systemd` usando `deploy/systemd/oramix-backend.service.example`.
7. Configurar o `Nginx` com base em `deploy/nginx/oramix.conf.example`.
8. Ativar HTTPS com `certbot`.

Variaveis importantes em VPS:

```txt
NODE_ENV=production
PORT=3003
FRONTEND_URL=https://app.seudominio.com
TRUST_PROXY=true
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_DOMAIN=
MONGODB_URI=...
MONGODB_DIRECT_URI=...
MONGODB_DB_NAME=...
JWT_SECRET=...
LLM_CONFIG_ENCRYPTION_KEY=...
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.4-mini
OPENAI_API_KEY=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=...
```

Quando o frontend e servido pelo mesmo dominio e o Nginx encaminha `/api`, manter `AUTH_COOKIE_SAMESITE=lax`. Se forem usados dominios separados, configurar `AUTH_COOKIE_SAMESITE=none`, `AUTH_COOKIE_SECURE=true` e uma lista explicita de origens permitidas em `FRONTEND_URL`.

## Docker

O projeto tambem ficou preparado para correr em containers:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/docker/nginx.conf`
- `docker-compose.yml`

Portas definidas:

- backend: `3003`
- frontend: `5175`

Para subir com Docker Compose:

```bash
docker compose up --build -d
```

Comportamento:

- o `backend` le variaveis de `backend/.env`
- o `frontend` e buildado como estatico e servido por `nginx`
- o `frontend` faz proxy de `/api` para o container `backend:3003`
- o Compose local usa `NODE_ENV=development` e cookies sem `Secure`, porque a aplicacao e acessada por HTTP em `localhost`

URLs:

```txt
http://localhost:5175
http://localhost:3003/api/health
```

Em desenvolvimento local sem HTTPS, manter:

```txt
NODE_ENV=development
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
TRUST_PROXY=false
```

Essas definicoes sao apenas para `localhost`. Em producao com HTTPS, usar `NODE_ENV=production` e `AUTH_COOKIE_SECURE=true`.

## Escolha de Modelo OpenAI

Para este projeto, a melhor troca custo/qualidade neste momento e `gpt-5.4-mini`.

Motivo:

- continua orientado para trabalho profissional e geracao de texto estruturado;
- custa menos do que `gpt-5.4`;
- para relatorios, notas de gap, mitigacoes e resumo executivo deve aguentar bem a fase atual.

Segundo a pagina oficial de pricing da OpenAI no momento desta verificacao:

- `gpt-5.4`: `US$ 2.50 / 1M` tokens de entrada e `US$ 15.00 / 1M` tokens de saida
- `gpt-5.4 mini`: `US$ 0.75 / 1M` tokens de entrada e `US$ 4.50 / 1M` tokens de saida

Fonte:

- https://openai.com/api/pricing/

Se quiseres um primeiro corte de custo sem mexer no codigo, basta trocar no `.env`:

```txt
LLM_MODEL=gpt-5.4-mini
```

## O Que Muda por Sair do Render

Muda:

- `render.yaml` deixa de ser o caminho principal
- `FRONTEND_URL` deve apontar para o dominio final da tua VPS
- o processo do backend passa a ser gerido por `systemd` ou `pm2`
- o frontend passa a ser servido por `nginx`

Nao muda:

- MongoDB Atlas continua valido
- as variaveis do backend continuam praticamente as mesmas
- o frontend continua a falar com `/api`
- a configuracao de OpenAI e Resend continua igual

## Importacao de Dados

Com a base MongoDB configurada localmente:

```bash
cd backend
npm run import:all
```

Esse comando importa os CSVs exportados para a nossa MongoDB. Ele nao usa Base44.

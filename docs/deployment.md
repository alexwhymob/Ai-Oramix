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
HOST=0.0.0.0
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

Caminho escolhido para este lancamento: Docker numa VPS, com proxy reverso, frontend, backend, MongoDB e Redis em containers. Ver a secao [Deploy Docker numa VPS](#deploy-docker-numa-vps).

Alternativa gerida, caso seja preferida mais tarde:

1. Frontend em `Vercel` ou `Render Static Site`.
2. Backend em `Render Web Service`.
3. MongoDB Atlas como base de dados.

O repositorio agora inclui:

- `render.yaml` para subir frontend + backend no Render.
- `docker-compose.prod.yml` para Caddy, frontend, backend, MongoDB e Redis em producao numa VPS.
- `.env.production.example` como base para os segredos/configuracao do Compose de producao.
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

## Deploy Docker numa VPS

O caminho escolhido para producao em VPS e correr frontend, backend, MongoDB e Redis em containers. O ficheiro [docker-compose.prod.yml](../docker-compose.prod.yml) separa esta configuracao do Compose local de desenvolvimento.

Arquitetura:

- Caddy em container publica as portas 80 e 443 e encaminha pedidos ao frontend;
- frontend Nginx no container serve a aplicacao e encaminha `/api` ao backend;
- backend, MongoDB e Redis apenas na rede interna Docker, sem portas publicadas no host;
- OpenAI e Resend continuam servicos externos; o MongoDB usa o volume Docker `mongo_data`.

Preparacao inicial na VPS:

1. Instalar Docker Engine e o plugin Docker Compose.
2. Publicar o repositorio numa pasta de deploy, copiar `.env.production.example` para `.env.production` e restringir permissoes do ficheiro (`chmod 600 .env.production`).
3. Preencher segredos unicos para `JWT_SECRET`, `LLM_CONFIG_ENCRYPTION_KEY`, `REDIS_PASSWORD` e `MONGO_ROOT_PASSWORD`; pode gerar valores com `openssl rand -hex 32`. Usar passwords hexadecimais para evitar caracteres especiais nas URLs. Nunca reutilizar segredos de desenvolvimento.
4. Manter as mesmas chaves `JWT_SECRET` e `LLM_CONFIG_ENCRYPTION_KEY` entre deploys. A chave LLM tambem protege valores LLM e segredos MFA cifrados na base; trocar sem migracao pode tornar esses valores ilegiveis. Se a base ja tiver chaves LLM cifradas, localizar a chave usada no ambiente anterior ou migrar esses valores antes do primeiro arranque.
5. Configurar backups do volume MongoDB com restauro testado. Guardar `MONGO_ROOT_PASSWORD` fora do repositorio.
6. Ainda sem dominio, a configuracao Caddy serve HTTP na porta 80. Quando houver dominio, apontar o DNS para a VPS, trocar `FRONTEND_URL` para `https://<dominio>` e substituir `:80` no `deploy/caddy/Caddyfile` pelo dominio. Caddy obterá e renovará o certificado TLS automaticamente; manter as portas 80 e 443 acessiveis.

Antes do corte dos QR antigos, fazer backup do MongoDB e executar a migracao uma vez:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build backend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d mongo redis
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm --no-deps backend npm run migrate:remove-legacy-qr
```

A migracao remove permanentemente `Customer.qr_token` e o indice correspondente. O deploy seguinte aceita apenas as credenciais novas de 48 horas; emitir QR novos para os respondentes com avaliacoes em curso.

Arrancar ou atualizar os containers:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend frontend redis
```

O Caddy em container trata do proxy e do TLS depois de configurar dominio e DNS. Na fase sem dominio, a aplicacao fica acessivel por HTTP; nao usar credenciais reais de utilizador ate ativar HTTPS. Permitir no firewall SSH administrativo, HTTP e HTTPS; nao abrir `3003` nem `6379`. Com frontend e API no mesmo dominio, manter `AUTH_COOKIE_SAMESITE=lax`; a API configura cookies `Secure` em `NODE_ENV=production`.

Depois do primeiro arranque, criar a conta admin com um comando one-off: `docker compose --env-file .env.production -f docker-compose.prod.yml run --rm -it backend npm run create:admin -- --email admin@empresa.pt --name "Admin"`. O script pede a password sem a mostrar no terminal. Ativar MFA logo no primeiro login.

### Telemetria opcional

A telemetria de producao pode ser ligada sem alterar o proxy publico. Por defeito, `OTEL_ENABLED=false` e os servicos de traces nao arrancam. Para ativar metricas Prometheus, traces OpenTelemetry e a interface Jaeger, adicionar ao `.env.production`:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=oramix-ai-backend
OTEL_PROMETHEUS_PORT=9464
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
```

Subir a stack com o profile de telemetria:

```bash
docker compose --profile telemetry --env-file .env.production -f docker-compose.prod.yml up --build -d
```

O Jaeger fica disponivel apenas em `127.0.0.1:16686` na VPS. Para abrir a interface a partir do computador de administracao, criar um tunel SSH:

```bash
ssh -L 16686:127.0.0.1:16686 utilizador@IP_DA_VPS
```

Depois abrir `http://localhost:16686`. As metricas Prometheus continuam em `http://127.0.0.1:9464/metrics`. Para desligar traces, definir `OTEL_ENABLED=false`, recriar o backend e parar os servicos opcionais com `docker compose --profile telemetry -f docker-compose.prod.yml stop otel-collector jaeger clickhouse`.

Depois de configurar DNS e HTTPS, validar `/api/health` pelo dominio, login, MFA dos administradores, envio de e-mail, geracao de relatorio e o percurso completo de avaliacao e acesso a resultados. Usar um remetente Resend do dominio verificado. Manter uma instancia backend: o scheduler atual executa dentro do backend e nao coordena entre varias instancias.

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

- MongoDB pode correr no proprio Compose de producao; Atlas continua uma alternativa suportada no deploy gerido
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

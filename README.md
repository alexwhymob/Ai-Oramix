# Oramix Assessment Platform

Aplicacao web para avaliacoes de maturidade e prontidao para adocao de IA. O projeto e composto por um frontend React/Vite e um backend Node.js/Express com MongoDB Atlas.

## Requisitos

- Node.js 22
- npm
- MongoDB Atlas ou uma instancia MongoDB acessivel
- Docker Desktop, se for usar containers

## Estrutura

```txt
frontend/       Aplicacao React/Vite
backend/        API Express, autenticacao, modelos e servicos
docs/           Documentacao tecnica e operacional
deploy/         Exemplos de Nginx e systemd
docker-compose.yml
```

## Configuracao local

1. Instalar as dependencias:

```bash
cd backend
npm install
cd ../frontend
npm install
```

2. Criar `backend/.env` localmente. Os nomes principais sao:

```txt
NODE_ENV=development
PORT=3003
FRONTEND_URL=http://localhost:5175
TRUST_PROXY=false
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_DOMAIN=
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=AIORAMIX
JWT_SECRET=...
LLM_CONFIG_ENCRYPTION_KEY=...
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.4-mini
OPENAI_API_KEY=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=Oramix Assessment Platform <email@dominio.pt>
```

Nunca enviar ficheiros `.env*` para o repositorio. O ficheiro `backend/.env.example` e apenas uma referencia local e tambem deve permanecer ignorado pelo Git.

## Desenvolvimento

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Abrir `http://localhost:5175`. O Vite encaminha `/api` para `http://localhost:3003`.

## Docker

Com o Docker Desktop em execucao:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f
```

URLs locais:

- Frontend: `http://localhost:5175`
- Healthcheck: `http://localhost:3003/api/health`
- Métricas OpenTelemetry (apenas local): `http://localhost:9464/metrics`
- Traces OpenTelemetry / Jaeger (apenas local): `http://localhost:16686`

O Docker Compose executa localmente um OpenTelemetry Collector e Jaeger. Os traces são mantidos em memória pelo Jaeger e são apagados quando esse serviço é recriado. Para desligar a exportação de traces, remova `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` da configuração do serviço `backend`.

O Redis é usado apenas para rate limiting distribuído e não expõe porta no host nem persiste dados. Em produção, configure `REDIS_URL` com TLS/autenticação e mantenha `RATE_LIMIT_REQUIRE_REDIS=true` para evitar iniciar sem essa proteção.

Parar os containers:

```bash
docker compose down
```

## Testes e build

```bash
cd backend
npm test

cd ../frontend
npm run build
npm run typecheck
```

## Importacao de dados

Com a base configurada no `backend/.env`:

```bash
cd backend
npm run import:all
```

Os scripts fazem upsert na nossa base MongoDB. Nao importam dados para nenhuma plataforma externa.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [API](docs/api.md)
- [Autenticacao](docs/auth.md)
- [Base de dados](docs/database.md)
- [Deploy](docs/deployment.md)
- [Testes](docs/testing.md)
- [Auditoria](docs/audit.md)
- [Roadmap de seguranca e acesso publico](docs/security-roadmap.md)
- [Plano de migracao](docs/migration-plan.md)
- [Changelog](docs/changelog.md)

## Seguranca

Segredos, chaves de API, credenciais do Atlas e tokens JWT devem ser fornecidos por variaveis de ambiente. O backend aplica autenticacao JWT em cookies HttpOnly, refresh tokens rotativos, autorizacao por role, rate limiting, bloqueio progressivo contra brute force, headers de seguranca e registo de auditoria. O acesso publico a resultados usa uma credencial de troca unica, valida por 30 dias, que e convertida num cookie de leitura `HttpOnly`; consultar [Roadmap de seguranca e acesso publico](docs/security-roadmap.md) para o fluxo e a transicao dos QR links legados.

Antes de um deploy publico, validar whitelist de IP do Atlas, HTTPS, rotacao de segredos, politica de backups e logs sem dados sensiveis.

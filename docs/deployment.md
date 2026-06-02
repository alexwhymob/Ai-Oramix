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

Variaveis herdadas do Base44 ainda usadas nesta fase:

```txt
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:3000
```

`VITE_API_BASE_URL` e opcional em desenvolvimento quando o proxy do Vite esta ativo. Em producao, deve apontar para a URL publica do backend.

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
PORT=3000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=
MONGODB_DB_NAME=
JWT_SECRET=
```

## Observacoes

Arquivos `.env*` sao sempre locais e nao devem ser enviados para o repositorio. A lista acima serve apenas para documentar nomes de variaveis.

O backend ainda nao possui autenticacao JWT, servico LLM ou envio de e-mail. Essas configuracoes serao adicionadas nas proximas fases.

## Importacao de Dados

Com a base MongoDB configurada localmente:

```bash
cd backend
npm run import:all
```

Esse comando importa os CSVs exportados para a nossa MongoDB. Ele nao usa Base44.

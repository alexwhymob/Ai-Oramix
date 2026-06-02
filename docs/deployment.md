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

```env
VITE_BASE44_APP_ID=
VITE_BASE44_APP_BASE_URL=
VITE_BASE44_FUNCTIONS_VERSION=
```

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

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

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Observacoes

O backend ainda nao possui MongoDB, autenticacao JWT, servico LLM ou envio de e-mail. Essas configuracoes serao adicionadas nas proximas fases.

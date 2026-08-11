# Frontend - Oramix Assessment Platform

Frontend React/Vite da aplicacao Oramix Assessment Platform.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
```

O servidor de desenvolvimento usa a porta `5175`. Em desenvolvimento, as chamadas `/api` sao encaminhadas pelo Vite para `http://localhost:3003`.

## Configuracao

Opcionalmente, definir:

```txt
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:3003
```

Em producao, `VITE_API_BASE_URL` deve apontar para a URL publica da API. O cliente acrescenta `/api` quando necessario.

## Camada de API

As paginas usam uma fachada local em `src/api/base44Client.js` para preservar a compatibilidade dos nomes existentes durante a migracao. Essa fachada nao importa SDK Base44 e envia todas as chamadas para a API propria em `/api`.

Os clientes locais estao em:

- `src/api/apiClient.js`
- `src/api/authClient.js`
- `src/api/entitiesClient.js`
- `src/api/functionsClient.js`
- `src/api/integrationsClient.js`
- `src/api/usersClient.js`

O frontend nao depende de uma plataforma externa para autenticacao, dados, funcoes ou LLM.

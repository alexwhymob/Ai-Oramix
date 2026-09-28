# Roadmap de seguranca e acesso publico

Ultima atualizacao: 2026-09-18

## Objetivo

Impedir que um identificador previsivel ou um link antigo conceda acesso indevido a respostas, resultados ou subavaliacoes. O identificador `assessmentId` e apenas uma referencia de dados: nunca e uma credencial de acesso.

## Implementado

### 1. Protecao de endpoints publicos

- Registo publico de utilizadores internos bloqueado; a criacao de utilizadores internos e feita por convite.
- Rate limiting distribuido com Redis, sem porta exposta no host. O backend nao inicia em producao se `RATE_LIMIT_REQUIRE_REDIS=true` e Redis nao estiver disponivel.
- Headers de seguranca, validacao de origem para pedidos com cookies e auditoria das acoes sensiveis.
- `createDataSubAssessment` deixou de ser publico. A criacao automatica ocorre no servidor depois da submissao da avaliacao principal.

### 2. Credenciais da avaliacao

- A avaliacao em curso recebe um segredo aleatorio de alta entropia para carregar e submeter respostas.
- Apenas o hash SHA-256 desse segredo e guardado na base de dados.
- A submissao revoga a credencial de escrita. Pedidos posteriores com o mesmo token sao recusados.
- As subavaliacoes recebem uma credencial propria quando o respondente as inicia a partir de uma sessao de resultados valida.

### 3. Acesso aos resultados

- A submissao cria um novo token de troca de resultados, independente do token de escrita.
- O token e valido durante 30 dias e so pode ser trocado uma vez.
- A troca cria uma sessao de leitura em cookie `HttpOnly`, `SameSite` e, em producao, `Secure`.
- O token inicial e transportado no fragmento (`#access=...`) e removido do URL logo apos a troca, evitando envio em `Referer` e em logs de proxy.
- O cookie permite apenas consultar resultados e subavaliacoes relacionadas; nao permite alterar respostas.
- Admins e account managers responsaveis podem usar **New Results Link** no detalhe da avaliacao para revogar acessos anteriores e emitir um novo link de 30 dias.
- Criacao, troca e renovacao de acesso sao registadas em auditoria sem guardar segredos.

### 4. Eliminacao de clientes

- A eliminacao de cliente e exclusiva de admins e usa uma transacao MongoDB.
- O admin deve escrever o nome exato da empresa e informar uma justificacao de 10 a 500 caracteres.
- Sao removidos o cliente e os dados associados: avaliacoes principais e secundarias, respostas, relatorios e notas de consultor.
- Os registos de auditoria nao sao apagados. A entrada `customer.delete_cascade` guarda o autor, a justificacao e apenas as contagens dos dados removidos.

## Operacao

1. O respondente abre o link da avaliacao e responde ao questionario.
2. Ao submeter, o acesso de escrita e encerrado e a aplicacao apresenta o resultado atraves de uma nova credencial.
3. Se o resultado expirar ou o link ja tiver sido trocado, o respondente deve contactar o account manager.
4. O account manager abre o detalhe da avaliacao, seleciona **New Results Link**, copia o link mostrado uma unica vez e partilha-o pelo canal apropriado.
5. A emissao de um novo link invalida a sessao e qualquer link de resultados anterior.

## Transicao de QR links legados

O acesso por `Customer.qr_token` foi removido. Os QR novos usam um token de avaliacao com validade de 48 horas, guardado na base apenas como hash e transportado no fragmento `#access=...`; o frontend remove o fragmento do endereco antes de carregar a avaliacao. Os emails de inicio e lembrete usam o mesmo formato.

Links assinados de 48 horas emitidos por versoes recentes e ainda validos continuam aceites no formato anterior `/quiz/<token>` ate expirarem. O token permanente UUID baseado em `Customer.qr_token` e rejeitado.

O admin ou account manager responsavel pode gerar um QR novo na lista de clientes para qualquer avaliacao ainda nao concluida. A emissao substitui o hash anterior, revoga o QR/link anterior e funciona tambem para clientes antigos que ainda nao tinham avaliacao. A criacao de cliente pelo painel mostra o QR imediatamente.

Os QR legados deixam de funcionar no deploy desta alteracao. Antes do deploy, fazer backup e executar `npm run migrate:remove-legacy-qr` no container backend para apagar `Customer.qr_token` existentes e o respetivo indice. Os respondentes com avaliacao em curso devem receber o QR novo do account manager.

### Corte e comunicacao

- Coordenar o deploy com o envio de novos QR aos respondentes com avaliacoes em curso.
- O valor bruto do token so e apresentado no QR/link no momento da emissao; nao e escrito na base de dados nem nos logs HTTP porque fica no fragmento do URL.

## Itens pendentes priorizados

| Prioridade | Item | Estado |
| --- | --- | --- |
| Alta | Comunicar a substituicao dos QR legados e executar migracao apos backup | Pendente de janela de deploy |
| Alta | Teste manual completo: quiz, submissao, troca unica, renovacao e expiracao de resultados | Pendente |
| Media | Confirmar em producao HTTPS e `AUTH_COOKIE_SECURE=true` | Pendente de ambiente de producao |
| Media | Procedimento de rotacao de segredos, backup/restauro e revisao de acessos Atlas | Pendente operacional |
| Media | Testar periodicamente o restauro a partir de backup antes de usar eliminacao definitiva em producao | Pendente operacional |
| Media | Revisao periodica de dependencias (`npm audit --omit=dev`) | Recorrente |
| Baixa | SigNoz/OpenPanel e restantes ferramentas de analitica/observabilidade | Adiado por decisao de produto |

## Criterios de validacao

- `GET /api/health` responde `200` atraves do proxy frontend.
- `getResult` sem cookie de resultados responde `403`.
- `renewResultAccess` sem sessao de utilizador interno responde `401`.
- A suite de testes do backend e o build do frontend devem passar antes de deploy.
- Nenhum token bruto deve aparecer na base de dados, logs de aplicacao ou auditoria.

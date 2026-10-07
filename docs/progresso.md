# Progresso da implementação do PRD (NoCode Folio)

Última atualização: 2026-09-30. Branch: `plan` (commit `642ae99`, **sem push**).

## Status

- [x] Frontend do PRD implementado (build, typecheck e lint OK)
- [x] SQL do banco escrito em `database/schema.sql` (idempotente)
- [x] MCP do Supabase adicionado ao Claude Code (`claude mcp add --transport http supabase https://mcp.supabase.com/mcp`)
- [x] Autenticar o MCP
- [x] Aplicar `database/schema.sql` no projeto `nlpkjafpasxcyxttvphw` (migrations `schema_inicial_folio` + `grants_minimos`)
- [x] Verificar tabelas/RLS/trigger/bucket e rodar os security advisors (0 alertas; trigger e RLS testados em transação com rollback)
- [x] Regenerar `src/integrations/supabase/types.ts` (já batia com o banco; só mudou a versão do PostgREST)
- [x] Painel Supabase: Redirect URL `http://localhost:8080/auth` (Magic Link funcionando)
- [x] Testar login → onboarding no navegador (usuário criado, perfil `marcellopsilva999`, bloco inicial)
- [x] Tela de login lembra o último e-mail usado (localStorage)
- [x] Commit `642ae99` na branch `plan`
- [x] Login trocado para usuário + e-mail + senha (com confirmação de senha e "esqueci minha senha") em `src/routes/auth.tsx`; sem confirmação por e-mail e sem botão do Google
- [ ] Rodar `database/migracoes/2026-10-06-cadastro-usuario-senha.sql` no SQL Editor (o trigger passa a usar o nome de usuário como slug)
- [ ] Supabase → Authentication → Sign In / Providers → Email: desligar **Confirm email** (o cadastro entra direto)
- [ ] Supabase → Auth → URL Configuration: adicionar `http://localhost:8080/auth?tipo=recuperar` (ou `http://localhost:8080/**`) às Redirect URLs
- [ ] Testar o restante no navegador: editar grid (adicionar/arrastar/redimensionar/ocultar/excluir blocos), editar perfil, visão de visitante (aba anônima), inscrição na newsletter
- [ ] Push da branch `plan` e PR para `main` (não fazer force push: o projeto é sincronizado com o Lovable)
- [ ] Login com Google: criar o OAuth Client ID no Google Cloud (Aplicativo da Web; origem `http://localhost:8080`; redirect `https://nlpkjafpasxcyxttvphw.supabase.co/auth/v1/callback`) e colar o Client ID e o Client Secret em Supabase → Auth → Providers → Google
- [ ] (Opcional) Código OTP de 6 dígitos no e-mail como alternativa ao clique no link (editar o template no Supabase e adicionar o campo de código em `auth.tsx`)
- [ ] Produção: adicionar o domínio real nas Redirect URLs do Supabase (e no Google, se estiver ativo)

## Próximo passo (para o Claude)

> Já estão aplicados e commitados: banco, frontend e login por Magic Link. Próximos passos: terminar o teste do grid e da visão de visitante, fazer o push e abrir um PR para `main`. O Google fica para quando o usuário criar o Client ID.

## Notas

- Depois de sair (logout), o Magic Link pede o link no e-mail de novo: isso é esperado (não há senha). Se o usuário não sair, a sessão continua salva.
- A identidade do git foi configurada **só neste repositório** como `Eduardo-Marcello <Eduardo-Marcello@users.noreply.github.com>`.
- `.cursor/settings.json` fica fora dos commits (é configuração pessoal do editor).

## Contexto importante

- Stack real: **TanStack Start** (React + Vite) vindo do Lovable, com React Query, shadcn/ui, Tailwind v4 e dnd-kit.
- Env: `.env.local` tem `VITE_SUPABASE_URL` (corrigido: a URL tinha `/rest/v1/` no final, agora é só a base) e `VITE_SUPABASE_ANON_KEY`. O `.env` antigo aponta para o Lovable Cloud (não é usado; pode apagar).
- O client (`src/integrations/supabase/client.ts`) lê `VITE_SUPABASE_ANON_KEY` primeiro e usa fluxo **PKCE**.
- Regras do projeto: `.cursor/rules/security.mdc` (zero trust, nada de service role no front, RLS sempre).

## Banco (`database/schema.sql`)

- Tabelas `perfis`, `blocos`, `leads`: PK int8 identity, nomes em PT-BR, CHECKs (slug, colunas 1–4, linhas 1–2, tipo).
- Tipos de bloco: `link`, `imagem`, `texto`, `video`, `mapa` e **`newsletter`** (extra, alimenta `leads`).
- Trigger `ao_criar_usuario` → `criar_perfil_novo_usuario()` cria o perfil com um slug sugerido a partir do e-mail.
- RPC `reordenar_blocos(p_perfil_id, p_ids)`: security invoker, então a RLS continua valendo.
- RLS:
  - `perfis`: leitura pública; insert/update só o dono.
  - `blocos`: leitura pública só dos visíveis (o dono vê os rascunhos); escrita só o dono.
  - `leads`: insert público só se o perfil tem bloco newsletter visível; leitura/exclusão só o dono.
- `revoke all` antes dos grants: o Supabase dá ALL (incluindo TRUNCATE, que ignora RLS) a anon/authenticated em tabelas novas.
- Grants por coluna impedem alterar `id`, `usuario_id`, `perfil_id` e `created_at`.
- Storage: bucket público `folio` (5 MB; png/jpg/webp/gif, sem SVG). Upload só em `<uid>/...`.

## Frontend

| Arquivo | O quê |
|---|---|
| `src/lib/folio-types.ts` | Tipos, schemas zod do JSONB por tipo de bloco, `urlSegura` (só http/https), slug |
| `src/lib/folio-api.ts` | Hooks React Query, mutações, optimistic update ao reordenar/excluir, upload, `urlPublica` |
| `src/components/folio/folio-grid.tsx` | Grid 1/2/4 colunas, botão "Editar Grid", dnd-kit, setas, ocultar/excluir |
| `src/components/folio/bloco-view.tsx` | Renderização de cada tipo (valida o JSONB antes de usar) |
| `src/components/folio/bloco-dialog.tsx` | Modal de adicionar/editar (lazy); busca endereço via Nominatim |
| `src/components/folio/perfil-header.tsx` / `perfil-dialog.tsx` | Header público e edição do perfil (foto, nome, bio, slug, redes) |
| `src/routes/$slug.tsx` | Perfil público |
| `src/routes/auth.tsx` | Magic Link + Google; depois do login vai para `/onboarding` ou `/:slug` |
| `src/routes/_authenticated/onboarding.tsx` | Escolha de slug/nome, cria o bloco inicial e marca `user_metadata.onboarding_concluido` |

- Removidos: `src/routes/$username.tsx`, `src/routes/reset-password.tsx`, `src/lib/profile-data.ts` (login por senha saiu; o PRD pede só Magic Link/Google).
- Redes sociais ficam em `perfis.configuracao_tema.redes_sociais`.
- Dark mode forçado (`<html class="dark">`), cards com `bg-slate-900/40 backdrop-blur-md border-slate-800 rounded-3xl hover:border-violet-500/50`, variante de botão `gradient`.

## Comandos úteis (bun não está no PATH)

- Instalar: `npx -y bun install`
- Dev: `node node_modules/vite/bin/vite.js dev`
- Build: `node node_modules/vite/bin/vite.js build`
- Typecheck: `node node_modules/typescript/bin/tsc --noEmit -p .`

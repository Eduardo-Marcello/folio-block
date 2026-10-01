# Progresso da implementação do PRD (NoCode Folio)

Última atualização: 2026-09-30. Branch: `plan` (nada commitado ainda).

## Status

- [x] Frontend do PRD implementado (build, typecheck e lint OK)
- [x] SQL do banco escrito em `database/schema.sql` (idempotente)
- [x] MCP do Supabase adicionado ao Claude Code (`claude mcp add --transport http supabase https://mcp.supabase.com/mcp`)
- [x] Autenticar o MCP
- [x] Aplicar `database/schema.sql` no projeto `nlpkjafpasxcyxttvphw` (migrations `schema_inicial_folio` + `grants_minimos`)
- [x] Verificar tabelas/RLS/trigger/bucket e rodar os security advisors (0 alertas; trigger e RLS testados em transação com rollback)
- [x] Regenerar `src/integrations/supabase/types.ts` (já batia com o banco; só mudou a versão do PostgREST)
- [ ] Painel Supabase: adicionar `http://localhost:8080/auth` (porta do dev) em Auth → URL Configuration → Redirect URLs
- [ ] Painel Supabase: habilitar o provider Google (hoje desligado; Magic Link já funciona)
- [ ] Testar fluxo completo no navegador: login → onboarding → editar grid → visitante
- [ ] Commit (não fazer force push: o projeto é sincronizado com o Lovable)

## Próximo passo (para o Claude)

> Banco aplicado e verificado. Faltam os ajustes no painel do Supabase (feitos pelo usuário), o teste no navegador e o commit.

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

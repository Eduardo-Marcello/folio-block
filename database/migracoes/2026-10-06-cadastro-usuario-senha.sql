-- 2026-10-06: cadastro com nome de usuário + senha.
-- O trigger passa a usar raw_user_meta_data->>'username' como slug do perfil.
-- Rode no SQL Editor do Supabase (idempotente).

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservados constant text[] := array['auth', 'onboarding', 'api', 'admin', 'login', 'logout', 'assets', 'static', 'editar'];
  desejado   text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  base_slug  text;
  slug_final text;
begin
  -- Cadastro com senha: usa o nome de usuário escolhido como endereço, se for válido e estiver livre.
  if desejado ~ '^[a-z0-9][a-z0-9_-]{2,29}$'
     and desejado <> all (reservados)
     and not exists (select 1 from public.perfis where slug = desejado) then
    insert into public.perfis (usuario_id, slug, nome_completo, avatar_url)
    values (
      new.id,
      desejado,
      left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
      new.raw_user_meta_data ->> 'avatar_url'
    );
    return new;
  end if;

  -- Sem nome de usuário (Google, link mágico): sugere um endereço a partir do e-mail.
  base_slug := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '^[_-]+', '');
  if char_length(base_slug) < 3 then
    base_slug := 'folio' || base_slug;
  end if;
  base_slug := left(base_slug, 24);
  slug_final := base_slug;

  while exists (select 1 from public.perfis where slug = slug_final)
     or slug_final = any (reservados) loop
    slug_final := base_slug || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.perfis (usuario_id, slug, nome_completo, avatar_url)
  values (
    new.id,
    slug_final,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
